// server/src/colyseus/managers/stats/PlayerStatsCalculator.ts

import { IClassStats } from "../../../models/ClassStats";
import { PlayerState } from "../../schema/PlayerState";
import { getRaceById } from "../../../config/races.config";
import {
  IPlayerPrimaryStats,
  IPlayerComputedStats
} from "../../../models/ServerProfile";
import { SkinManagerInstance } from "../SkinManager";

// ==========================================================
// TYPE: BONUS SKIN (identique à la config)
// ==========================================================
type SkinBonus = {
  primaryPercent?: Record<string, number>;
  computedPercent?: Record<string, number>;
};

export class PlayerStatsCalculator {

  static compute(player: PlayerState, classStats: IClassStats) {

    const level = player.level;

    // ==========================================================
    // 0) RACE + SKINS : FUSION DES BONUS %
    // ==========================================================

    const race = getRaceById(player.race);

    // 🔥 FIX: typage explicite => plus d’erreurs TS
    const skinBonus: SkinBonus =
      SkinManagerInstance?.getSkinStatBonus(player) || {};

    const totalPrimary: Record<string, number> = {};
    const totalComputed: Record<string, number> = {};

    // --- BONUS RACE PRIMARY
    if (race?.statsModifiers?.primaryPercent) {
      for (const key in race.statsModifiers.primaryPercent) {
        totalPrimary[key] =
          (totalPrimary[key] || 0) +
          race.statsModifiers.primaryPercent[key];
      }
    }

    // --- BONUS SKIN PRIMARY
    if (skinBonus.primaryPercent) {
      for (const key in skinBonus.primaryPercent) {
        totalPrimary[key] =
          (totalPrimary[key] || 0) +
          skinBonus.primaryPercent[key];
      }
    }

    // --- BONUS RACE COMPUTED
    if (race?.statsModifiers?.computedPercent) {
      for (const key in race.statsModifiers.computedPercent) {
        totalComputed[key] =
          (totalComputed[key] || 0) +
          race.statsModifiers.computedPercent[key];
      }
    }

    // --- BONUS SKIN COMPUTED
    if (skinBonus.computedPercent) {
      for (const key in skinBonus.computedPercent) {
        totalComputed[key] =
          (totalComputed[key] || 0) +
          skinBonus.computedPercent[key];
      }
    }

    // ==========================================================
    // 1) PRIMARY STATS BASE (class + level)
    // ==========================================================

    let primary: IPlayerPrimaryStats = {
      strength: classStats.baseStats.strength + classStats.statsPerLevel.strength * (level - 1),
      agility: classStats.baseStats.agility + classStats.statsPerLevel.agility * (level - 1),
      intelligence: classStats.baseStats.intelligence + classStats.statsPerLevel.intelligence * (level - 1),
      endurance: classStats.baseStats.endurance + classStats.statsPerLevel.endurance * (level - 1),
      spirit: classStats.baseStats.spirit + classStats.statsPerLevel.spirit * (level - 1)
    };

    // ==========================================================
    // 2) APPLY PRIMARY BONUS % (1 seul passage)
    // ==========================================================

    for (const [stat, percent] of Object.entries(totalPrimary)) {
      const k = stat as keyof IPlayerPrimaryStats;
      primary[k] = Math.floor(primary[k] * (1 + percent / 100));
    }

    const STR = primary.strength;
    const AGI = primary.agility;
    const INT = primary.intelligence;
    const END = primary.endurance;
    const SPI = primary.spirit;

    // ==========================================================
    // 3) COMPUTED BASE STATS
    // ==========================================================

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

    // ==========================================================
    // 4) RESOURCE TYPE
    // ==========================================================

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

    // ==========================================================
    // 5) APPLY COMPUTED BONUS % (1 seul passage)
    // ==========================================================

    for (const [stat, percent] of Object.entries(totalComputed)) {
      const k = stat as keyof IPlayerComputedStats;
      if (typeof computed[k] === "number") {
        computed[k] = Math.floor(computed[k] * (1 + percent / 100));
      }
    }

    // ==========================================================
    // 6) FINAL VALUES
    // ==========================================================

    computed.hp = computed.maxHp;
    computed.resource = computed.maxResource;

    return computed;
  }
}
