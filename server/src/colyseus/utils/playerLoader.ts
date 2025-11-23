// src/colyseus/utils/playerLoader.ts

import ServerProfile from "../../models/ServerProfile";
import Server from "../../models/Server";
import { isValidCharacterSlot } from "../../config/character.config";

export async function loadPlayerCharacter(
  playerId: string,
  serverId: string,
  characterSlot: number
): Promise<{
  success: boolean;
  profile?: any;
  error?: string;
}> {
  try {
    const server = await Server.findOne({ serverId });
    if (!server) {
      return { success: false, error: `Server ${serverId} not found` };
    }

    if (server.status === "maintenance") {
      return { success: false, error: "Server is in maintenance" };
    }

    if (!isValidCharacterSlot(characterSlot)) {
      return { success: false, error: `Invalid character slot: ${characterSlot}` };
    }

    const profile = await ServerProfile.findOne({
      playerId: playerId,
      serverId: serverId,
      characterSlot: characterSlot
    });

    if (!profile) {
      return {
        success: false,
        error: `No character found in slot ${characterSlot} on server ${serverId}`
      };
    }

    console.log(
      `📂 Personnage chargé: ${profile.characterName} (Lv${profile.level} ${profile.class})`
    );

    return {
      success: true,
      profile: {
        profileId: String(profile._id),
        playerId: String(profile.playerId),
        serverId: profile.serverId,
        characterSlot: profile.characterSlot,
        characterName: profile.characterName,
        level: profile.level,
        xp: profile.xp,

        // 🔥 NOUVEAU SYSTEME DE MONNAIE
        gold: profile.currencies.gold,
        diamondBound: profile.currencies.diamondBound,
        diamondUnbound: profile.currencies.diamondUnbound,

        class: profile.class,
        race: profile.race
      }
    };

  } catch (err: any) {
    console.error("❌ Erreur loadPlayerCharacter:", err.message);
    return { success: false, error: err.message };
  }
}

export function isCharacterAlreadyConnected(
  connectedPlayers: Map<string, any>,
  profileId: string
): boolean {
  for (const [, player] of connectedPlayers.entries()) {
    if (player.profileId === profileId) {
      return true;
    }
  }
  return false;
}
