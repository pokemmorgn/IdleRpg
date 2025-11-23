/**
 * TITLES CONFIGURATION
 * --------------------
 * Système simple : un titre = un bonus passif + un niveau requis
 * Les stats s'appliquent même si le titre n'est pas équipé (débloqué = actif).
 */

export interface TitleStatsModifiers {
  primaryPercent?: Record<string, number>;
  computedPercent?: Record<string, number>;
}

export interface TitleConfig {
  titleId: string;            // ID unique du titre
  nameKey: string;            // Traduction nom
  descriptionKey: string;     // Traduction description
  requiredLevel: number;      // Niveau nécessaire pour débloquer
  statsModifiers: TitleStatsModifiers;
}

/**
 * LISTE DES TITRES
 */
export const ALL_TITLES: TitleConfig[] = [

  // ---------------------------------------------------------------------------
  // TITRES COMMUNS
  // ---------------------------------------------------------------------------
  {
    titleId: "title_beginner",
    nameKey: "title.beginner.name",
    descriptionKey: "title.beginner.description",
    requiredLevel: 1,
    statsModifiers: {
      computedPercent: { moveSpeed: 2 }
    }
  },
  {
    titleId: "title_brave_warrior",
    nameKey: "title.brave_warrior.name",
    descriptionKey: "title.brave_warrior.description",
    requiredLevel: 10,
    statsModifiers: {
      primaryPercent: { strength: 3 },
      computedPercent: { maxHp: 3 }
    }
  },

  // ---------------------------------------------------------------------------
  // TITRES RARES
  // ---------------------------------------------------------------------------
  {
    titleId: "title_arcane_seeker",
    nameKey: "title.arcane_seeker.name",
    descriptionKey: "title.arcane_seeker.description",
    requiredLevel: 15,
    statsModifiers: {
      primaryPercent: { intelligence: 4 },
      computedPercent: { manaRegen: 4 }
    }
  }
];

// ============================================================================
// HELPERS
// ============================================================================
export const TITLES_BY_ID: Map<string, TitleConfig> =
  new Map(ALL_TITLES.map(t => [t.titleId, t]));

export function isValidTitleId(id: string): boolean {
  return TITLES_BY_ID.has(id);
}

export function getTitleById(id: string): TitleConfig | undefined {
  return TITLES_BY_ID.get(id);
}
