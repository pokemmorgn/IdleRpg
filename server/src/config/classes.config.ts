/**
 * CONFIGURATION DES CLASSES — VERSION UNIFIÉE
 * Contient :
 * - Lore / description
 * - Rôles
 * - Restrictions race/classes (optionnel, tu peux déplacer)
 * - Stats de base
 * - Stats par niveau
 * - MoveSpeed
 * - ResourceType
 * - getStatsForClass()
 */

export type ClassRole = "TANK" | "DPS" | "HEALER" | "SUPPORT";

export interface ClassConfig {
  classId: string;
  nameKey: string;
  descriptionKey: string;
  loreKey: string;
  roles: ClassRole[];

  // Ajout : stats de combat
  baseStats: {
    strength: number;
    agility: number;
    intelligence: number;
    endurance: number;
    spirit: number;
  };

  statsPerLevel: {
    strength: number;
    agility: number;
    intelligence: number;
    endurance: number;
    spirit: number;
  };

  baseMoveSpeed: number;       // déplacement
  resourceType: "mana" | "rage" | "energy";
}

// =============================================================
// LISTE DES CLASSES — UNIFIÉE
// =============================================================
export const ALL_CLASSES: ClassConfig[] = [
  {
    classId: "priest",
    nameKey: "class.priest.name",
    descriptionKey: "class.priest.description",
    loreKey: "class.priest.lore",
    roles: ["HEALER", "SUPPORT"],

    baseStats: { strength: 2, agility: 4, intelligence: 10, endurance: 6, spirit: 12 },
    statsPerLevel: { strength: 0.5, agility: 1, intelligence: 2, endurance: 1, spirit: 2 },
    baseMoveSpeed: 2.8,
    resourceType: "mana"
  },

  {
    classId: "mage",
    nameKey: "class.mage.name",
    descriptionKey: "class.mage.description",
    loreKey: "class.mage.lore",
    roles: ["DPS"],

    baseStats: { strength: 2, agility: 5, intelligence: 12, endurance: 5, spirit: 8 },
    statsPerLevel: { strength: 0.5, agility: 1, intelligence: 2.5, endurance: 1, spirit: 1.5 },
    baseMoveSpeed: 2.7,
    resourceType: "mana"
  },

  {
    classId: "paladin",
    nameKey: "class.paladin.name",
    descriptionKey: "class.paladin.description",
    loreKey: "class.paladin.lore",
    roles: ["TANK", "HEALER"],

    baseStats: { strength: 8, agility: 4, intelligence: 6, endurance: 10, spirit: 10 },
    statsPerLevel: { strength: 1.5, agility: 1, intelligence: 1.5, endurance: 2, spirit: 2 },
    baseMoveSpeed: 2.6,
    resourceType: "mana"
  },

  {
    classId: "rogue",
    nameKey: "class.rogue.name",
    descriptionKey: "class.rogue.description",
    loreKey: "class.rogue.lore",
    roles: ["DPS"],

    baseStats: { strength: 5, agility: 12, intelligence: 3, endurance: 7, spirit: 4 },
    statsPerLevel: { strength: 1, agility: 2, intelligence: 0.5, endurance: 1.5, spirit: 0.7 },
    baseMoveSpeed: 3.2,
    resourceType: "energy"
  },

  {
    classId: "warrior",
    nameKey: "class.warrior.name",
    descriptionKey: "class.warrior.description",
    loreKey: "class.warrior.lore",
    roles: ["TANK", "DPS"],

    baseStats: { strength: 10, agility: 5, intelligence: 2, endurance: 12, spirit: 3 },
    statsPerLevel: { strength: 2, agility: 1, intelligence: 0.5, endurance: 2, spirit: 0.5 },
    baseMoveSpeed: 2.5,
    resourceType: "rage"
  },

  {
    classId: "druid",
    nameKey: "class.druid.name",
    descriptionKey: "class.druid.description",
    loreKey: "class.druid.lore",
    roles: ["SUPPORT", "HEALER", "DPS"],

    baseStats: { strength: 3, agility: 5, intelligence: 10, endurance: 7, spirit: 10 },
    statsPerLevel: { strength: 0.8, agility: 1, intelligence: 2, endurance: 1.2, spirit: 2 },
    baseMoveSpeed: 2.9,
    resourceType: "mana"
  }
];

// =============================================================
// MAP
// =============================================================
export const CLASSES_BY_ID = new Map(
  ALL_CLASSES.map(cls => [cls.classId, cls])
);

// =============================================================
// getStatsForClass — REQUIS PAR PlayerStatsCalculator
// =============================================================
export function getStatsForClass(classId: string): ClassConfig {
  const cls = CLASSES_BY_ID.get(classId);
  if (!cls) throw new Error(`Classe inconnue: ${classId}`);
  return cls;
}
