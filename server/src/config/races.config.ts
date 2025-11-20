/**
 * Configuration des races jouables — VERSION PRO
 * Ajout de : bonusesReadable (liste pour UI)
 */

import { IPlayerPrimaryStats, IPlayerComputedStats } from "../models/ServerProfile";

export type Faction = "AURION" | "OMBRE";

/**
 * Bonus raciaux en pourcentage
 */
export interface RaceStatsModifiers {
  primaryPercent?: Partial<IPlayerPrimaryStats>;
  computedPercent?: Partial<IPlayerComputedStats>;
}

/**
 * Structure d'une race jouable
 */
export interface RaceConfig {
  raceId: string;
  nameKey: string;
  descriptionKey: string;
  loreKey: string;
  faction: Faction;
  statsModifiers?: RaceStatsModifiers;

  // AJOUT : Bonus lisibles pour l’UI
  bonusesReadable: string[];
}

// ----------------------------------------------------
// Générateur de texte lisible
// ----------------------------------------------------
function makeReadableBonuses(mod?: RaceStatsModifiers): string[] {
  if (!mod) return [];

  const list: string[] = [];

  if (mod.primaryPercent) {
    for (const [stat, value] of Object.entries(mod.primaryPercent)) {
      if (value) list.push(`+${value}% ${stat}`);
    }
  }

  if (mod.computedPercent) {
    for (const [stat, value] of Object.entries(mod.computedPercent)) {
      if (value) list.push(`+${value}% ${stat}`);
    }
  }

  return list;
}

// ----------------------------------------------------
// FACTION AURION
// ----------------------------------------------------

const AURION_RACES_BASE = [
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
  }
];

// ----------------------------------------------------
// FACTION OMBRE
// ----------------------------------------------------

const OMBRE_RACES_BASE = [
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

// ----------------------------------------------------
// FINAL : Construction avec bonusesReadable
// ----------------------------------------------------

export const ALL_RACES: RaceConfig[] = [
  ...AURION_RACES_BASE,
  ...OMBRE_RACES_BASE
].map(race => ({
  ...race,
  bonusesReadable: makeReadableBonuses(race.statsModifiers)
}));

export const RACES_BY_ID = new Map(
  ALL_RACES.map(r => [r.raceId, r])
);

export const VALID_RACE_IDS = ALL_RACES.map(r => r.raceId);

export function isValidRace(id: string) {
  return RACES_BY_ID.has(id);
}
export function getRaceById(id: string) {
  return RACES_BY_ID.get(id);
}
export function getRacesByFaction(faction: Faction) {
  return ALL_RACES.filter(r => r.faction === faction);
}
