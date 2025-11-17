/**
 * Configuration des classes jouables
 * 
 * NOTE DEV - Rôles et spécialités par classe (pour référence) :
 * 
 * - Paladin : Tank/Healer/Mélée. Polyvalent en survie et soutien, armure lourde.
 * - Chasseur : DPS distance physique. Mobilité, pièges, contrôle de zones.
 * - Mage : DPS distance magique. Burst élevé, contrôle de foule, AoE.
 * - Prêtre : Healer/Support. Soins puissants, buffs d'équipe, résurrection.
 * - Voleur : DPS mélée agile burst. Furtivité, combos rapides, critiques.
 * - Démoniste : Caster ombre/DOT/Invocations. Drain de vie, contrôle via pets.
 */

export type ClassRole = "TANK" | "DPS" | "HEALER" | "SUPPORT";

export interface ClassConfig {
  classId: string;          // ID unique (ex: "paladin")
  nameKey: string;          // Clé de traduction pour le nom (ex: "class.paladin.name")
  descriptionKey: string;   // Clé de traduction pour la description (ex: "class.paladin.description")
  roles: ClassRole[];       // Rôles possibles (ex: ["TANK", "HEALER"])
  
  // Les stats de base seront ajoutées ici plus tard
  // baseStats?: { [stat: string]: number }; // Ex: { STR: 15, INT: 10, VIT: 20 }
}

/**
 * Toutes les classes disponibles
 */
export const ALL_CLASSES: ClassConfig[] = [
  {
    classId: "paladin",
    nameKey: "class.paladin.name",
    descriptionKey: "class.paladin.description",
    roles: ["TANK", "HEALER"]
  },
  {
    classId: "hunter",
    nameKey: "class.hunter.name",
    descriptionKey: "class.hunter.description",
    roles: ["DPS"]
  },
  {
    classId: "mage",
    nameKey: "class.mage.name",
    descriptionKey: "class.mage.description",
    roles: ["DPS"]
  },
  {
    classId: "priest",
    nameKey: "class.priest.name",
    descriptionKey: "class.priest.description",
    roles: ["HEALER", "SUPPORT"]
  },
  {
    classId: "rogue",
    nameKey: "class.rogue.name",
    descriptionKey: "class.rogue.description",
    roles: ["DPS"]
  },
  {
    classId: "warlock",
    nameKey: "class.warlock.name",
    descriptionKey: "class.warlock.description",
    roles: ["DPS", "SUPPORT"]
  }
];

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
