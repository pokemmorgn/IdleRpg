// src/colyseus/utils/playerLoader.ts

import ServerProfile from "../../models/ServerProfile";
import Server from "../../models/Server";
import PlayerServerProfile from "../../models/PlayerServerProfile";
import Bank from "../../models/Bank";
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
    // Vérifie que le serveur existe
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

    // Récupère le profil du personnage
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

    // ----------------------------------------------------------
    // 🔥 AUTO-CREATE PlayerServerProfile IF MISSING
    // ----------------------------------------------------------
    let psp = await PlayerServerProfile.findOne({
      playerId: playerId,
      serverId: serverId
    });

    if (!psp) {
      console.warn(`⚠️ Missing PlayerServerProfile for ${playerId} on ${serverId}, creating...`);

      // 🔹 Créer banque globale
      const bank = await Bank.create({
        playerId: playerId,
        items: [],
        slots: 100
      });

      // 🔹 Créer PlayerServerProfile basique
      psp = await PlayerServerProfile.create({
        playerId: playerId,
        serverId: serverId,
        characters: [{
          characterId: profile._id,
          slot: profile.characterSlot
        }],
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
    // 🔄 S'assurer que le personnage est bien dans characters[]
    // ----------------------------------------------------------
    const exists = psp.characters.some(c =>
      String(c.characterId) === String(profile._id)
    );

    if (!exists) {
      psp.characters.push({
        characterId: profile._id,
        slot: profile.characterSlot
      });
      await psp.save();
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
        nextLevelXp: profile.nextLevelXp,

        // ⭐ Monnaies globales (PSP)
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
