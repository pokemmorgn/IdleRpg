/**
 * Configuration des races jouables
 */

import { IPlayerPrimaryStats, IPlayerComputedStats } from "../models/ServerProfile";

export type Faction = "AURION" | "OMBRE";

export interface RaceStatsModifiers {
  primaryPercent?: Partial<IPlayerPrimaryStats>;
  computedPercent?: Partial<IPlayerComputedStats>;
}

export interface RaceConfig {
  raceId: string;
  nameKey: string;
  descriptionKey: string;
  loreKey: string;
  faction: Faction;
  statsModifiers?: RaceStatsModifiers;

  // ➜ Clé user-friendly destinée au client Unity
  bonusesLocalized: string[];
}

// =========================================================
// FUNCTION : Génère les clés lisibles pour Unity
// =========================================================

function generateLocalizedBonusKeys(mod: RaceStatsModifiers | undefined): string[] {
  if (!mod) return [];

  const list: string[] = [];

  // Stat primaires (%)
  if (mod.primaryPercent) {
    for (const [stat, pct] of Object.entries(mod.primaryPercent)) {
      list.push(`bonus.primary.${stat}.${pct}`);  
      // Ex : bonus.primary.intelligence.5
    }
  }

  // Stats computed (%)
  if (mod.computedPercent) {
    for (const [stat, pct] of Object.entries(mod.computedPercent)) {
      list.push(`bonus.computed.${stat}.${pct}`);
      // Ex : bonus.computed.maxHp.5
    }
  }

  return list;
}

// =========================================================
// RACES
// =========================================================

const BASE_RACES: Omit<RaceConfig, "bonusesLocalized">[] = [
  {
    raceId: "human_elion",
    nameKey: "race.human_elion.name",
    descriptionKey: "race.human_elion.description",
    loreKey: "race.human_elion.lore",
    faction: "AURION",
    statsModifiers: {
      primaryPercent: { endurance: 5, spirit: 5 }
    }
  },
  {
    raceId: "dwarf_rune",
    nameKey: "race.dwarf_rune.name",
    descriptionKey: "race.dwarf_rune.description",
    loreKey: "race.dwarf_rune.lore",
    faction: "AURION",
    statsModifiers: {
      computedPercent: { maxHp: 5, armor: 5 }
    }
  },
  {
    raceId: "murlocs",
    nameKey: "race.murlocs.name",
    descriptionKey: "race.murlocs.description",
    loreKey: "race.murlocs.lore",
    faction: "AURION",
    statsModifiers: {
      primaryPercent: { agility: 5 },
      computedPercent: { evasion: 5 }
    }
  },
  {
    raceId: "sylphide_forest",
    nameKey: "race.sylphide_forest.name",
    descriptionKey: "race.sylphide_forest.description",
    loreKey: "race.sylphide_forest.lore",
    faction: "AURION",
    statsModifiers: {
      primaryPercent: { intelligence: 5 },
      computedPercent: { manaRegen: 5 }
    }
  },
  {
    raceId: "varkyns_beast",
    nameKey: "race.varkyns_beast.name",
    descriptionKey: "race.varkyns_beast.description",
    loreKey: "race.varkyns_beast.lore",
    faction: "OMBRE",
    statsModifiers: {
      primaryPercent: { strength: 5 },
      computedPercent: { maxHp: 5 }
    }
  },
  {
    raceId: "arkanids_insect",
    nameKey: "race.arkanids_insect.name",
    descriptionKey: "race.arkanids_insect.description",
    loreKey: "race.arkanids_insect.lore",
    faction: "OMBRE",
    statsModifiers: {
      primaryPercent: { agility: 5 },
      computedPercent: { attackSpeed: 5 }
    }
  },
  {
    raceId: "ghrannite_stone",
    nameKey: "race.ghrannite_stone.name",
    descriptionKey: "race.ghrannite_stone.description",
    loreKey: "race.ghrannite_stone.lore",
    faction: "OMBRE",
    statsModifiers: {
      primaryPercent: { endurance: 5 },
      computedPercent: { damageReduction: 5 }
    }
  },
  {
    raceId: "selenite_lunar",
    nameKey: "race.selenite_lunar.name",
    descriptionKey: "race.selenite_lunar.description",
    loreKey: "race.selenite_lunar.lore",
    faction: "OMBRE",
    statsModifiers: {
      primaryPercent: { intelligence: 5 },
      computedPercent: { spellPower: 5 }
    }
  }
];

// =========================================================
// Génération AUTOMATIQUE du champ bonusesLocalized
// =========================================================

export const ALL_RACES: RaceConfig[] = BASE_RACES.map(r => ({
  ...r,
  bonusesLocalized: generateLocalizedBonusKeys(r.statsModifiers)
}));

export const RACES_BY_ID = new Map(ALL_RACES.map(r => [r.raceId, r]));

export const VALID_RACE_IDS = ALL_RACES.map(r => r.raceId);

export function isValidRace(raceId: string) {
  return RACES_BY_ID.has(raceId);
}

export function getRaceById(raceId: string) {
  return RACES_BY_ID.get(raceId);
}

export function getRacesByFaction(faction: Faction) {
  return ALL_RACES.filter(r => r.faction === faction);
}
