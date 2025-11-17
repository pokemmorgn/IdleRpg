/**
 * Configuration des races jouables
 * Organisées par faction
 * 
 * NOTE DEV - Traits physiques et culture par race (pour référence) :
 * 
 * AURION :
 * - Humains d'Élion : Architecture dorée, traits nobles, peau claire à bronze. Société centrée sur l'honneur, la connaissance et la stabilité.
 * - Nains de Pierre-Rune : Corpulence robuste, motifs runiques naturels, barbes ornementales. Forteresses souterraines, culture du métal et des runes.
 * - Ailés Lunaris : Silhouette élancée, petites ailes dorsales, peau claire avec reflets bleutés. Connexion à la magie stellaire et astrale.
 * - Sylphides Forestiers : Peau légèrement écorcée, oreilles longues, silhouette fine. Magie végétale, gardiens des bois anciens.
 * 
 * OMBRE :
 * - Varkyns : Cornes asymétriques fractales, fourrure sombre, symboles rituels, silhouette élancée. Culture chamanique ancienne.
 * - Morhri : Peau matte (bleu nuit, violet, noir), membres fins, yeux réfléchissants, ornements chitineux. Chasseurs furtifs nocturnes.
 * - Ghrannites : Peau de pierre (granite, basalte, obsidienne), yeux de cristal, corps imposants. Culture souterraine liée à la chaleur.
 * - Sélénithes : Peau noire ou gris bleu profond, cheveux blancs/argentés, pupilles verticales lumineuses. Magie lunaire sombre.
 */

export type Faction = "AURION" | "OMBRE";

export interface RaceConfig {
  raceId: string;           // ID unique (ex: "human_elion")
  nameKey: string;          // Clé de traduction pour le nom (ex: "race.human_elion.name")
  descriptionKey: string;   // Clé de traduction pour la description (ex: "race.human_elion.description")
  faction: Faction;         // Faction d'appartenance
  
  // Les bonus/malus de stats seront ajoutés ici plus tard
  // statsModifiers?: { [stat: string]: number }; // Ex: { STR: 10, INT: -5 }
}

/**
 * ===== FACTION AURION =====
 * Thème : civilisations lumineuses, érudites, protectrices
 * Identité : ordre, magie pure, architecture raffinée, harmonie
 */

const AURION_RACES: RaceConfig[] = [
  {
    raceId: "human_elion",
    nameKey: "race.human_elion.name",
    descriptionKey: "race.human_elion.description",
    faction: "AURION"
  },
  {
    raceId: "dwarf_rune",
    nameKey: "race.dwarf_rune.name",
    descriptionKey: "race.dwarf_rune.description",
    faction: "AURION"
  },
  {
    raceId: "winged_lunaris",
    nameKey: "race.winged_lunaris.name",
    descriptionKey: "race.winged_lunaris.description",
    faction: "AURION"
  },
  {
    raceId: "sylphide_forest",
    nameKey: "race.sylphide_forest.name",
    descriptionKey: "race.sylphide_forest.description",
    faction: "AURION"
  }
];

/**
 * ===== FACTION OMBRE-COURONNE =====
 * Thème : peuples sombres, sauvages, occultes, environnements extrêmes
 * Identité : survie, instinct, magie instable, rites anciens, nocturnité
 */

const OMBRE_RACES: RaceConfig[] = [
  {
    raceId: "varkyns_beast",
    nameKey: "race.varkyns_beast.name",
    descriptionKey: "race.varkyns_beast.description",
    faction: "OMBRE"
  },
  {
    raceId: "morhri_insect",
    nameKey: "race.morhri_insect.name",
    descriptionKey: "race.morhri_insect.description",
    faction: "OMBRE"
  },
  {
    raceId: "ghrannite_stone",
    nameKey: "race.ghrannite_stone.name",
    descriptionKey: "race.ghrannite_stone.description",
    faction: "OMBRE"
  },
  {
    raceId: "selenite_lunar",
    nameKey: "race.selenite_lunar.name",
    descriptionKey: "race.selenite_lunar.description",
    faction: "OMBRE"
  }
];

/**
 * Toutes les races disponibles
 */
export const ALL_RACES: RaceConfig[] = [
  ...AURION_RACES,
  ...OMBRE_RACES
];

/**
 * Map des races par ID pour accès rapide
 */
export const RACES_BY_ID: Map<string, RaceConfig> = new Map(
  ALL_RACES.map(race => [race.raceId, race])
);

/**
 * Récupère les races d'une faction
 */
export function getRacesByFaction(faction: Faction): RaceConfig[] {
  return ALL_RACES.filter(race => race.faction === faction);
}

/**
 * Vérifie si un raceId est valide
 */
export function isValidRace(raceId: string): boolean {
  return RACES_BY_ID.has(raceId);
}

/**
 * Récupère une race par son ID
 */
export function getRaceById(raceId: string): RaceConfig | undefined {
  return RACES_BY_ID.get(raceId);
}

/**
 * Liste de tous les raceIds valides
 */
export const VALID_RACE_IDS = ALL_RACES.map(r => r.raceId);
