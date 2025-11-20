/**
 * Configuration des races jouables — VERSION LOCALISATION
 */

import { IPlayerPrimaryStats, IPlayerComputedStats } from "../models/ServerProfile";

export type Faction = "AURION" | "OMBRE';

/**
 * Bonus raciaux en pourcentage
 */
export interface RaceStatsModifiers {
  primaryPercent?: Partial<IPlayerPrimaryStats>;
  computedPercent?: Partial<IPlayerComputedStats>;
}

/**
 * Clé localisée pour l’UI
 */
export interface LocalizedBonus {
  statKey: string;   // ex: "stat.intelligence"
  percent: number;   // ex: 5
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

  bonusesReadable: string[];         // "+5% intelligence"
  bonusesLocalized: LocalizedBonus[]; // { statKey: "stat.intelligence", percent: 5 }
}

// -----------------------------------------------------------------------------
// Générateurs automatiques
// -----------------------------------------------------------------------------

function makeReadableBonuses(mod?: RaceStatsModifiers): string[] {
  if (!mod) return [];

  const list: string[] = [];

  if (mod.primaryPercent) {
    for (const [stat, val] of Object.entries(mod.primaryPercent)) {
      if (val) list.push(`+${val}% ${stat}`);
    }
  }

  if (mod.computedPercent) {
    for (const [stat, val] of Object.entries(mod.computedPercent)) {
      if (val) list.push(`+${val}% ${stat}`);
    }
  }

  return list;
}

function makeLocalizedBonuses(mod?: RaceStatsModifiers): LocalizedBonus[] {
  if (!mod) return [];

  const list: LocalizedBonus[] = [];

  const push = (stat: string, value: number) => {
    list.push({
      statKey: `stat.${stat}`, // clé traduisible
      percent: value
    });
  };

  if (mod.primaryPercent) {
    for (const [stat, val] of Object.entries(mod.primaryPercent)) {
      if (val) push(stat, val);
    }
  }

  if (mod.computedPercent) {
    for (const [stat, val] of Object.entries(mod.computedPercent)) {
      if (val) push(stat, val);
    }
  }

  return list;
}

// -----------------------------------------------------------------------------
// RACES
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// FINAL — Ajout des champs bonusReadable et localized
// -----------------------------------------------------------------------------

export const ALL_RACES: RaceConfig[] = [
  ...AURION_RACES_BASE,
  ...OMBRE_RACES_BASE
].map(r => ({
  ...r,
  bonusesReadable: makeReadableBonuses(r.statsModifiers),
  bonusesLocalized: makeLocalizedBonuses(r.statsModifiers)
}));

export const RACES_BY_ID = new Map(ALL_RACES.map(r => [r.raceId, r]));

export const VALID_RACE_IDS = ALL_RACES.map(r => r.raceId);

export const isValidRace = (raceId: string) => RACES_BY_ID.has(raceId);
export const getRaceById = (raceId: string) => RACES_BY_ID.get(raceId);
export const getRacesByFaction = (faction: Faction) =>
  ALL_RACES.filter(r => r.faction === faction);
