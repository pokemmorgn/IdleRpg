/**
 * Configuration des races jouables
 * Organisées par faction
 * 
 * NOTE DEV - Traits physiques et culture par race (pour référence) :
 * 
 * AURION
 * - Humains d'Élion : Architecture dorée, traits nobles, peau claire à bronze. Société centrée sur l'honneur, la connaissance et la stabilité.
 * - Nains de Pierre-Rune : Corpulence robuste, motifs runiques naturels, barbes ornementales. Forteresses souterraines, culture du métal et des runes.
 * - Murlocs
 * - Noxariens

 * OMBRE :
 * - Varkyns : Cornes asymétriques fractales, fourrure sombre, symboles rituels, silhouette élancée. Culture chamanique ancienne.
 * - Arkanids : Peau matte (bleu nuit, violet, noir), membres fins, yeux réfléchissants, ornements chitineux. Chasseurs furtifs nocturnes.
 * - Ghrannites orcs : Peau de pierre (granite, basalte, obsidienne), yeux de cristal, corps imposants. Culture souterraine liée à la chaleur.
 * - Sélénithes trolls : Peau noire ou gris bleu profond, cheveux blancs/argentés, pupilles verticales lumineuses. Magie lunaire sombre.
 */

import { IPlayerPrimaryStats, IPlayerComputedStats } from "../models/ServerProfile";

// ======================
// TYPES
// ======================

export type Faction = "AURION" | "OMBRE";

/**
 * Bonus raciaux
 * - Certains apportent des bonus primaires (STR/AGI…)
 * - D'autres affectent des stats secondaires (AP, armor, crit…)
 * - Aucun bonus n'est obligatoire
 */
export interface RaceStatsModifiers {
  primary?: Partial<IPlayerPrimaryStats>;
  computed?: Partial<IPlayerComputedStats>;
}

/**
 * Structure d'une race jouable
 */
export interface RaceConfig {
  raceId: string;
  nameKey: string;
  descriptionKey: string;
  loreKey: string;                // AJOUT : clé texte lore approfondi
  faction: Faction;
  statsModifiers?: RaceStatsModifiers;  // AJOUT : bonus raciaux optionnels
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
    statsModifiers: {}
  },
  {
    raceId: "dwarf_rune",
    nameKey: "race.dwarf_rune.name",
    descriptionKey: "race.dwarf_rune.description",
    loreKey: "race.dwarf_rune.lore",
    faction: "AURION",
    statsModifiers: {}
  },
  {
    raceId: "murlocs",
    nameKey: "race.murlocs.name",
    descriptionKey: "race.murlocs.description",
    loreKey: "race.murlocs.lore",
    faction: "AURION",
    statsModifiers: {}
  },
  {
    raceId: "sylphide_forest",
    nameKey: "race.sylphide_forest.name",
    descriptionKey: "race.sylphide_forest.description",
    loreKey: "race.sylphide_forest.lore",
    faction: "AURION",
    statsModifiers: {}
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
    statsModifiers: {}
  },
  {
    raceId: "arkanids_insect",
    nameKey: "race.arkanids_insect.name",
    descriptionKey: "race.arkanids_insect.description",
    loreKey: "race.arkanids_insect.lore",
    faction: "OMBRE",
    statsModifiers: {}
  },
  {
    raceId: "ghrannite_stone",
    nameKey: "race.ghrannite_stone.name",
    descriptionKey: "race.ghrannite_stone.description",
    loreKey: "race.ghrannite_stone.lore",
    faction: "OMBRE",
    statsModifiers: {}
  },
  {
    raceId: "selenite_lunar",
    nameKey: "race.selenite_lunar.name",
    descriptionKey: "race.selenite_lunar.description",
    loreKey: "race.selenite_lunar.lore",
    faction: "OMBRE",
    statsModifiers: {}
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

/** Vérifie si un raceId est valide */
export function isValidRace(raceId: string): boolean {
  return RACES_BY_ID.has(raceId);
}

/** Récupère une race */
export function getRaceById(raceId: string): RaceConfig | undefined {
  return RACES_BY_ID.get(raceId);
}

/** Filtrage par faction */
export function getRacesByFaction(faction: Faction): RaceConfig[] {
  return ALL_RACES.filter(r => r.faction === faction);
}

// ======================
// UTILITAIRE CLIENT
// ======================

/**
 * Transforme les bonus raciaux en texte lisible
 * (pour affichage côté client)
 */
export function getReadableRaceBonuses(race: RaceConfig): string[] {
  if (!race.statsModifiers) return [];

  const lines: string[] = [];

  // Stats primaires
  if (race.statsModifiers.primary) {
    for (const [stat, value] of Object.entries(race.statsModifiers.primary)) {
      if (value === 0 || value === undefined) continue;
      const prefix = value > 0 ? "+" : "";
      lines.push(`${prefix}${value} ${stat}`);
    }
  }

  // Stats secondaires
  if (race.statsModifiers.computed) {
    for (const [stat, value] of Object.entries(race.statsModifiers.computed)) {
      if (value === 0 || value === undefined) continue;
      const prefix = value > 0 ? "+" : "";
      lines.push(`${prefix}${value} ${stat}`);
    }
  }

  return lines;
}
