import { IClassStats } from "../../../models/ClassStats";
import { PlayerState } from "../../schema/PlayerState";
import { getRaceById } from "../../../config/races.config";
import { IPlayerPrimaryStats, IPlayerComputedStats } from "../../../models/ServerProfile";
import { SkinManagerInstance } from "../SkinManager";

export class PlayerStatsCalculator {

  static compute(player: PlayerState, classStats: IClassStats) {

    const level = player.level;

    // ==========================================================
    // 0) FUSION BONUS % (RACE + SKINS)
    // ==========================================================

    const race = getRaceById(player.race);
    const skinBonus = SkinManagerInstance?.getSkinStatBonus(player) || {};

    const totalPrimary = Object.create(null);
    const totalComputed = Object.create(null);

    // --- Race (primary + computed)
    if (race?.statsModifiers) {
      if (race.statsModifiers.primaryPercent) {
        for (const key in race.statsModifiers.primaryPercent) {
          totalPrimary[key] = (totalPrimary[key] || 0) + race.statsModifiers.primaryPercent[key];
        }
      }
      if (race.statsModifiers.computedPercent) {
        for (const key in race.statsModifiers.computedPercent) {
          totalComputed[key] = (totalComputed[key] || 0) + race.statsModifiers.computedPercent[key];
        }
      }
    }

    // --- Skins (primary + computed)
    if (skinBonus.primaryPercent) {
      for (const key in skinBonus.primaryPercent) {
        totalPrimary[key] = (totalPrimary[key] || 0) + skinBonus.primaryPercent[key];
      }
    }
    if (skinBonus.computedPercent) {
      for (const key in skinBonus.computedPercent) {
        totalComputed[key] = (totalComputed[key] || 0) + skinBonus.computedPercent[key];
      }
    }

    // ==========================================================
    // 1) BASE PRIMARY STATS
    // ==========================================================

    let primary: IPlayerPrimaryStats = {
      strength: classStats.baseStats.strength + classStats.statsPerLevel.strength * (level - 1),
      agility: classStats.baseStats.agility + classStats.statsPerLevel.agility * (level - 1),
      intelligence: classStats.baseStats.intelligence + classStats.statsPerLevel.intelligence * (level - 1),
      endurance: classStats.baseStats.endurance + classStats.statsPerLevel.endurance * (level - 1),
      spirit: classStats.baseStats.spirit + classStats.statsPerLevel.spirit * (level - 1),
    };

    // ==========================================================
    // 2) BONUS PRIMAIRES % (appliqué une seule fois)
    // ==========================================================

    for (const stat in totalPrimary) {
      const key = stat as keyof IPlayerPrimaryStats;
      primary[key] = Math.round(primary[key] * (1 + totalPrimary[stat] / 100));
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
      spellPenetration: 0,
    };

    // ==========================================================
    // 4) RESSOURCE TYPE
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
    // 5) BONUS COMPUTED % (RACE + SKIN)
    // ==========================================================

    for (const stat in totalComputed) {
      const key = stat as keyof IPlayerComputedStats;
      if (typeof computed[key] === "number") {
        computed[key] = Math.round(computed[key] * (1 + totalComputed[stat] / 100));
      }
    }

    // ==========================================================
    // 6) FINAL
    // ==========================================================

    computed.hp = computed.maxHp;
    computed.resource = computed.maxResource;

    return computed;
  }
}
