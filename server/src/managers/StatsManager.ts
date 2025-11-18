import ClassStats, { IClassStats } from "../models/ClassStats";
import ServerProfile, { IPlayerPrimaryStats, IPlayerComputedStats } from "../models/ServerProfile";

/**
 * StatsManager - Service de calcul et gestion des stats
 * 
 * Responsabilités :
 * - Calculer les stats primaires d'un joueur (classe + level)
 * - Calculer les stats secondaires (formules)
 * - Recalculer les stats après level up
 * - Gérer les bonus d'équipement (Phase 2)
 */
export class StatsManager {
  
  /**
   * Calcule les stats primaires d'un joueur selon sa classe et son level
   * Formula: baseStat + (statPerLevel × (level - 1))
   */
  static async calculatePrimaryStats(
    className: string,
    level: number
  ): Promise<IPlayerPrimaryStats> {
    // Charger les stats de la classe depuis MongoDB
    const classStats = await ClassStats.findOne({ class: className });
    
    if (!classStats) {
      throw new Error(`Class ${className} not found in ClassStats`);
    }
    
    // Calculer les stats primaires
    const levelMultiplier = level - 1;
    
    const primaryStats: IPlayerPrimaryStats = {
      strength: classStats.baseStats.strength + (classStats.statsPerLevel.strength * levelMultiplier),
      agility: classStats.baseStats.agility + (classStats.statsPerLevel.agility * levelMultiplier),
      intelligence: classStats.baseStats.intelligence + (classStats.statsPerLevel.intelligence * levelMultiplier),
      endurance: classStats.baseStats.endurance + (classStats.statsPerLevel.endurance * levelMultiplier),
      spirit: classStats.baseStats.spirit + (classStats.statsPerLevel.spirit * levelMultiplier)
    };
    
    return primaryStats;
  }
  
  /**
   * Calcule les stats secondaires à partir des stats primaires
   * 
   * @param primaryStats - Stats primaires du joueur
   * @param resourceType - Type de ressource de la classe
   * @param baseMoveSpeed - Vitesse de base de la classe
   * @param equipmentBonus - Bonus d'équipement (Phase 2)
   */
  static calculateComputedStats(
    primaryStats: IPlayerPrimaryStats,
    resourceType: "mana" | "rage" | "energy",
    baseMoveSpeed: number,
    equipmentBonus: Partial<IPlayerComputedStats> = {}
  ): IPlayerComputedStats {
    const { strength, agility, intelligence, endurance, spirit } = primaryStats;
    
    // ========================================
    // === HP ===
    // ========================================
    // Formula: 100 (base) + (END × 5)
    const maxHp = 100 + (endurance * 5);
    
    // ========================================
    // === RESSOURCE ===
    // ========================================
    let maxResource = 0;
    let resourceRegen = 0;
    
    if (resourceType === "mana") {
      // Formula: 100 (base) + (INT × 5)
      maxResource = 100 + (intelligence * 5);
      // Regen: 5 (base) + (SPI × 2)
      resourceRegen = 5 + (spirit * 2);
    } else if (resourceType === "rage") {
      // Rage: Max fixe à 100, pas de regen (génère en combat)
      maxResource = 100;
      resourceRegen = 0;
    } else if (resourceType === "energy") {
      // Energy: Max fixe à 100, regen fixe
      maxResource = 100;
      resourceRegen = 10; // 10 energy/sec
    }
    
    // ========================================
    // === ATTACK POWER ===
    // ========================================
    // Formula: 10 (base) + (STR × 2)
    const attackPower = 10 + (strength * 2);
    
    // ========================================
    // === SPELL POWER ===
    // ========================================
    // Formula: 10 (base) + (INT × 2)
    const spellPower = 10 + (intelligence * 2);
    
    // ========================================
    // === ATTACK SPEED ===
    // ========================================
    // Formula: 2.5 (base) - (AGI × 0.02) [min 0.8s]
    const attackSpeed = Math.max(0.8, 2.5 - (agility * 0.02));
    
    // ========================================
    // === CRITICAL CHANCE ===
    // ========================================
    // Base: 0%
    // Bonus: équipement uniquement (pas de bonus AGI)
    const criticalChance = equipmentBonus.criticalChance || 0;
    
    // ========================================
    // === CRITICAL DAMAGE ===
    // ========================================
    // Fixe à 150%
    const criticalDamage = 150;
    
    // ========================================
    // === EVASION ===
    // ========================================
    // Formula: 0 (base) + (AGI × 0.5%) + équipement
    const evasionFromAgility = agility * 0.5;
    const evasionFromEquipment = equipmentBonus.evasion || 0;
    const evasion = evasionFromAgility + evasionFromEquipment;
    
    // ========================================
    // === DAMAGE REDUCTION ===
    // ========================================
    // Formula: (END × 0.5%) + Armor% [max 75%]
    const drFromEndurance = endurance * 0.5;
    const armor = equipmentBonus.armor || 0;
    const drFromArmor = this.calculateArmorReduction(armor);
    const damageReduction = Math.min(75, drFromEndurance + drFromArmor);
    
    // ========================================
    // === MOVE SPEED ===
    // ========================================
    // Formula: baseMoveSpeed + équipement
    const moveSpeedBonus = equipmentBonus.moveSpeed || 0;
    const moveSpeed = baseMoveSpeed + moveSpeedBonus;
    
    // ========================================
    // === STATS AVANCÉES (équipement - Phase 2) ===
    // ========================================
    const magicResistance = equipmentBonus.magicResistance || 0;
    const precision = equipmentBonus.precision || 0;
    const penetration = equipmentBonus.penetration || 0;
    const tenacity = equipmentBonus.tenacity || 0;
    const lifesteal = equipmentBonus.lifesteal || 0;
    const spellPenetration = equipmentBonus.spellPenetration || 0;
    
    // ========================================
    // === RETOUR ===
    // ========================================
    return {
      // Vie
      hp: maxHp,              // Full HP au départ
      maxHp,
      
      // Ressource
      resource: maxResource,  // Full ressource au départ
      maxResource,
      resourceRegen,
      
      // Combat de base
      attackPower,
      spellPower,
      attackSpeed,
      
      // Critique
      criticalChance,
      criticalDamage,
      
      // Défense
      damageReduction,
      
      // Mobilité
      moveSpeed,
      
      // Stats avancées
      armor,
      magicResistance,
      precision,
      evasion,
      penetration,
      tenacity,
      lifesteal,
      spellPenetration
    };
  }
  
  /**
   * Calcule la réduction de dégâts de l'armure (diminishing returns)
   * Formula: (armor / (armor + 400)) × 100
   * 
   * Exemples:
   * - 100 armor = 20% reduction
   * - 400 armor = 50% reduction
   * - 800 armor = 66.7% reduction
   * - 1200 armor = 75% reduction
   */
  static calculateArmorReduction(armor: number): number {
    if (armor <= 0) return 0;
    return (armor / (armor + 400)) * 100;
  }
  
  /**
   * Recalcule et met à jour les stats d'un joueur dans MongoDB
   */
  static async updatePlayerStats(profileId: string): Promise<void> {
    const profile = await ServerProfile.findById(profileId);
    
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }
    
    // Charger les stats de la classe
    const classStats = await ClassStats.findOne({ class: profile.class });
    
    if (!classStats) {
      throw new Error(`Class ${profile.class} not found in ClassStats`);
    }
    
    // Calculer les stats primaires
    const primaryStats = await this.calculatePrimaryStats(profile.class, profile.level);
    
    // Calculer les stats secondaires
    // TODO Phase 2: Charger les bonus d'équipement depuis l'inventaire
    const equipmentBonus: Partial<IPlayerComputedStats> = {};
    
    const computedStats = this.calculateComputedStats(
      primaryStats,
      classStats.resourceType,
      classStats.baseMoveSpeed,
      equipmentBonus
    );
    
    // Mettre à jour le profil
    profile.primaryStats = primaryStats;
    profile.computedStats = computedStats;
    profile.statsLastCalculated = new Date();
    
    await profile.save();
    
    console.log(`✅ [StatsManager] Stats recalculées pour ${profile.characterName} (Lv${profile.level})`);
  }
  
  /**
   * Gère le level up d'un joueur
   * - Recalcule les stats
   * - Restaure HP et ressource à 100%
   */
  static async onLevelUp(profileId: string, newLevel: number): Promise<void> {
    const profile = await ServerProfile.findById(profileId);
    
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }
    
    console.log(`🎉 [StatsManager] ${profile.characterName} Level Up: ${profile.level} → ${newLevel}`);
    
    // Mettre à jour le level
    profile.level = newLevel;
    
    // Recalculer les stats
    await this.updatePlayerStats(profileId);
    
    // Recharger le profil après recalcul
    const updatedProfile = await ServerProfile.findById(profileId);
    
    if (!updatedProfile) {
      throw new Error(`Profile ${profileId} not found after update`);
    }
    
    // Restaurer HP et ressource à 100%
    updatedProfile.computedStats.hp = updatedProfile.computedStats.maxHp;
    updatedProfile.computedStats.resource = updatedProfile.computedStats.maxResource;
    
    await updatedProfile.save();
    
    console.log(`✅ [StatsManager] Level Up terminé - HP: ${updatedProfile.computedStats.maxHp}, Ressource: ${updatedProfile.computedStats.maxResource}`);
  }
  
  /**
   * Récupère les stats d'une classe
   */
  static async getClassStats(className: string): Promise<IClassStats | null> {
    return await ClassStats.findOne({ class: className });
  }
  
  /**
   * Récupère toutes les classes disponibles
   */
  static async getAllClasses(): Promise<IClassStats[]> {
    return await ClassStats.find({ isActive: true });
  }
  
  /**
   * Initialise les stats d'un nouveau personnage (Level 1)
   */
  static async initializeNewCharacter(profileId: string): Promise<void> {
    const profile = await ServerProfile.findById(profileId);
    
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }
    
    // Calculer les stats initiales (Level 1)
    await this.updatePlayerStats(profileId);
    
    console.log(`✅ [StatsManager] Stats initiales créées pour ${profile.characterName}`);
  }
}
