/**
 * Configuration des races jouables
 * Organisées par faction
 * 
 * NOTE DEV - Traits physiques et culture par race (pour référence) :
 * 
 * AURION
 * - Humains d'Élion : Architecture dorée, traits nobles, peau claire à bronze. Société centrée sur l'honneur, la connaissance et la stabilité.
 * - Nains de Pierre-Rune : Corpulence robuste, motifs runiques naturels, barbes ornementales. Forteresses souterraines, culture du métal et des runes.
 * - Murlocs : Petites créatures vives, agiles, instinctives.
 * - Sylphides Forestiers : Silhouette fine, magie naturelle, très connectés au mana.
 *
 * OMBRE
 * - Varkyns : Hybrides bestiaux massifs, très résistants et puissants.
 * - Arkanids : Insectoïdes rapides, chitine légère, réflexes surdéveloppés.
 * - Ghrannites : Orcs de pierre, robustesse extrême et densité corporelle élevée.
 * - Sélénithes : Trolls lunaires, magie obscure, puissance magique innée.
 */

import { IPlayerPrimaryStats, IPlayerComputedStats } from "../models/ServerProfile";

// ======================
// TYPES
// ======================

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
}

// ======================
// FACTION AURION
// ======================

const AURION_RACES: RaceConfig[] = [
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

// ======================
// FACTION OMBRE
// ======================

const OMBRE_RACES: RaceConfig[] = [
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

// ======================
// EXPORT GLOBAL
// ======================

export const ALL_RACES: RaceConfig[] = [
  ...AURION_RACES,
  ...OMBRE_RACES
];

export const RACES_BY_ID = new Map<string, RaceConfig>(
  ALL_RACES.map(r => [r.raceId, r])
);

export const VALID_RACE_IDS = ALL_RACES.map(r => r.raceId);

export function isValidRace(raceId: string): boolean {
  return RACES_BY_ID.has(raceId);
}

export function getRaceById(raceId: string): RaceConfig | undefined {
  return RACES_BY_ID.get(raceId);
}

export function getRacesByFaction(faction: Faction): RaceConfig[] {
  return ALL_RACES.filter(r => r.faction === faction);
}

/**
 * Transforme les bonus raciaux en texte lisible pour le client
 */
export function getReadableRaceBonuses(race: RaceConfig): string[] {
  const lines: string[] = [];
  if (!race.statsModifiers) return lines;

  const { primaryPercent, computedPercent } = race.statsModifiers;

  if (primaryPercent) {
    for (const [stat, value] of Object.entries(primaryPercent)) {
      lines.push(`+${value}% ${stat}`);
    }
  }

  if (computedPercent) {
    for (const [stat, value] of Object.entries(computedPercent)) {
      lines.push(`+${value}% ${stat}`);
    }
  }

  return lines;
}
