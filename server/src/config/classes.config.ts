/**
 * Configuration des classes jouables
 * 
 * NOTE DEV - Rôles et spécialités par classe (pour référence) :
 * 
 * - Prêtre (Priest) : Healer/Support. Soins puissants, buffs d'équipe, résurrection.
 * - Mage : DPS distance magique. Burst élevé, contrôle de foule, AoE.
 * - Paladin : Tank/Healer/Mélée. Polyvalent en survie et soutien, armure lourde.
 * - Voleur (Rogue) : DPS mélée agile burst. Furtivité, combos rapides, critiques.
 * - Guerrier (Warrior) : Tank/DPS mélée. Haute survie, contrôle, dégâts physiques.
 * - Druide (Druid) : Support/Healer/DPS hybride. Transformation, polyvalence, magie nature.
 */

export type ClassRole = "TANK" | "DPS" | "HEALER" | "SUPPORT";

export interface ClassConfig {
  classId: string;          // ID unique (ex: "priest")
  nameKey: string;          // Clé nom
  descriptionKey: string;   // Clé description
  loreKey: string;          // <-- AJOUT : Lore approfondi
  roles: ClassRole[];       // Rôles possibles
  
  // Les stats de base seront ajoutées ici plus tard
  // baseStats?: { [stat: string]: number };
}

/**
 * Toutes les classes disponibles
 */
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

/**
 * Restrictions de classe par race
 * Format: { raceId: [classIds autorisées] }
 */
export const CLASS_RACE_RESTRICTIONS: { [raceId: string]: string[] } = {
  "arkanyds": ["mage", "priest", "rogue", "warrior"],
  "humans":     ["mage", "priest", "rogue", "warrior", "paladin"],
  "orcs": ["rogue", "warrior"],
  "murlocs":         ["rogue", "warrior", "paladin"],
  "noxariens": ["mage", "druid"],
  "dwarfs":      ["priest", "warrior", "paladin"],
  "trolls":  ["mage", "priest", "rogue", "druid"],
  "varkyns":   ["warrior", "paladin", "druid"]
};

/**
 * Vérifie si une combinaison classe/race est autorisée
 */
export function isClassAllowedForRace(classId: string, raceId: string): boolean {
  const allowedClasses = CLASS_RACE_RESTRICTIONS[raceId];
  if (!allowedClasses) return true;
  return allowedClasses.includes(classId);
}

/**
 * Récupère les classes autorisées pour une race donnée
 */
export function getAllowedClassesForRace(raceId: string): ClassConfig[] {
  const allowedClassIds = CLASS_RACE_RESTRICTIONS[raceId];
  if (!allowedClassIds) return ALL_CLASSES;
  return ALL_CLASSES.filter(cls => allowedClassIds.includes(cls.classId));
}

/**
 * Map des classes par ID
 */
export const CLASSES_BY_ID: Map<string, ClassConfig> = new Map(
  ALL_CLASSES.map(cls => [cls.classId, cls])
);

/**
 * Vérifie si un classId est valide
 */
export function isValidClass(classId: string): boolean {
  return CLASSES_BY_ID.has(classId);
}

/**
 * Récupère une classe par son ID
 */
export function getClassById(classId: string): ClassConfig | undefined {
  return CLASSES_BY_ID.get(classId);
}

/**
 * Classes par rôle
 */
export function getClassesByRole(role: ClassRole): ClassConfig[] {
  return ALL_CLASSES.filter(cls => cls.roles.includes(role));
}

/**
 * Liste des IDs valides
 */
export const VALID_CLASS_IDS = ALL_CLASSES.map(c => c.classId);
