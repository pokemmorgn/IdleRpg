/**
 * SKINS CONFIGURATION
 * -------------------
 * 2 skins par classe, maxLevel = 5
 * Chaque skin donne +5% sur deux stats
 * Format aligné sur RaceConfig (primaryPercent / computedPercent)
 */

export interface SkinStatsModifiers {
  primaryPercent?: Record<string, number>;
  computedPercent?: Record<string, number>;
}

export interface SkinConfig {
  skinId: string;           // ID unique du skin
  classId: string;          // Classe associée
  nameKey: string;          // Clé de traduction du nom
  descriptionKey: string;   // Clé traduction description
  maxLevel: number;         // Niveau max (5)
  statsModifiers: SkinStatsModifiers;
}

/**
 * LISTE DES SKINS
 */
export const ALL_SKINS: SkinConfig[] = [

  // ==========================================================================
  // PRIEST – Healer / Support
  // ==========================================================================
  {
    skinId: "priest_basic01",
    classId: "priest",
    nameKey: "skin.priest.basic01.name",
    descriptionKey: "skin.priest.basic01.description",
    maxLevel: 5,
    statsModifiers: {
      primaryPercent: { spirit: 5 },
      computedPercent: { manaRegen: 5 }
    }
  },
  {
    skinId: "priest_basic02",
    classId: "priest",
    nameKey: "skin.priest.basic02.name",
    descriptionKey: "skin.priest.basic02.description",
    maxLevel: 5,
    statsModifiers: {
      primaryPercent: { intelligence: 5 },
      computedPercent: { spellPower: 5 }
    }
  },

  // ==========================================================================
  // MAGE – DPS magique distance
  // ==========================================================================
  {
    skinId: "mage_basic01",
    classId: "mage",
    nameKey: "skin.mage.basic01.name",
    descriptionKey: "skin.mage.basic01.description",
    maxLevel: 5,
    statsModifiers: {
      primaryPercent: { intelligence: 5 },
      computedPercent: { spellPower: 5 }
    }
  },
  {
    skinId: "mage_basic02",
    classId: "mage",
    nameKey: "skin.mage.basic02.name",
    descriptionKey: "skin.mage.basic02.description",
    maxLevel: 5,
    statsModifiers: {
      computedPercent: {
        critChance: 5,
        manaRegen: 5
      }
    }
  },

  // ==========================================================================
  // PALADIN – Tank / Healer hybride
  // ==========================================================================
  {
    skinId: "paladin_basic01",
    classId: "paladin",
    nameKey: "skin.paladin.basic01.name",
    descriptionKey: "skin.paladin.basic01.description",
    maxLevel: 5,
    statsModifiers: {
      primaryPercent: { endurance: 5 },
      computedPercent: { armor: 5 }
    }
  },
  {
    skinId: "paladin_basic02",
    classId: "paladin",
    nameKey: "skin.paladin.basic02.name",
    descriptionKey: "skin.paladin.basic02.description",
    maxLevel: 5,
    statsModifiers: {
      primaryPercent: { spirit: 5 },
      computedPercent: { damageReduction: 5 }
    }
  },

  // ==========================================================================
  // ROGUE – DPS mêlée agile
  // ==========================================================================
  {
    skinId: "rogue_basic01",
    classId: "rogue",
    nameKey: "skin.rogue.basic01.name",
    descriptionKey: "skin.rogue.basic01.description",
    maxLevel: 5,
    statsModifiers: {
      primaryPercent: { agility: 5 },
      computedPercent: { critChance: 5 }
    }
  },
  {
    skinId: "rogue_basic02",
    classId: "rogue",
    nameKey: "skin.rogue.basic02.name",
    descriptionKey: "skin.rogue.basic02.description",
    maxLevel: 5,
    statsModifiers: {
      computedPercent: {
        attackSpeed: 5,
        evasion: 5
      }
    }
  },

  // ==========================================================================
  // WARRIOR – Tank / DPS physique
  // ==========================================================================
  {
    skinId: "warrior_basic01",
    classId: "warrior",
    nameKey: "skin.warrior.basic01.name",
    descriptionKey: "skin.warrior.basic01.description",
    maxLevel: 5,
    statsModifiers: {
      computedPercent: { maxHp: 5, armor: 5 }
    }
  },
  {
    skinId: "warrior_basic02",
    classId: "warrior",
    nameKey: "skin.warrior.basic02.name",
    descriptionKey: "skin.warrior.basic02.description",
    maxLevel: 5,
    statsModifiers: {
      primaryPercent: { strength: 5 },
      computedPercent: { damageReduction: 5 }
    }
  },

  // ==========================================================================
  // DRUID – Support / Healer / DPS nature
  // ==========================================================================
  {
    skinId: "druid_basic01",
    classId: "druid",
    nameKey: "skin.druid.basic01.name",
    descriptionKey: "skin.druid.basic01.description",
    maxLevel: 5,
    statsModifiers: {
      primaryPercent: { spirit: 5 },
      computedPercent: { spellPower: 5 }
    }
  },
  {
    skinId: "druid_basic02",
    classId: "druid",
    nameKey: "skin.druid.basic02.name",
    descriptionKey: "skin.druid.basic02.description",
    maxLevel: 5,
    statsModifiers: {
      primaryPercent: { intelligence: 5 },
      computedPercent: { manaRegen: 5 }
    }
  }

];

// ============================================================================
// HELPERS
// ============================================================================

export const SKINS_BY_ID: Map<string, SkinConfig> =
  new Map(ALL_SKINS.map(s => [s.skinId, s]));

export function getSkinsByClass(classId: string): SkinConfig[] {
  return ALL_SKINS.filter(s => s.classId === classId);
}

export function isValidSkinId(skinId: string): boolean {
  return SKINS_BY_ID.has(skinId);
}

export function getSkinById(skinId: string): SkinConfig | undefined {
  return SKINS_BY_ID.get(skinId);
}
