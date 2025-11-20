/**
 * Configuration des races jouables
 * Organisées par faction
 * 
 * NOTE DEV - Traits physiques (pour inspiration des bonus) :
 * 
 * AURION :
 * - Humains d'Élion : équilibrés, endurance et esprit supérieurs.
 * - Nains de Pierre-Rune : robustesse, armure naturelle.
 * - Murlocs : agiles, instincts rapides.
 * - Sylphides : magie naturelle, forte affinité au mana.
 *
 * OMBRE :
 * - Varkyns : massifs, force brute, grande vitalité.
 * - Arkanids : rapides, réflexes d’insectoïde, vitesse d’attaque.
 * - Ghrannites : peau de pierre, réduction des dégâts.
 * - Sélénithes : magie obscure, puissance magique et résistance.
 */

import { IPlayerPrimaryStats, IPlayerComputedStats } from "../models/ServerProfile";

// ======================
// TYPES
// ======================

export type Faction = "AURION" | "OMBRE";

/**
 * Bonus raciaux en pourcentage (ex: { strength: 5 })
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
      primaryPercent: {
        endurance: 5,
        spirit: 5
      }
    }
  },
  {
    raceId: "dwarf_rune",
    nameKey: "race.dwarf_rune.name",
    descriptionKey: "race.dwarf_rune.description",
    loreKey: "race.dwarf_rune.lore",
    faction: "AURION",
    statsModifiers: {
      computedPercent: {
        maxHp: 5,
        armor: 5
      }
    }
  },
  {
    raceId: "murlocs",
    nameKey: "race.murlocs.name",
    descriptionKey: "race.murlocs.description",
    loreKey: "race.murlocs.lore",
    faction: "AURION",
    statsModifiers: {
      primaryPercent: {
        agility: 5
      },
      computedPercent: {
        evasion: 5
      }
    }
  },
  {
    raceId: "sylphide_forest",
    nameKey: "race.sylphide_forest.name",
    descriptionKey: "race.sylphide_forest.description",
    loreKey: "race.sylphide_forest.lore",
    faction: "AURION",
    statsModifiers: {
      primaryPercent: {
        intelligence: 5
      },
      computedPercent: {
        manaRegen: 5
      }
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

/** Liste complète */
export const ALL_RACES: RaceConfig[] = [...AURION_RACES, ...OMBRE_RACES];

/** Map par ID */
export const RACES_BY_ID = new Map<string, RaceConfig>(
  ALL_RACES.map(r => [r.raceId, r])
);

/** Liste des IDs valides */
export const VALID_RACE_IDS = ALL_RACES.map(r => r.raceId);

/** Vérifie si un raceId est valide */
export function isValidRace(raceId: string): boolean {
  return RACES_BY_ID.has(raceId);
}

/** Récupère une race */
export function getRaceById(raceId: string): RaceConfig | undefined {
  return RACES_BY_ID.get(raceId);
}

/** Filtrer par faction */
export function getRacesByFaction(faction: Faction): RaceConfig[] {
  return ALL_RACES.filter(r => r.faction === faction);
}

/**
 * Transforme les bonus raciaux en texte lisible pour le client
 */
export function getReadableRaceBonuses(race: RaceConfig): string[] {
  if (!race.statsModifiers) return [];

  const lines: string[] = [];
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
