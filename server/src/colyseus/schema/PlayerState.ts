import { Schema, type } from "@colyseus/schema";

/**
 * État d'un joueur connecté (visible par tous dans le serveur)
 * Représente la PRÉSENCE en ligne + stats de combat synchronisées
 */
export class PlayerState extends Schema {
  // ===== IDENTIFICATION =====
  @type("string") sessionId: string = "";       // ID de session Colyseus
  @type("string") playerId: string = "";        // MongoDB Player._id
  @type("string") profileId: string = "";       // MongoDB ServerProfile._id
  @type("number") characterSlot: number = 1;    // Slot du personnage (1-5)
  
  // ===== INFORMATIONS DU PERSONNAGE =====
  @type("string") characterName: string = "";
  @type("number") level: number = 1;
  @type("string") class: string = "";           // "warrior", "mage", etc.
  @type("string") race: string = "";            // "human_elion", etc.
  
  // ===== ÉTAT DE CONNEXION =====
  @type("number") connectedAt: number = 0;      // Timestamp de connexion
  @type("number") lastActivity: number = 0;     // Dernier heartbeat
  
  // ===== VIE =====
  @type("number") hp: number = 100;             // HP actuel
  @type("number") maxHp: number = 100;          // HP maximum
  
  // ===== RESSOURCE =====
  @type("number") resource: number = 100;       // Ressource actuelle (mana/rage/energy)
  @type("number") maxResource: number = 100;    // Ressource maximum
  
  // === Régénération (3 stats séparées) ===
  @type("number") manaRegen: number = 0;        // Régénération mana (5 + SPI × 2)
  @type("number") rageRegen: number = 0;        // Régénération rage (toujours 0)
  @type("number") energyRegen: number = 0;      // Régénération energy (fixe 10/sec)
  
  // ===== COMBAT DE BASE =====
  @type("number") attackPower: number = 10;     // Dégâts physiques (AP)
  @type("number") spellPower: number = 10;      // Dégâts magiques (SP)
  @type("number") attackSpeed: number = 2.5;    // Vitesse d'attaque (secondes)
  
  // ===== CRITIQUE =====
  @type("number") criticalChance: number = 0;   // Chance de critique (%)
  @type("number") criticalDamage: number = 150; // Multiplicateur de critique (fixe)
  
  // ===== DÉFENSE =====
  @type("number") damageReduction: number = 0;  // Réduction des dégâts totale (%)
  
  // ===== MOBILITÉ =====
  @type("number") moveSpeed: number = 5.0;      // Vitesse de déplacement (m/s)
  
  // ===== STATS AVANCÉES =====
  @type("number") armor: number = 0;            // Armure
  @type("number") magicResistance: number = 0;  // Résistance magique
  @type("number") precision: number = 0;        // Réduit chance de Miss
  @type("number") evasion: number = 0;          // Chance d'esquive
  @type("number") penetration: number = 0;      // Pénétration d'armure
  @type("number") tenacity: number = 0;         // Réduit dégâts critiques subis
  @type("number") lifesteal: number = 0;        // Vol de vie
  @type("number") spellPenetration: number = 0; // Pénétration magique
  
  // ===== COMBAT =====
  @type("boolean") inCombat: boolean = false;
  @type("string") targetMonsterId: string = "";
  @type("number") attackTimer: number = 0;
  
  // ===== MOUVEMENT =====
  @type("number") posX: number = 0;
  @type("number") posY: number = 0;
  @type("number") posZ: number = 0;
  @type("number") lastMovementTime: number = 0;

  // ===== AFK REFERENCE POSITION =====
  @type("number") afkRefX: number = 0;
  @type("number") afkRefY: number = 0;
  @type("number") afkRefZ: number = 0;
    
  // ===== AFK =====
  @type("boolean") isAFK: boolean = false;
  @type("boolean") isDead: boolean = false;
  @type("number") deathTimer: number = 0;
  
  // ===== AFK / Combat auto =====
  @type("number") lastAFKCombatCheck: number = 0;  // anti-spam check AFK
  
  // ===== CONSOMMABLES (temporaire - placeholder) =====
  @type("number") potionHP: number = 10;  // Nombre de potions HP
  @type("number") food: number = 20;      // Nombre de nourriture
  
  constructor(
    sessionId: string,
    playerId: string,
    profileId: string,
    characterSlot: number,
    characterName: string,
    level: number,
    characterClass: string,
    characterRace: string
  ) {
    super();
    this.sessionId = sessionId;
    this.playerId = playerId;
    this.profileId = profileId;
    this.characterSlot = characterSlot;
    this.characterName = characterName;
    this.level = level;
    this.class = characterClass;
    this.race = characterRace;
    this.connectedAt = Date.now();
    this.lastActivity = Date.now();
    this.lastMovementTime = Date.now();
  }
  
  /**
   * Charge les stats depuis ServerProfile
   */
  loadStatsFromProfile(computedStats: any): void {
    // Vie
    this.hp = computedStats.hp;
    this.maxHp = computedStats.maxHp;
    
    // Ressource
    this.resource = computedStats.resource;
    this.maxResource = computedStats.maxResource;
    
    // Régénération (3 stats séparées)
    this.manaRegen = computedStats.manaRegen;
    this.rageRegen = computedStats.rageRegen;
    this.energyRegen = computedStats.energyRegen;
    
    // Combat de base
    this.attackPower = computedStats.attackPower;
    this.spellPower = computedStats.spellPower;
    this.attackSpeed = computedStats.attackSpeed;
    
    // Critique
    this.criticalChance = computedStats.criticalChance;
    this.criticalDamage = computedStats.criticalDamage;
    
    // Défense
    this.damageReduction = computedStats.damageReduction;
    
    // Mobilité
    this.moveSpeed = computedStats.moveSpeed;
    
    // Stats avancées
    this.armor = computedStats.armor;
    this.magicResistance = computedStats.magicResistance;
    this.precision = computedStats.precision;
    this.evasion = computedStats.evasion;
    this.penetration = computedStats.penetration;
    this.tenacity = computedStats.tenacity;
    this.lifesteal = computedStats.lifesteal;
    this.spellPenetration = computedStats.spellPenetration;
  }
}
