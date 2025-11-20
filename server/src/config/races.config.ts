// ============================================================================
// RACES CONFIGURATION (format final compatible Unity)
// ============================================================================

export type Faction = "AURION" | "OMBRE";

export interface RaceStatsModifiers {
  primaryPercent?: Record<string, number>;
  computedPercent?: Record<string, number>;
}

export interface RaceConfig {
  raceId: string;
  nameKey: string;
  descriptionKey: string;
  loreKey: string;
  faction: Faction;

  // Format 100% Unity-friendly
  statsModifiers: RaceStatsModifiers;
}

// ============================================================================
// RACES
// ============================================================================

export const ALL_RACES: RaceConfig[] = [
  {
    raceId: "human_elion",
    nameKey: "race.human_elion.name",
    descriptionKey: "race.human_elion.description",
    loreKey: "race.human_elion.lore",
    faction: "AURION",
    statsModifiers: {
      primaryPercent: { intelligence: 5 },
      computedPercent: { manaRegen: 5 }
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
      primaryPercent: { spirit: 5 },
      computedPercent: { magicResistance: 5 }
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
      computedPercent: { armor: 5 }
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
      primaryPercent: { wisdom: 5 },
      computedPercent: { spellPower: 5 }
    }
  }
];

// ============================================================================
// HELPERS
// ============================================================================

export const getRaceById = (id: string) =>
  ALL_RACES.find(r => r.raceId === id);

export const isValidRace = (id: string) =>
  ALL_RACES.some(r => r.raceId === id);

export const getRacesByFaction = (faction: Faction) =>
  ALL_RACES.filter(r => r.faction === faction);
