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
  // 1) BONUS RACE + SKIN (PRIMARY + COMPUTED %)
  // ==========================================================
  const race = getRaceById(player.race);
  const skinBonus: SkinBonus = SkinManagerInstance?.getSkinStatBonus(player) || {};

  const primaryPercent: Record<string, number> = {};
  const computedPercent: Record<string, number> = {};

  // --- RACE PRIMARY %
  if (race?.statsModifiers?.primaryPercent) {
    for (const k in race.statsModifiers.primaryPercent) {
      primaryPercent[k] = (primaryPercent[k] || 0) + race.statsModifiers.primaryPercent[k];
    }
  }

  // --- SKIN PRIMARY %
  if (skinBonus.primaryPercent) {
    for (const k in skinBonus.primaryPercent) {
      primaryPercent[k] = (primaryPercent[k] || 0) + skinBonus.primaryPercent[k];
    }
  }

  // --- RACE COMPUTED %
  if (race?.statsModifiers?.computedPercent) {
    for (const k in race.statsModifiers.computedPercent) {
      computedPercent[k] = (computedPercent[k] || 0) + race.statsModifiers.computedPercent[k];
    }
  }

  // --- SKIN COMPUTED %
  if (skinBonus.computedPercent) {
    for (const k in skinBonus.computedPercent) {
      computedPercent[k] = (computedPercent[k] || 0) + skinBonus.computedPercent[k];
    }
  }

  // ==========================================================
  // 2) PRIMARY BASE (LEVEL SCALING)
  // ==========================================================
  let primary: IPlayerPrimaryStats = {
    strength: classStats.baseStats.strength + classStats.statsPerLevel.strength * (level - 1),
    agility: classStats.baseStats.agility + classStats.statsPerLevel.agility * (level - 1),
    intelligence: classStats.baseStats.intelligence + classStats.statsPerLevel.intelligence * (level - 1),
    endurance: classStats.baseStats.endurance + classStats.statsPerLevel.endurance * (level - 1),
    spirit: classStats.baseStats.spirit + classStats.statsPerLevel.spirit * (level - 1)
  };

  // ==========================================================
  // 3) PRIMARY BONUS DES ÉQUIPEMENTS
  // ==========================================================
  for (const eq of player.inventory.equipment.values()) {
    if (!eq.itemId) continue;

    const model = await ItemModel.findOne({ itemId: eq.itemId });
    if (!model?.stats) continue;

    for (const key of ["strength", "agility", "intelligence", "endurance", "spirit"]) {
      if (typeof model.stats[key] === "number") {
        const k = key as keyof IPlayerPrimaryStats;
        primary[k] += model.stats[key]!;
      }
    }
  }

  // ==========================================================
  // 4) APPLY PRIMARY BONUS %
  // ==========================================================
  for (const [stat, percent] of Object.entries(primaryPercent)) {
    const k = stat as keyof IPlayerPrimaryStats;
    primary[k] = Math.floor(primary[k] * (1 + percent / 100));
  }

  // ==========================================================
  // 5) COMPUTED BASE (avant ajout équipement)
  // ==========================================================
let computed: IPlayerComputedStats = {
  maxHp: 100 + primary.endurance * 5,
  hp: 0,

  maxResource: 0,
  resource: 0,
  manaRegen: 0,
  rageRegen: 0,
  energyRegen: 0,

  attackPower: primary.strength * 2,
  spellPower: primary.intelligence * 2,

  // ✔ FIX : utiliser baseAttackSpeed de la classe
  attackSpeed: Math.max(0.3, classStats.baseAttackSpeed - primary.agility * 0.02),

  criticalChance: primary.agility * 0.1,
  criticalDamage: 150,

  damageReduction: primary.endurance * 0.5,
  armor: primary.endurance,
  magicResistance: primary.intelligence * 0.2,

  moveSpeed: classStats.baseMoveSpeed,

  precision: 0,
  evasion: primary.agility * 0.5,
  penetration: 0,
  tenacity: 0,
  lifesteal: 0,
  spellPenetration: 0
};


  // ==========================================================
  // 6) COMPUTED BONUS DES ÉQUIPEMENTS
  // ==========================================================
  for (const eq of player.inventory.equipment.values()) {
    if (!eq.itemId) continue;

    const model = await ItemModel.findOne({ itemId: eq.itemId });
    if (!model?.stats) continue;

    for (const [key, raw] of Object.entries(model.stats)) {

      // Skip primary (deja appliqué)
      if (["strength", "agility", "intelligence", "endurance", "spirit"].includes(key)) {
        continue;
      }

      const value = Number(raw);
      const k = key as keyof IPlayerComputedStats;

      if (typeof computed[k] === "number") {
        computed[k] += value;
      }
    }
  }

  // ==========================================================
  // 7) APPLY COMPUTED BONUS %
  // ==========================================================
  for (const [stat, percent] of Object.entries(computedPercent)) {
    const k = stat as keyof IPlayerComputedStats;
    if (typeof computed[k] === "number") {
      computed[k] = Math.floor(computed[k] * (1 + percent / 100));
    }
  }

  // ==========================================================
  // 8) FINALIZATION
  // ==========================================================
  computed.hp = computed.maxHp;
  computed.resource = computed.maxResource;

  return computed;
}
