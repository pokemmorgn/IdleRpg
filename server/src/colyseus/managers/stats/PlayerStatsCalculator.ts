import { IClassStats } from "../../../models/ClassStats";
import { PlayerState } from "../../schema/PlayerState";
import { getRaceById } from "../../../config/races.config";
import { RaceConfig } from "../../../config/races.config";

/**
 * Applique les bonus raciaux sur les stats primaires
 */
function applyPrimaryRaceBonuses(
  primary: { [k: string]: number },
  race?: RaceConfig
) {
  if (!race || !race.statsModifiers?.primary) return primary;

  const result = { ...primary };
  for (const [stat, value] of Object.entries(race.statsModifiers.primary)) {
    result[stat] += value ?? 0;
  }

  return result;
}

/**
 * Applique les bonus raciaux sur les stats computed
 */
function applyComputedRaceBonuses(
  computed: { [k: string]: number },
  race?: RaceConfig
) {
  if (!race || !race.statsModifiers?.computed) return computed;

  const result = { ...computed };
  for (const [stat, value] of Object.entries(race.statsModifiers.computed)) {
    result[stat] += value ?? 0;
  }

  return result;
}

/**
 * =============================
 *  PLAYER STATS CALCULATOR
 * =============================
 * Calcule les stats finales du joueur :
 * - Classe (base + per level)
 * - Niveau
 * - Statistiques raciales
 * 
 * ⚠️ IMPORTANT :
 * Aucun buff, aucun équipement pour l’instant.
 */
export class PlayerStatsCalculator {

  static compute(player: PlayerState, classStats: IClassStats) {

    const level = player.level;
    const race = getRaceById(player.race);   // <<<<< AJOUT ICI

    // ============================
    // 1) STATS PRIMAIRES (BRUTES)
    // ============================
    let prim = {
      strength: classStats.baseStats.strength + classStats.statsPerLevel.strength * (level - 1),
      agility: classStats.baseStats.agility + classStats.statsPerLevel.agility * (level - 1),
      intelligence: classStats.baseStats.intelligence + classStats.statsPerLevel.intelligence * (level - 1),
      endurance: classStats.baseStats.endurance + classStats.statsPerLevel.endurance * (level - 1),
      spirit: classStats.baseStats.spirit + classStats.statsPerLevel.spirit * (level - 1)
    };

    // ============================
    // 1B) APPLICATION BONUS RACIAL
    // ============================
    prim = applyPrimaryRaceBonuses(prim, race);

    const STR = prim.strength;
    const AGI = prim.agility;
    const INT = prim.intelligence;
    const END = prim.endurance;
    const SPI = prim.spirit;

    // ============================
    // 2) COMBAT DE BASE
    // ============================
    let computed = {
      attackPower: STR * 2,
      spellPower: INT * 2,
      maxHp: 100 + END * 5,
      damageReduction: END * 0.5,

      // resource
      maxResource: 0,
      manaRegen: 0,
      rageRegen: 0,
      energyRegen: 0,

      // mobilité
      moveSpeed: classStats.baseMoveSpeed,

      // vit. attaque
      attackSpeed: Math.max(0.3, (player.attackSpeed || 2.5) - AGI * 0.02),

      // critique & esquive
      criticalChance: AGI * 0.1,
      criticalDamage: 150,
      evasion: AGI * 0.5,

      // défense
      armor: END * 1,
      magicResistance: INT * 0.2,

      // avancées (placeholder)
      precision: 0,
      penetration: 0,
      tenacity: 0,
      lifesteal: 0,
      spellPenetration: 0
    };

    // ============================
    // 3) RESSOURCE PAR TYPE
    // ============================
    switch (classStats.resourceType) {
      case "mana":
        computed.maxResource = 100 + INT * 5;
        computed.manaRegen = SPI * 2;
        break;

      case "rage":
        computed.maxResource = 100;
        break;

      case "energy":
        computed.maxResource = 100;
        computed.energyRegen = 10;
        break;
    }

    // ============================
    // 4) APPLICATION BONUS RACIAL (COMPUTED)
    // ============================
    computed = applyComputedRaceBonuses(computed, race);

    // ============================
    // 5) PACKAGE FINAL
    // ============================
    return {
      hp: computed.maxHp,
      maxHp: computed.maxHp,

      resource: computed.maxResource,
      maxResource: computed.maxResource,
      manaRegen: computed.manaRegen,
      rageRegen: computed.rageRegen,
      energyRegen: computed.energyRegen,

      attackPower: computed.attackPower,
      spellPower: computed.spellPower,
      attackSpeed: computed.attackSpeed,

      criticalChance: computed.criticalChance,
      criticalDamage: computed.criticalDamage,

      damageReduction: computed.damageReduction,
      armor: computed.armor,
      magicResistance: computed.magicResistance,

      moveSpeed: computed.moveSpeed,

      precision: computed.precision,
      evasion: computed.evasion,
      penetration: computed.penetration,
      tenacity: computed.tenacity,
      lifesteal: computed.lifesteal,
      spellPenetration: computed.spellPenetration
    };
  }
}
