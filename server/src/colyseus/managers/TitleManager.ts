// server/src/colyseus/managers/TitleManager.ts

import { PlayerState } from "../schema/PlayerState";
import { TitleConfig, getTitleById, ALL_TITLES } from "../../config/titles/titles.config";
import { TitleState } from "../schema/TitleState";
import { Client } from "colyseus";
import { computeFullStats } from "./stats/PlayerStatsCalculator";

// 🟩 INSTANCE SINGLETON
export let TitleManagerInstance: TitleManager | null = null;

export class TitleManager {

  constructor() {
    console.log(`🏷️ TitleManager chargé avec ${ALL_TITLES.length} titres.`);
    TitleManagerInstance = this;
  }

  // ========================================================================
  // ROUTER DES MESSAGES
  // ========================================================================
  handleMessage(
    type: string,
    client: Client,
    player: PlayerState,
    msg: any
  ): boolean {
    try {
      switch (type) {

        case "title_unlock":
          if (!msg?.titleId) return true;
          this.handleUnlock(player, client, msg.titleId);
          return true;

        case "title_equip":
          if (!msg?.titleId) return true;
          this.handleEquip(player, client, msg.titleId);
          return true;
      }
    } catch (e) {
      console.error("❌ Erreur TitleManager.handleMessage:", e);
    }
    return false;
  }

  // ========================================================================
  // RECALCUL STATS
  // ========================================================================
  private async recalcStats(player: PlayerState, client: Client) {
    const computed = await computeFullStats(player);
    player.loadStatsFromProfile(computed);

    client.send("stats_update", computed);
  }

  // ========================================================================
  // UNLOCK
  // ========================================================================
  private handleUnlock(player: PlayerState, client: Client, titleId: string) {
    const config = getTitleById(titleId);
    if (!config) {
      client.send("title_error", { error: "invalid_title", titleId });
      return;
    }

    if (player.level < config.requiredLevel) {
      client.send("title_error", { error: "level_too_low", titleId });
      return;
    }

    if (!this.unlockTitle(player, titleId)) {
      client.send("title_error", { error: "unlock_failed", titleId });
      return;
    }

    client.send("title_unlocked", { titleId });
    this.recalcStats(player, client);
  }

  // ========================================================================
  // EQUIP
  // ========================================================================
  private handleEquip(player: PlayerState, client: Client, titleId: string) {
    if (!this.hasTitle(player, titleId)) {
      client.send("title_error", { error: "not_unlocked", titleId });
      return;
    }

    player.titles.equippedTitleId = titleId;

    client.send("title_equipped", { titleId });
  }

  // ========================================================================
  // API
  // ========================================================================
  hasTitle(player: PlayerState, titleId: string): boolean {
    return player.titles.unlockedTitles.has(titleId);
  }

  unlockTitle(player: PlayerState, titleId: string): boolean {
    if (this.hasTitle(player, titleId)) return true;

    player.titles.unlockedTitles.set(titleId, true);
    return true;
  }

  // ========================================================================
  // BONUS STATS
  // ========================================================================
  getTitleStatBonus(player: PlayerState) {
    const result = {
      primaryPercent: {} as Record<string, number>,
      computedPercent: {} as Record<string, number>
    };

    for (const [titleId] of player.titles.unlockedTitles.entries()) {
      const config = getTitleById(titleId);
      if (!config) continue;

      if (config.statsModifiers.primaryPercent) {
        for (const [stat, value] of Object.entries(config.statsModifiers.primaryPercent)) {
          result.primaryPercent[stat] = (result.primaryPercent[stat] || 0) + value;
        }
      }

      if (config.statsModifiers.computedPercent) {
        for (const [stat, value] of Object.entries(config.statsModifiers.computedPercent)) {
          result.computedPercent[stat] = (result.computedPercent[stat] || 0) + value;
        }
      }
    }

    return result;
  }
}
