// server/src/colyseus/managers/SkinManager.ts

import { PlayerState } from "../schema/PlayerState";
import { SkinProgressState } from "../schema/SkinState";
import {
  ALL_SKINS,
  getSkinById,
  getSkinsByClass
} from "../../config/skins/skins.config";
import { Client } from "colyseus";
import { computeFullStats } from "./stats/PlayerStatsCalculator";

export let SkinManagerInstance: SkinManager | null = null;

export class SkinManager {

  constructor() {
    console.log(`🎨 SkinManager chargé avec ${ALL_SKINS.length} skins.`);
    SkinManagerInstance = this;
  }

  // ===========================================================================
  // MESSAGE HANDLER ROUTER
  // ===========================================================================
  handleMessage(
    type: string,
    client: Client,
    player: PlayerState,
    msg: any
  ): boolean {
    try {
      switch (type) {
        case "skin_unlock":
          if (!msg?.skinId) return true;
          this.handleUnlock(player, client, msg.skinId);
          return true;

        case "skin_equip":
          if (!msg?.skinId) return true;
          this.handleEquip(player, client, msg.skinId);
          return true;

        case "skin_level_up":
          if (!msg?.skinId) return true;
          this.handleLevelUp(player, client, msg.skinId);
          return true;
      }
    } catch (e) {
      console.error("❌ Erreur SkinManager.handleMessage:", e);
    }
    return false;
  }

  // ===========================================================================
  // RE-CALCUL DES STATS DU JOUEUR
  // ===========================================================================
  private recalcStats(player: PlayerState, client: Client) {

    const computed = computeFullStats(player);
    player.loadStatsFromProfile(computed);

    client.send("stats_update", {
      hp: player.hp,
      maxHp: player.maxHp,
      resource: player.resource,
      maxResource: player.maxResource,
      manaRegen: player.manaRegen,
      attackPower: player.attackPower,
      spellPower: player.spellPower,
      armor: player.armor,
      magicResistance: player.magicResistance,
      criticalChance: player.criticalChance,
      attackSpeed: player.attackSpeed,
      damageReduction: player.damageReduction
    });
  }

  // ===========================================================================
  // UNLOCK
  // ===========================================================================
  private handleUnlock(player: PlayerState, client: Client, skinId: string) {
    const config = getSkinById(skinId);

    if (!config) {
      client.send("skin_error", { error: "invalid_skin", skinId });
      return;
    }

    if (config.classId !== player.class) {
      client.send("skin_error", { error: "wrong_class", skinId });
      return;
    }

    if (!this.unlockSkin(player, skinId)) {
      client.send("skin_error", { error: "unlock_failed", skinId });
      return;
    }

    client.send("skin_unlocked", { skinId, level: 1 });
    this.recalcStats(player, client);
  }

  // ===========================================================================
  // LEVEL UP
  // ===========================================================================
  private handleLevelUp(player: PlayerState, client: Client, skinId: string) {
    if (!this.hasSkin(player, skinId)) {
      client.send("skin_error", { error: "not_unlocked", skinId });
      return;
    }

    const result = this.levelUpSkin(player, skinId);

    if (!result.ok) {
      client.send("skin_error", {
        error: result.error || "levelup_failed",
        skinId
      });
      return;
    }

    client.send("skin_level_up", {
      skinId,
      level: result.level
    });

    this.recalcStats(player, client);
  }

  // ===========================================================================
  // EQUIP
  // ===========================================================================
  private handleEquip(player: PlayerState, client: Client, skinId: string) {
    if (!this.hasSkin(player, skinId)) {
      client.send("skin_error", { error: "not_unlocked", skinId });
      return;
    }

    if (!this.equipSkin(player, skinId)) {
      client.send("skin_error", { error: "equip_failed", skinId });
      return;
    }

    client.send("skin_equipped", { skinId });
    this.recalcStats(player, client);
  }

  // ===========================================================================
  // API UTILITAIRES
  // ===========================================================================
  hasSkin(player: PlayerState, skinId: string): boolean {
    return player.skins.unlockedSkins.has(skinId);
  }

  isSkinEquipped(player: PlayerState, skinId: string): boolean {
    return player.skins.equippedSkinId === skinId;
  }

  unlockSkin(player: PlayerState, skinId: string): boolean {
    const config = getSkinById(skinId);
    if (!config) return false;

    if (config.classId !== player.class) return false;

    if (this.hasSkin(player, skinId)) return true;

    const progress = new SkinProgressState();
    progress.skinId = skinId;
    progress.level = 1;

    player.skins.unlockedSkins.set(skinId, progress);
    return true;
  }

  levelUpSkin(player: PlayerState, skinId: string): { ok: boolean; error?: string; level?: number } {
    const config = getSkinById(skinId);
    if (!config) return { ok: false, error: "invalid_skin" };

    const progress = player.skins.unlockedSkins.get(skinId);
    if (!progress) return { ok: false, error: "not_unlocked" };

    if (progress.level >= config.maxLevel) {
      return { ok: false, error: "max_level_reached" };
    }

    progress.level += 1;

    return {
      ok: true,
      level: progress.level
    };
  }

  equipSkin(player: PlayerState, skinId: string): boolean {
    const config = getSkinById(skinId);
    if (!config) return false;

    if (config.classId !== player.class) return false;

    player.skins.equippedSkinId = skinId;
    return true;
  }

  // ===========================================================================
  // BONUS STATS
  // ===========================================================================
  getSkinStatBonus(player: PlayerState) {
    const result = {
      primaryPercent: {} as Record<string, number>,
      computedPercent: {} as Record<string, number>
    };

    for (const [skinId, progress] of player.skins.unlockedSkins.entries()) {
      const config = getSkinById(skinId);
      if (!config) continue;

      const levelMultiplier = progress.level;

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

  getAvailableSkinsForPlayer(player: PlayerState) {
    return getSkinsByClass(player.class);
  }
}
