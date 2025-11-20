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
  nameKey: string;          // Clé de traduction pour le nom (ex: "class.priest.name")
  descriptionKey: string;   // Clé de traduction pour la description (ex: "class.priest.description")
  roles: ClassRole[];       // Rôles possibles (ex: ["HEALER", "SUPPORT"])
  
  // Les stats de base seront ajoutées ici plus tard
  // baseStats?: { [stat: string]: number }; // Ex: { STR: 15, INT: 10, VIT: 20 }
}

/**
 * Toutes les classes disponibles
 */
export const ALL_CLASSES: ClassConfig[] = [
  {
    classId: "priest",
    nameKey: "class.priest.name",
    descriptionKey: "class.priest.description",
    roles: ["HEALER", "SUPPORT"]
  },
  {
    classId: "mage",
    nameKey: "class.mage.name",
    descriptionKey: "class.mage.description",
    roles: ["DPS"]
  },
  {
    classId: "paladin",
    nameKey: "class.paladin.name",
    descriptionKey: "class.paladin.description",
    roles: ["TANK", "HEALER"]
  },
  {
    classId: "rogue",
    nameKey: "class.rogue.name",
    descriptionKey: "class.rogue.description",
    roles: ["DPS"]
  },
  {
    classId: "warrior",
    nameKey: "class.warrior.name",
    descriptionKey: "class.warrior.description",
    roles: ["TANK", "DPS"]
  },
  {
    classId: "druid",
    nameKey: "class.druid.name",
    descriptionKey: "class.druid.description",
    roles: ["SUPPORT", "HEALER", "DPS"]
  }
];

/**
 * Restrictions de classe par race
 * Format: { raceId: [classIds autorisées] }
 * Si une race n'est pas listée ici, toutes les classes sont autorisées
 */
export const CLASS_RACE_RESTRICTIONS: { [raceId: string]: string[] } = {
  // Arkanids (Undeads)
  "arkanids_insect": ["mage", "priest", "rogue", "warrior"],

  // Elion Humans (Humains)
  "human_elion": ["mage", "priest", "rogue", "warrior", "paladin"],

  // Ghrannite Orcs (Orcs)
  "ghrannite_stone": ["rogue", "warrior"],

  // Murlocs (Gnomes)
  "murlocs": ["rogue", "warrior", "paladin"],

  // Noxariens (Elfes de la nuit)
  "sylphide_forest": ["mage", "druid"],

  // Runic Dwarfs (Nains)
  "dwarf_rune": ["priest", "warrior", "paladin"],

  // Selenith Trolls (Trolls)
  "selenite_lunar": ["mage", "priest", "rogue", "druid"],

  // Varkyns (Taurens)
  "varkyns_beast": ["warrior", "paladin", "druid"]
};

/**
 * Vérifie si une combinaison classe/race est autorisée
 */
export function isClassAllowedForRace(classId: string, raceId: string): boolean {
  // Si la race n'a pas de restrictions définies, toutes les classes sont autorisées
  const allowedClasses = CLASS_RACE_RESTRICTIONS[raceId];
  
  if (!allowedClasses) {
    return true; // Pas de restrictions pour cette race
  }
  
  // Vérifier si la classe est dans la liste autorisée
  return allowedClasses.includes(classId);
}

/**
 * Récupère les classes autorisées pour une race donnée
 */
export function getAllowedClassesForRace(raceId: string): ClassConfig[] {
  const allowedClassIds = CLASS_RACE_RESTRICTIONS[raceId];
  
  // Si pas de restrictions, retourner toutes les classes
  if (!allowedClassIds) {
    return ALL_CLASSES;
  }
  
  // Filtrer les classes autorisées
  return ALL_CLASSES.filter(cls => allowedClassIds.includes(cls.classId));
}

/**
 * Map des classes par ID pour accès rapide
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
 * Récupère les classes par rôle
 */
export function getClassesByRole(role: ClassRole): ClassConfig[] {
  return ALL_CLASSES.filter(cls => cls.roles.includes(role));
}

/**
 * Liste de tous les classIds valides
 */
export const VALID_CLASS_IDS = ALL_CLASSES.map(c => c.classId);
