// server/src/colyseus/managers/MountManager.ts

import { PlayerState } from "../schema/PlayerState";
import { MountConfig, getMountById, ALL_MOUNTS } from "../../config/mounts/mounts.config";
import { MountState } from "../schema/MountState";
import { Client } from "colyseus";
import { computeFullStats } from "./stats/PlayerStatsCalculator";

// 🟩 INSTANCE SINGLETON
export let MountManagerInstance: MountManager | null = null;

export class MountManager {

  constructor() {
    console.log(`🐎 MountManager chargé avec ${ALL_MOUNTS.length} montures.`);
    MountManagerInstance = this;
  }

  // ========================================================================
  // ROUTER MESSAGES
  // ========================================================================
  handleMessage(type: string, client: Client, player: PlayerState, msg: any): boolean {
    try {
      switch (type) {

        case "mount_unlock":
          if (!msg?.mountId) return true;
          this.handleUnlock(player, client, msg.mountId);
          return true;

        case "mount_equip":
          if (!msg?.mountId) return true;
          this.handleEquip(player, client, msg.mountId);
          return true;
      }

    } catch (e) {
      console.error("❌ Erreur MountManager.handleMessage:", e);
    }
    return false;
  }

  // ========================================================================
  // RECALCUL STATS
  // ========================================================================
  private async recalcStats(player: PlayerState, client: Client) {
    const computed = await computeFullStats(player);
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

  // ========================================================================
  // UNLOCK
  // ========================================================================
  private handleUnlock(player: PlayerState, client: Client, mountId: string) {
    const config = getMountById(mountId);
    if (!config) {
      client.send("mount_error", { error: "invalid_mount", mountId });
      return;
    }

    if (player.level < config.requiredLevel) {
      client.send("mount_error", { error: "level_too_low", mountId });
      return;
    }

    if (!this.unlockMount(player, mountId)) {
      client.send("mount_error", { error: "unlock_failed", mountId });
      return;
    }

    client.send("mount_unlocked", { mountId });
    this.recalcStats(player, client);
  }

  // ========================================================================
  // EQUIP
  // ========================================================================
  private handleEquip(player: PlayerState, client: Client, mountId: string) {
    if (!this.hasMount(player, mountId)) {
      client.send("mount_error", { error: "not_unlocked", mountId });
      return;
    }

    player.mounts.equippedMountId = mountId;

    client.send("mount_equipped", {
      mountId,
      modelId: getMountById(mountId)?.modelId || ""
    });
  }

  // ========================================================================
  // API
  // ========================================================================
  hasMount(player: PlayerState, mountId: string): boolean {
    return player.mounts.unlockedMounts.has(mountId);
  }

  unlockMount(player: PlayerState, mountId: string): boolean {
    if (this.hasMount(player, mountId)) return true;

    player.mounts.unlockedMounts.set(mountId, true);
    return true;
  }

  // ========================================================================
  // BONUS STATS
  // ========================================================================
  getMountStatBonus(player: PlayerState) {
    const result = {
      primaryPercent: {} as Record<string, number>,
      computedPercent: {} as Record<string, number>
    };

    for (const [mountId] of player.mounts.unlockedMounts.entries()) {
      const config = getMountById(mountId);
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
