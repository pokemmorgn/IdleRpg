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
    raceId: "humans",
    nameKey: "race.humans.name",
    descriptionKey: "race.humans.description",
    loreKey: "race.humans.lore",
    faction: "AURION",
    statsModifiers: {
      primaryPercent: { intelligence: 5 },
      computedPercent: { manaRegen: 5 }
    }
  },

  {
    raceId: "dwarfs",
    nameKey: "race.dwarfs.name",
    descriptionKey: "race.dwarfs.description",
    loreKey: "race.dwarfs.lore",
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
    raceId: "noxariens",
    nameKey: "race.noxariens.name",
    descriptionKey: "race.noxariens.description",
    loreKey: "race.noxariens.lore",
    faction: "AURION",
    statsModifiers: {
      primaryPercent: { spirit: 5 },
      computedPercent: { magicResistance: 5 }
    }
  },

  {
    raceId: "varkyns",
    nameKey: "race.varkyns.name",
    descriptionKey: "race.varkyns.description",
    loreKey: "race.varkyns.lore",
    faction: "OMBRE",
    statsModifiers: {
      primaryPercent: { strength: 5 },
      computedPercent: { armor: 5 }
    }
  },

  {
    raceId: "arkanyds",
    nameKey: "race.arkanyds.name",
    descriptionKey: "race.arkanyds.description",
    loreKey: "race.arkanyds.lore",
    faction: "OMBRE",
    statsModifiers: {
      primaryPercent: { agility: 5 },
      computedPercent: { attackSpeed: 5 }
    }
  },

  {
    raceId: "orcs",
    nameKey: "race.orcs.name",
    descriptionKey: "race.orcs.description",
    loreKey: "race.orcs.lore",
    faction: "OMBRE",
    statsModifiers: {
      primaryPercent: { endurance: 5 },
      computedPercent: { damageReduction: 5 }
    }
  },

  {
    raceId: "trolls",
    nameKey: "race.trolls.name",
    descriptionKey: "race.trolls.description",
    loreKey: "race.trolls.lore",
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
