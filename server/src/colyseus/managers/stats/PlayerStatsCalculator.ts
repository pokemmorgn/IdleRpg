import { IClassStats } from "../../../models/ClassStats";
import { PlayerState } from "../../schema/PlayerState";
import {
  getRaceById,
  RaceConfig
} from "../../../config/races.config";
import {
  IPlayerPrimaryStats,
  IPlayerComputedStats
} from "../../../models/ServerProfile";
import { SkinManagerInstance } from "../SkinManager";

// =======================================================================
// BONUS RACIAUX — APPLICATION DES %
// =======================================================================

/**
 * Applique un bonus en pourcentage sur les stats primaires (race)
 */
function applyPrimaryRaceBonuses(
  primary: IPlayerPrimaryStats,
  race?: RaceConfig
): IPlayerPrimaryStats {
  if (!race || !race.statsModifiers?.primaryPercent) return primary;

  const result: IPlayerPrimaryStats = { ...primary };

  for (const [stat, percent] of Object.entries(race.statsModifiers.primaryPercent)) {
    if (percent === undefined || percent === null) continue;

    const key = stat as keyof IPlayerPrimaryStats;
    const multiplier = 1 + percent / 100;

    result[key] = Math.floor(result[key] * multiplier);
  }

  return result;
}

/**
 * Applique un bonus % sur les stats computed (race)
 */
function applyComputedRaceBonuses(
  computed: IPlayerComputedStats,
  race?: RaceConfig
): IPlayerComputedStats {
  if (!race || !race.statsModifiers?.computedPercent) return computed;

  const result: IPlayerComputedStats = { ...computed };

  for (const [stat, percent] of Object.entries(race.statsModifiers.computedPercent)) {
    if (percent === undefined || percent === null) continue;

    const key = stat as keyof IPlayerComputedStats;
    const multiplier = 1 + percent / 100;

    // On protège les stats non numériques
    if (typeof result[key] === "number") {
      result[key] = Math.floor(result[key] * multiplier);
    }
  }

  return result;
}

// =======================================================================
// BONUS SKINS — APPLICATION DES %
// (même format que races: primaryPercent / computedPercent)
// =======================================================================

type SkinBonus = {
  primaryPercent?: Record<string, number>;
  computedPercent?: Record<string, number>;
};

/**
 * Applique un bonus % sur les stats primaires venant des skins
 */
function applyPrimarySkinBonuses(
  primary: IPlayerPrimaryStats,
  skinBonus?: SkinBonus
): IPlayerPrimaryStats {
  if (!skinBonus?.primaryPercent) return primary;

  const result: IPlayerPrimaryStats = { ...primary };

  for (const [stat, percent] of Object.entries(skinBonus.primaryPercent)) {
    if (percent === undefined || percent === null) continue;

    const key = stat as keyof IPlayerPrimaryStats;
    const multiplier = 1 + percent / 100;

    result[key] = Math.floor(result[key] * multiplier);
  }

  return result;
}

/**
 * Applique un bonus % sur les stats computed venant des skins
 */
function applyComputedSkinBonuses(
  computed: IPlayerComputedStats,
  skinBonus?: SkinBonus
): IPlayerComputedStats {
  if (!skinBonus?.computedPercent) return computed;

  const result: IPlayerComputedStats = { ...computed };

  for (const [stat, percent] of Object.entries(skinBonus.computedPercent)) {
    if (percent === undefined || percent === null) continue;

    const key = stat as keyof IPlayerComputedStats;
    const multiplier = 1 + percent / 100;

    if (typeof result[key] === "number") {
      result[key] = Math.floor(result[key] * multiplier);
    }
  }

  return result;
}

// =======================================================================
// CALCULATEUR COMPLET
// =======================================================================

export class PlayerStatsCalculator {

  static compute(player: PlayerState, classStats: IClassStats) {

    const level = player.level;
    const race = getRaceById(player.race);

    // ============================
    // 1) STATS PRIMAIRES DE BASE
    // ============================

    let primaryStats: IPlayerPrimaryStats = {
      strength: classStats.baseStats.strength + classStats.statsPerLevel.strength * (level - 1),
      agility: classStats.baseStats.agility + classStats.statsPerLevel.agility * (level - 1),
      intelligence: classStats.baseStats.intelligence + classStats.statsPerLevel.intelligence * (level - 1),
      endurance: classStats.baseStats.endurance + classStats.statsPerLevel.endurance * (level - 1),
      spirit: classStats.baseStats.spirit + classStats.statsPerLevel.spirit * (level - 1)
    };

    // ===== BONUS PRIMAIRES RACIAUX =====
    primaryStats = applyPrimaryRaceBonuses(primaryStats, race);

    // ===== BONUS PRIMAIRES SKINS =====
    const skinBonus: SkinBonus | undefined =
      SkinManagerInstance?.getSkinStatBonus(player);

    primaryStats = applyPrimarySkinBonuses(primaryStats, skinBonus);

    const STR = primaryStats.strength;
    const AGI = primaryStats.agility;
    const INT = primaryStats.intelligence;
    const END = primaryStats.endurance;
    const SPI = primaryStats.spirit;

    // ============================
    // 2) STATS COMPUTED DE BASE
    // ============================

    let computed: IPlayerComputedStats = {
      maxHp: 100 + END * 5,
      hp: 0,

      maxResource: 0,
      resource: 0,
      manaRegen: 0,
      rageRegen: 0,
      energyRegen: 0,

      attackPower: STR * 2,
      spellPower: INT * 2,
      attackSpeed: Math.max(0.3, (player.attackSpeed || 2.5) - AGI * 0.02),

      criticalChance: AGI * 0.1,
      criticalDamage: 150,

      damageReduction: END * 0.5,
      armor: END,
      magicResistance: INT * 0.2,

      moveSpeed: classStats.baseMoveSpeed,

      precision: 0,
      evasion: AGI * 0.5,
      penetration: 0,
      tenacity: 0,
      lifesteal: 0,
      spellPenetration: 0
    };

    // ============================
    // 3) TYPE DE RESSOURCE
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
    // 4) BONUS COMPUTED RACIAL
    // ============================

    computed = applyComputedRaceBonuses(computed, race);

    // ============================
    // 5) BONUS COMPUTED SKINS
    // ============================

    computed = applyComputedSkinBonuses(computed, skinBonus);

    // ============================
    // 6) FINAL
    // ============================

    computed.hp = computed.maxHp;
    computed.resource = computed.maxResource;

    return computed;
  }
}
