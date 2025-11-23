// server/src/colyseus/utils/playerLoader.ts

import ServerProfile from "../../models/ServerProfile";
import Server from "../../models/Server";
import PlayerServerProfile from "../../models/PlayerServerProfile";
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
    // 1️⃣ Vérifie que le serveur existe
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

    // 2️⃣ Charge ServerProfile (données du personnage)
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

    // 3️⃣ Charge PlayerServerProfile (monnaies, banque, quêtes)
    let psp = await PlayerServerProfile.findOne({
      playerId: playerId,
      serverId: serverId
    });

    // ===========================================================
    // ⭐ PATCH AUTOMATIQUE : créer PlayerServerProfile si manquant
    // ===========================================================
    if (!psp) {
      console.warn("⚠️ Missing PlayerServerProfile → creating default one.");

      psp = await PlayerServerProfile.create({
        playerId,
        serverId,
        characters: [
          { characterId: profile._id, slot: characterSlot }
        ],
        sharedCurrencies: {
          gold: 0,
          diamondBound: 0,
          diamondUnbound: 0
        },
        sharedBankId: null,
        sharedQuests: {}
      });
    }

    // ===========================================================
    // ⭐ PATCH : s’assurer que le personnage est dans characters[]
    // ===========================================================
    const exists = psp.characters.some(e => 
      e.characterId.toString() === profile._id.toString()
    );

    if (!exists) {
      psp.characters.push({
        characterId: profile._id,
        slot: characterSlot
      });

      await psp.save();
      console.log("📌 Added missing character entry to PlayerServerProfile.");
    }

    console.log(
      `📂 Personnage chargé: ${profile.characterName} (Lv${profile.level} ${profile.class})`
    );

    // 4️⃣ Retour structuré
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

        // ⭐ monnaies globales
        gold: psp.sharedCurrencies.gold,
        diamondBound: psp.sharedCurrencies.diamondBound,
        diamondUnbound: psp.sharedCurrencies.diamondUnbound,

        class: profile.class,
        race: profile.race,

        primaryStats: profile.primaryStats,
        computedStats: profile.computedStats,

        questData: profile.questData,
        inventory: profile.inventory,

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
