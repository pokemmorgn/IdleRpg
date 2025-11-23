// src/colyseus/utils/playerLoader.ts

import ServerProfile from "../../models/ServerProfile";
import Server from "../../models/Server";
import PlayerServerProfile from "../../models/PlayerServerProfile";
import Bank from "../../models/Bank";

import { Types } from "mongoose";
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
    // ----------------------------------------------------------
    // Vérifie serveur existant
    // ----------------------------------------------------------
    const server = await Server.findOne({ serverId });
    if (!server) return { success: false, error: `Server ${serverId} not found` };

    if (server.status === "maintenance")
      return { success: false, error: "Server is in maintenance" };

    if (!isValidCharacterSlot(characterSlot)) {
      return { success: false, error: `Invalid character slot: ${characterSlot}` };
    }

    // ----------------------------------------------------------
    // Récupère le personnage
    // ----------------------------------------------------------
    const profile = await ServerProfile.findOne({
      playerId,
      serverId,
      characterSlot
    });

    if (!profile) {
      return {
        success: false,
        error: `No character found in slot ${characterSlot} on server ${serverId}`
      };
    }

    // ----------------------------------------------------------
    // Récupère PlayerServerProfile
    // ----------------------------------------------------------
    let psp = await PlayerServerProfile.findOne({
      playerId,
      serverId
    });

    // ----------------------------------------------------------
    // 🔥 Auto-create PlayerServerProfile si absent
    // ----------------------------------------------------------
    if (!psp) {
      console.warn(`⚠️ Missing PlayerServerProfile → creating new one...`);

      // créer une banque globale vide
      const bank = await Bank.create({
        playerId: new Types.ObjectId(playerId),
        items: [],
        slots: 100
      });

      psp = await PlayerServerProfile.create({
        playerId: new Types.ObjectId(playerId),
        serverId,
        characters: [
          {
            characterId: profile._id as Types.ObjectId,
            slot: profile.characterSlot
          }
        ],
        sharedCurrencies: {
          gold: 0,
          diamondBound: 0,
          diamondUnbound: 0
        },
        sharedBankId: bank._id,
        sharedQuests: {}
      });
    }

    // ----------------------------------------------------------
    // 🔍 Vérifie que le personnage est dans psp.characters
    // ----------------------------------------------------------
    const exists = psp.characters.some(
      c => String(c.characterId) === String(profile._id)
    );

    if (!exists) {
      psp.characters.push({
        characterId: profile._id as Types.ObjectId,
        slot: profile.characterSlot
      });

      await psp.save();
    }

    // ----------------------------------------------------------
    // Log OK
    // ----------------------------------------------------------
    console.log(
      `📂 Personnage chargé: ${profile.characterName} (Lv${profile.level} ${profile.class})`
    );

    // ----------------------------------------------------------
    // Retourne le profil complet
    // ----------------------------------------------------------
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
        nextLevelXp: profile.nextLevelXp,

        // ⭐ Monnaies globales
        gold: psp.sharedCurrencies.gold,
        diamondBound: psp.sharedCurrencies.diamondBound,
        diamondUnbound: psp.sharedCurrencies.diamondUnbound,

        class: profile.class,
        race: profile.race,

        primaryStats: profile.primaryStats,
        computedStats: profile.computedStats,

        lastOnline: profile.lastOnline
      }
    };

  } catch (err: any) {
    console.error("❌ Erreur loadPlayerCharacter:", err);
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
