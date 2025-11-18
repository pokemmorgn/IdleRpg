import ServerProfile from "../../models/ServerProfile";
import Server from "../../models/Server";
import { isValidCharacterSlot } from "../../config/character.config";

/**
 * Charge et valide le personnage d'un joueur depuis MongoDB
 */
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
    // 1. Vérifier que le serverId est valide
    const server = await Server.findOne({ serverId });
    if (!server) {
      return { success: false, error: `Server ${serverId} not found` };
    }

    // 2. Vérifier que le serveur est accessible
    if (server.status === "maintenance") {
      return { success: false, error: "Server is in maintenance" };
    }

    // 3. Vérifier que le slot est valide (1-5)
    if (!isValidCharacterSlot(characterSlot)) {
      return { success: false, error: `Invalid character slot: ${characterSlot}` };
    }

    // 4. Charger le profil depuis MongoDB
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

    console.log(`📂 Personnage chargé: ${profile.characterName} (Lv${profile.level} ${profile.class})`);

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
        gold: profile.gold,
        class: profile.class,
        race: profile.race
      }
    };

  } catch (err: any) {
    console.error("❌ Erreur lors du chargement du personnage:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Vérifie si un personnage est déjà connecté (empêche double connexion)
 */
export function isCharacterAlreadyConnected(
  connectedPlayers: Map<string, any>,
  profileId: string
): boolean {
  for (const [sessionId, player] of connectedPlayers.entries()) {
    if (player.profileId === profileId) {
      return true;
    }
  }
  return false;
}
