/**
 * Configuration des classes jouables
 *
 * NOTE DEV - Rôles et spécialités par classe :
 * - Priest : Healer / Support
 * - Mage : DPS distance
 * - Paladin : Tank / Healer
 * - Rogue : DPS mélée
 * - Warrior : Tank / DPS
 * - Druid : Support / Healer / DPS nature
 */

// =============================================================
// TYPES
// =============================================================
export type ClassRole = "TANK" | "DPS" | "HEALER" | "SUPPORT";

export interface ClassConfig {
  classId: string;
  nameKey: string;
  descriptionKey: string;
  loreKey: string;
  roles: ClassRole[];
}

// =============================================================
// ALL CLASSES
// =============================================================
export const ALL_CLASSES: ClassConfig[] = [
  {
    classId: "priest",
    nameKey: "class.priest.name",
    descriptionKey: "class.priest.description",
    loreKey: "class.priest.lore",
    roles: ["HEALER", "SUPPORT"]
  },
  {
    classId: "mage",
    nameKey: "class.mage.name",
    descriptionKey: "class.mage.description",
    loreKey: "class.mage.lore",
    roles: ["DPS"]
  },
  {
    classId: "paladin",
    nameKey: "class.paladin.name",
    descriptionKey: "class.paladin.description",
    loreKey: "class.paladin.lore",
    roles: ["TANK", "HEALER"]
  },
  {
    classId: "rogue",
    nameKey: "class.rogue.name",
    descriptionKey: "class.rogue.description",
    loreKey: "class.rogue.lore",
    roles: ["DPS"]
  },
  {
    classId: "warrior",
    nameKey: "class.warrior.name",
    descriptionKey: "class.warrior.description",
    loreKey: "class.warrior.lore",
    roles: ["TANK", "DPS"]
  },
  {
    classId: "druid",
    nameKey: "class.druid.name",
    descriptionKey: "class.druid.description",
    loreKey: "class.druid.lore",
    roles: ["SUPPORT", "HEALER", "DPS"]
  }
];

// =============================================================
// MAP PAR ID
// =============================================================
export const CLASSES_BY_ID: Map<string, ClassConfig> = new Map(
  ALL_CLASSES.map(cls => [cls.classId, cls])
);

// =============================================================
// VALID CLASS IDS
// =============================================================
export const VALID_CLASS_IDS = ALL_CLASSES.map(c => c.classId);

// =============================================================
// RESTRICTIONS PAR RACE
// =============================================================
export const CLASS_RACE_RESTRICTIONS: { [raceId: string]: string[] } = {
  arkanyds: ["mage", "priest", "rogue", "warrior"],
  humans: ["mage", "priest", "rogue", "warrior", "paladin"],
  orcs: ["rogue", "warrior"],
  murlocs: ["rogue", "warrior", "paladin"],
  noxariens: ["mage", "druid"],
  dwarfs: ["priest", "warrior", "paladin"],
  trolls: ["mage", "priest", "rogue", "druid"],
  varkyns: ["warrior", "paladin", "druid"]
};

// =============================================================
// FUNCTIONS : VALIDATION
// =============================================================

/** Retourne true si une classe existe */
export function isValidClass(classId: string): boolean {
  return VALID_CLASS_IDS.includes(classId);
}

/** Retourne true si une classe est autorisée pour une race */
export function isClassAllowedForRace(classId: string, raceId: string): boolean {
  const allowed = CLASS_RACE_RESTRICTIONS[raceId];
  if (!allowed) return true;
  return allowed.includes(classId);
}

/** Liste des classes autorisées par race */
export function getAllowedClassesForRace(raceId: string): ClassConfig[] {
  const allowed = CLASS_RACE_RESTRICTIONS[raceId];
  if (!allowed) return ALL_CLASSES;
  return ALL_CLASSES.filter(c => allowed.includes(c.classId));
}

/** Liste des classes par rôle */
export function getClassesByRole(role: ClassRole): ClassConfig[] {
  return ALL_CLASSES.filter(c => c.roles.includes(role));
}

/** Récupère une classe par ID */
export function getClassById(classId: string): ClassConfig | undefined {
  return CLASSES_BY_ID.get(classId);
}

// =============================================================
// STATS PAR CLASSE (POUR PlayerStatsCalculator)
// =============================================================

export interface ClassStats {
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
  baseMoveSpeed: number;
  resourceType: "mana" | "rage" | "energy";
}

/**
 * Données de statistiques de base par classe.
 * → Simplifiées mais cohérentes.
 */
export const CLASS_STATS: Record<string, ClassStats> = {
  priest: {
    baseStats: { strength: 3, agility: 3, intelligence: 8, endurance: 5, spirit: 8 },
    statsPerLevel: { strength: 1, agility: 1, intelligence: 2, endurance: 2, spirit: 2 },
    baseMoveSpeed: 2.5,
    resourceType: "mana"
  },
  mage: {
    baseStats: { strength: 2, agility: 4, intelligence: 10, endurance: 4, spirit: 6 },
    statsPerLevel: { strength: 1, agility: 1, intelligence: 3, endurance: 1, spirit: 2 },
    baseMoveSpeed: 2.4,
    resourceType: "mana"
  },
  paladin: {
    baseStats: { strength: 7, agility: 3, intelligence: 4, endurance: 8, spirit: 6 },
    statsPerLevel: { strength: 2, agility: 1, intelligence: 1, endurance: 3, spirit: 1 },
    baseMoveSpeed: 2.3,
    resourceType: "mana"
  },
  rogue: {
    baseStats: { strength: 5, agility: 10, intelligence: 3, endurance: 5, spirit: 2 },
    statsPerLevel: { strength: 1, agility: 3, intelligence: 1, endurance: 2, spirit: 1 },
    baseMoveSpeed: 3.0,
    resourceType: "energy"
  },
  warrior: {
    baseStats: { strength: 9, agility: 4, intelligence: 2, endurance: 10, spirit: 2 },
    statsPerLevel: { strength: 3, agility: 1, intelligence: 1, endurance: 3, spirit: 1 },
    baseMoveSpeed: 2.2,
    resourceType: "rage"
  },
  druid: {
    baseStats: { strength: 4, agility: 4, intelligence: 8, endurance: 6, spirit: 8 },
    statsPerLevel: { strength: 1, agility: 1, intelligence: 2, endurance: 2, spirit: 2 },
    baseMoveSpeed: 2.6,
    resourceType: "mana"
  }
};

/**
 * getStatsForClass — renvoie les stats complètes d'une classe
 */
export function getStatsForClass(classId: string): ClassStats {
  const stats = CLASS_STATS[classId];
  if (!stats) {
    throw new Error(`getStatsForClass: Classe inconnue ${classId}`);
  }
  return stats;
}
