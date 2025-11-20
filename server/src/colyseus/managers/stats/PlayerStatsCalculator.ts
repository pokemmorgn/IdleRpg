import { IClassStats } from "../../../../models/ClassStats";
import { PlayerState } from "../../../schema/PlayerState";

/**
 * PlayerStatsCalculator
 * ----------------------
 * Calcule toutes les stats finales du joueur à partir :
 * - de sa classe (ClassStats)
 * - de son niveau
 * - de ses stats primaires (STR, AGI, INT, END, SPI)
 * 
 * ⚠️ IMPORTANT :
 * Pas encore de buffs, pas encore d'équipement.
 * Le système est entièrement future-proof pour ajouter ces sources plus tard.
 */

export class PlayerStatsCalculator {

  /**
   * Calcule les stats finales du joueur.
   * Appelé lors du login, changement de classe, level-up, etc.
   */
  static compute(player: PlayerState, classStats: IClassStats) {

    const level = player.level;

    // ============================
    // 1) STATS PRIMAIRES
    // ============================
    const STR = classStats.baseStats.strength + classStats.statsPerLevel.strength * (level - 1);
    const AGI = classStats.baseStats.agility + classStats.statsPerLevel.agility * (level - 1);
    const INT = classStats.baseStats.intelligence + classStats.statsPerLevel.intelligence * (level - 1);
    const END = classStats.baseStats.endurance + classStats.statsPerLevel.endurance * (level - 1);
    const SPI = classStats.baseStats.spirit + classStats.statsPerLevel.spirit * (level - 1);

    // ============================
    // 2) COMBAT DE BASE
    // ============================

    // Attack Power (physique)
    const attackPower = STR * 2;

    // Spell Power (magique)
    const spellPower = INT * 2;

    // HP
    const maxHp = 100 + END * 5;

    // Damage Reduction
    const damageReduction = END * 0.5; // en %

    // ============================
    // 3) RESSOURCE (mana / rage / energy)
    // ============================

    let maxResource = 0;
    let manaRegen = 0;
    let rageRegen = 0;
    let energyRegen = 0;

    if (classStats.resourceType === "mana") {
      maxResource = 100 + INT * 5;
      manaRegen = SPI * 2;        // regen mana
      rageRegen = 0;
      energyRegen = 0;
    }
    else if (classStats.resourceType === "rage") {
      maxResource = 100;
      manaRegen = 0;
      rageRegen = 0;              // la rage s'obtient via les attaques (on fera ça dans combat)
      energyRegen = 0;
    }
    else if (classStats.resourceType === "energy") {
      maxResource = 100;
      manaRegen = 0;
      rageRegen = 0;
      energyRegen = 10;          // energy régénérée automatiquement
    }

    // ============================
    // 4) MOBILITÉ
    // ============================

    const moveSpeed = classStats.baseMoveSpeed;

    // ============================
    // 5) ATTACK SPEED (Weapon speed avec réduction AGI)
    // ============================
    const weaponSpeedBase = player.attackSpeed || 2.5; // fallback si jamais
    const finalAttackSpeed = Math.max(
      0.3,                           // hard cap
      weaponSpeedBase - AGI * 0.02   // réduction agilité
    );

    // ============================
    // 6) CRITIQUE & ÉVASION
    // ============================
    const criticalChance = AGI * 0.1;     // %
    const criticalDamage = 150;           // valeur fixe par défaut
    const evasion = AGI * 0.5;            // %

    // ============================
    // 7) DEFENSE (Armor & Resist)
    // ============================
    const armor = END * 1;            // simple pour l'instant
    const magicResistance = INT * 0.2;

    // ============================
    // 8) STATS DÉRIVÉES
    // ============================
    const precision = 0;              // sera modifié par stuff/talents plus tard
    const penetration = 0;
    const tenacity = 0;
    const lifesteal = 0;
    const spellPenetration = 0;

    // ============================
    // 9) CONSTRUCTION DU PACKAGE FINAL
    // ============================
    return {
      // Vie
      hp: maxHp,
      maxHp,

      // Ressources
      resource: maxResource,
      maxResource,
      manaRegen,
      rageRegen,
      energyRegen,

      // Combat
      attackPower,
      spellPower,
      attackSpeed: finalAttackSpeed,

      // Critique
      criticalChance,
      criticalDamage,

      // Défense
      damageReduction,
      armor,
      magicResistance,

      // Mobilité
      moveSpeed,

      // Avancées
      precision,
      evasion,
      penetration,
      tenacity,
      lifesteal,
      spellPenetration
    };
  }
}
