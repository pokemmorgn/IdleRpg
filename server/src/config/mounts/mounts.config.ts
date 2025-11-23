/**
 * MOUNTS CONFIGURATION
 * --------------------
 * Une monture donne toujours un bonus de vitesse,
 * plus éventuellement un petit bonus secondaire.
 *
 * Les stats s'appliquent dès qu'elle est débloquée.
 * Le joueur choisit seulement laquelle afficher.
 */

export interface MountStatsModifiers {
  primaryPercent?: Record<string, number>;
  computedPercent?: Record<string, number>;
}

export interface MountConfig {
  mountId: string;           // ID unique
  nameKey: string;
  descriptionKey: string;
  modelId: string;           // Nom du prefab Unity
  requiredLevel: number;
  statsModifiers: MountStatsModifiers;
}

/**
 * LISTE DES MONTURES
 */
export const ALL_MOUNTS: MountConfig[] = [

  // ---------------------------------------------------------------------------
  // MONTURE BASIQUE
  // ---------------------------------------------------------------------------
  {
    mountId: "mount_pony",
    nameKey: "mount.pony.name",
    descriptionKey: "mount.pony.description",
    modelId: "pony_mount",
    requiredLevel: 5,
    statsModifiers: {
      computedPercent: { moveSpeed: 10 }
    }
  },

  // ---------------------------------------------------------------------------
  // MONTURE RARE
  // ---------------------------------------------------------------------------
  {
    mountId: "mount_wolf",
    nameKey: "mount.wolf.name",
    descriptionKey: "mount.wolf.description",
    modelId: "wolf_mount",
    requiredLevel: 15,
    statsModifiers: {
      computedPercent: { moveSpeed: 15, evasion: 3 }
    }
  }
];

// ============================================================================
// HELPERS
// ============================================================================
export const MOUNTS_BY_ID: Map<string, MountConfig> =
  new Map(ALL_MOUNTS.map(m => [m.mountId, m]));

export function isValidMountId(id: string): boolean {
  return MOUNTS_BY_ID.has(id);
}

export function getMountById(id: string): MountConfig | undefined {
  return MOUNTS_BY_ID.get(id);
}
