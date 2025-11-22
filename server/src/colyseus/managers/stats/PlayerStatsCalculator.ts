import { PlayerState } from "../../schema/PlayerState";
import { getRaceById } from "../../../config/races.config";
import { IPlayerPrimaryStats, IPlayerComputedStats } from "../../../models/ServerProfile";
import { SkinManagerInstance } from "../SkinManager";
import { getStatsForClass } from "../../../config/classes.config"; // ✔ IMPORTANT

// ==========================================================
// TYPE BONUS SKIN
// ==========================================================
type SkinBonus = {
  primaryPercent?: Record<string, number>;
  computedPercent?: Record<string, number>;
};

// ==========================================================
// FONCTION PRINCIPALE
// ==========================================================
export function computeFullStats(player: PlayerState): IPlayerComputedStats {

  // ==========================================================
  // 1) Stats de classe
  // ==========================================================
  const classStats = getStatsForClass(player.class);
  const level = player.level;

  // ==========================================================
  // 2) Bonus race + skin fusionnés
  // ==========================================================
  const race = getRaceById(player.race);

  const skinBonus: SkinBonus =
    SkinManagerInstance?.getSkinStatBonus(player) || {};

  const totalPrimary: Record<string, number> = {};
  const totalComputed: Record<string, number> = {};

  // --- PRIMARY (race)
  if (race?.statsModifiers?.primaryPercent) {
    for (const key in race.statsModifiers.primaryPercent) {
      totalPrimary[key] =
        (totalPrimary[key] || 0) +
        race.statsModifiers.primaryPercent[key];
    }
  }

  // --- PRIMARY (skin)
  if (skinBonus.primaryPercent) {
    for (const key in skinBonus.primaryPercent) {
      totalPrimary[key] =
        (totalPrimary[key] || 0) +
        skinBonus.primaryPercent[key];
    }
  }

  // --- COMPUTED (race)
  if (race?.statsModifiers?.computedPercent) {
    for (const key in race.statsModifiers.computedPercent) {
      totalComputed[key] =
        (totalComputed[key] || 0) +
        race.statsModifiers.computedPercent[key];
    }
  }

  // --- COMPUTED (skin)
  if (skinBonus.computedPercent) {
    for (const key in skinBonus.computedPercent) {
      totalComputed[key] =
        (totalComputed[key] || 0) +
        skinBonus.computedPercent[key];
    }
  }

  // ==========================================================
  // PRIMARY BASE
  // ==========================================================
  let primary: IPlayerPrimaryStats = {
    strength: classStats.baseStats.strength + classStats.statsPerLevel.strength * (level - 1),
    agility: classStats.baseStats.agility + classStats.statsPerLevel.agility * (level - 1),
    intelligence: classStats.baseStats.intelligence + classStats.statsPerLevel.intelligence * (level - 1),
    endurance: classStats.baseStats.endurance + classStats.statsPerLevel.endurance * (level - 1),
    spirit: classStats.baseStats.spirit + classStats.statsPerLevel.spirit * (level - 1)
  };

  // ==========================================================
  // APPLY PRIMARY BONUS %
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
  // COMPUTED BASE
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
  // RESOURCE TYPE
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
  // APPLY COMPUTED BONUS %
  // ==========================================================
  for (const [stat, percent] of Object.entries(totalComputed)) {
    const k = stat as keyof IPlayerComputedStats;
    if (typeof computed[k] === "number") {
      computed[k] = Math.floor(computed[k] * (1 + percent / 100));
    }
  }

  // FINAL
  computed.hp = computed.maxHp;
  computed.resource = computed.maxResource;

  return computed;
}
