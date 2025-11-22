import { PlayerState } from "../../schema/PlayerState";
import { getRaceById } from "../../../config/races.config";
import { IPlayerPrimaryStats, IPlayerComputedStats } from "../../../models/ServerProfile";
import { SkinManagerInstance } from "../SkinManager";
import ItemModel from "../../../models/Item";
import { getStatsForClass } from "../../../config/classes.config";

type SkinBonus = {
  primaryPercent?: Record<string, number>;
  computedPercent?: Record<string, number>;
};

export async function computeFullStats(player: PlayerState): Promise<IPlayerComputedStats> {

  const classStats = getStatsForClass(player.class);
  const level = player.level;

  // ==========================================================
  //  BONUS RACE + SKIN
  // ==========================================================
  const race = getRaceById(player.race);
  const skinBonus: SkinBonus =
    SkinManagerInstance?.getSkinStatBonus(player) || {};

  const totalPrimary: Record<string, number> = {};
  const totalComputed: Record<string, number> = {};

  // --- PRIMARY RACE ---
  if (race?.statsModifiers?.primaryPercent) {
    for (const k in race.statsModifiers.primaryPercent) {
      totalPrimary[k] = (totalPrimary[k] || 0) + race.statsModifiers.primaryPercent[k];
    }
  }

  // --- PRIMARY SKIN ---
  if (skinBonus.primaryPercent) {
    for (const k in skinBonus.primaryPercent) {
      totalPrimary[k] = (totalPrimary[k] || 0) + skinBonus.primaryPercent[k];
    }
  }

  // --- COMPUTED RACE ---
  if (race?.statsModifiers?.computedPercent) {
    for (const k in race.statsModifiers.computedPercent) {
      totalComputed[k] = (totalComputed[k] || 0) + race.statsModifiers.computedPercent[k];
    }
  }

  // --- COMPUTED SKIN ---
  if (skinBonus.computedPercent) {
    for (const k in skinBonus.computedPercent) {
      totalComputed[k] = (totalComputed[k] || 0) + skinBonus.computedPercent[k];
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
  // 🔥 BONUS PRIMARY DES ÉQUIPEMENTS
  // ==========================================================
  for (const equipSlot of player.inventory.equipment.values()) {
    if (!equipSlot.itemId) continue;

    const model = await ItemModel.findOne({ itemId: equipSlot.itemId });
    if (!model?.stats) continue;

    for (const key of ["strength", "agility", "intelligence", "endurance", "spirit"]) {
      const k = key as keyof IPlayerPrimaryStats;
      if (typeof model.stats[key] === "number") {
        primary[k] += model.stats[key]!;
      }
    }
  }

  // APPLY PRIMARY BONUS %
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
  // 🔥 BONUS COMPUTED DES ÉQUIPEMENTS
  // ==========================================================
  for (const equipSlot of player.inventory.equipment.values()) {
    if (!equipSlot.itemId) continue;

    const model = await ItemModel.findOne({ itemId: equipSlot.itemId });
    if (!model?.stats) continue;

    for (const [key, rawValue] of Object.entries(model.stats)) {

      if (["strength", "agility", "intelligence", "endurance", "spirit"].includes(key)) {
        continue; // déjà dans primary
      }

      const value = Number(rawValue);
      const k = key as keyof IPlayerComputedStats;

      if (typeof computed[k] === "number") {
        computed[k] += value;
      }
    }
  }

  // APPLY COMPUTED BONUS %
  for (const [stat, percent] of Object.entries(totalComputed)) {
    const k = stat as keyof IPlayerComputedStats;
    if (typeof computed[k] === "number") {
      computed[k] = Math.floor(computed[k] * (1 + percent / 100));
    }
  }

  computed.hp = computed.maxHp;
  computed.resource = computed.maxResource;

  return computed;
}
