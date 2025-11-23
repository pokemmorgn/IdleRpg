// server/src/colyseus/handlers/cosmetics.handler.ts

import { Client } from "colyseus";
import { PlayerState } from "../schema/PlayerState";

import { SkinManagerInstance } from "../managers/SkinManager";
import { TitleManagerInstance } from "../managers/TitleManager";
import { MountManagerInstance } from "../managers/MountManager";

export function handleCosmeticsMessage(
  type: string,
  client: Client,
  player: PlayerState,
  msg: any
): boolean {
  try {
    // --- SKINS ---
    if (SkinManagerInstance?.handleMessage(type, client, player, msg)) {
      return true;
    }

    // --- TITLES ---
    if (TitleManagerInstance?.handleMessage(type, client, player, msg)) {
      return true;
    }

    // --- MOUNTS ---
    if (MountManagerInstance?.handleMessage(type, client, player, msg)) {
      return true;
    }
  } catch (e) {
    console.error("❌ Error in cosmetics.handler:", e);
  }

  return false;
}
