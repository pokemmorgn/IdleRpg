import { IClassStats } from "../../../models/ClassStats";
import { PlayerState } from "../schema/PlayerState";

/**
 * PlayerStatsCalculator
 * ----------------------
 * Calcule les stats finales du joueur à partir :
 * - de sa classe (ClassStats)
 * - de son niveau
 * - de ses stats primaires (STR, AGI, INT, END, SPI)
 * 
 * ⚠️ IMPORTANT :
 * Pas encore de buffs, pas encore d'équipement.
 * Le système est future-proof.
 */
export class PlayerStatsCalculator {

  /**
   * Calcule les stats finales du joueur.
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
    const attackPower = STR * 2;
    const spellPower = INT * 2;

    const maxHp = 100 + END * 5;

    const damageReduction = END * 0.5;

    // ============================
    // 3) RESSOURCE
    // ============================
    let maxResource = 0;
    let manaRegen = 0;
    let rageRegen = 0;
    let energyRegen = 0;

    switch (classStats.resourceType) {
      case "mana":
        maxResource = 100 + INT * 5;
        manaRegen = SPI * 2;
        break;

      case "rage":
        maxResource = 100;
        break;

      case "energy":
        maxResource = 100;
        energyRegen = 10;
        break;
    }

    // ============================
    // 4) MOBILITÉ
    // ============================
    const moveSpeed = classStats.baseMoveSpeed;

    // ============================
    // 5) ATTACK SPEED
    // ============================
    const baseSpeed = player.attackSpeed || 2.5;

    const finalAttackSpeed = Math.max(
      0.3,
      baseSpeed - AGI * 0.02
    );

    // ============================
    // 6) CRITIQUE & ÉVASION
    // ============================
    const criticalChance = AGI * 0.1;
    const criticalDamage = 150;
    const evasion = AGI * 0.5;

    // ============================
    // 7) DÉFENSE
    // ============================
    const armor = END * 1;
    const magicResistance = INT * 0.2;

    // ============================
    // 8) STATS AVANCÉES
    // ============================
    const precision = 0;
    const penetration = 0;
    const tenacity = 0;
    const lifesteal = 0;
    const spellPenetration = 0;

    // ============================
    // 9) PACKAGE FINAL
    // ============================
    return {
      hp: maxHp,
      maxHp,

      resource: maxResource,
      maxResource,
      manaRegen,
      rageRegen,
      energyRegen,

      attackPower,
      spellPower,
      attackSpeed: finalAttackSpeed,

      criticalChance,
      criticalDamage,

      damageReduction,
      armor,
      magicResistance,

      moveSpeed,

      precision,
      evasion,
      penetration,
      tenacity,
      lifesteal,
      spellPenetration
    };
  }
}
