// src/colyseus/managers/SkinManager.ts

import { PlayerState } from "../schema/PlayerState";
import { SkinProgressState } from "../schema/SkinState";
import { ALL_SKINS, getSkinById, getSkinsByClass } from "../../config/skins/skins.config";

export class SkinManager {

  constructor() {
    console.log(`🎨 SkinManager chargé avec ${ALL_SKINS.length} skins.`);
  }

  // ===========================================================================
  // Vérifications
  // ===========================================================================

  hasSkin(player: PlayerState, skinId: string): boolean {
    return player.skins.unlockedSkins.has(skinId);
  }

  isSkinEquipped(player: PlayerState, skinId: string): boolean {
    return player.skins.equippedSkinId === skinId;
  }

  // ===========================================================================
  // Débloquer un skin
  // ===========================================================================

  unlockSkin(player: PlayerState, skinId: string): boolean {
    const config = getSkinById(skinId);
    if (!config) return false;

    // Vérifie que la classe du skin correspond à la classe du joueur
    if (config.classId !== player.class) {
      console.warn(`❌ Tentative d'unlock skin ${skinId} pour la mauvaise classe (player.class=${player.class}).`);
      return false;
    }

    // Déjà débloqué → on ne fait rien de plus
    if (this.hasSkin(player, skinId)) {
      return true;
    }

    const progress = new SkinProgressState();
    progress.skinId = skinId;
    progress.level = 1;

    player.skins.unlockedSkins.set(skinId, progress);
    return true;
  }

  // ===========================================================================
  // Level-Up d'un skin
  // ===========================================================================

  levelUpSkin(player: PlayerState, skinId: string): boolean {
    const config = getSkinById(skinId);
    if (!config) return false;

    const progress = player.skins.unlockedSkins.get(skinId);
    if (!progress) return false;

    if (progress.level >= config.maxLevel) return false;

    progress.level += 1;
    return true;
  }

  // ===========================================================================
  // Équiper un skin
  // ===========================================================================

  equipSkin(player: PlayerState, skinId: string): boolean {
    if (!this.hasSkin(player, skinId)) return false;

    const config = getSkinById(skinId);
    if (!config) return false;

    // Vérif classe encore une fois par sécurité
    if (config.classId !== player.class) return false;

    player.skins.equippedSkinId = skinId;
    return true;
  }

  // ===========================================================================
  // Récupération des stats cumulées du joueur via skins
  // ===========================================================================

  getSkinStatBonus(player: PlayerState) {
    const result = {
      primaryPercent: {} as Record<string, number>,
      computedPercent: {} as Record<string, number>
    };

    for (const [skinId, progress] of player.skins.unlockedSkins.entries()) {
      const config = getSkinById(skinId);
      if (!config) continue;

      const levelMultiplier = progress.level / config.maxLevel;
      // ex: niveau 1/5 = x0.2, niveau 5/5 = x1.0

      if (config.statsModifiers.primaryPercent) {
        for (const [stat, value] of Object.entries(config.statsModifiers.primaryPercent)) {
          result.primaryPercent[stat] ??= 0;
          result.primaryPercent[stat] += value * levelMultiplier;
        }
      }

      if (config.statsModifiers.computedPercent) {
        for (const [stat, value] of Object.entries(config.statsModifiers.computedPercent)) {
          result.computedPercent[stat] ??= 0;
          result.computedPercent[stat] += value * levelMultiplier;
        }
      }
    }

    return result;
  }

  // ===========================================================================
  // Obtenir les skins disponibles pour la classe du joueur
  // ===========================================================================

  getAvailableSkinsForPlayer(player: PlayerState) {
    return getSkinsByClass(player.class);
  }
}
