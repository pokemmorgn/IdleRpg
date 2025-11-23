import ServerProfile from "../../models/ServerProfile";
import Server from "../../models/Server";
import { PlayerServerProfile } from "../../models/PlayerServerProfile";
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

    // 1) Vérifie que le serveur existe
    const server = await Server.findOne({ serverId });
    if (!server)
      return { success: false, error: `Server ${serverId} not found` };

    if (server.status === "maintenance")
      return { success: false, error: "Server is in maintenance" };

    if (!isValidCharacterSlot(characterSlot))
      return { success: false, error: `Invalid character slot ${characterSlot}` };

    // 2) Récupère le personnage
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

    // 3) Récupère PlayerServerProfile
    let psp = await PlayerServerProfile.findOne({ playerId, serverId });

    // 4) AUTO-CRÉATION SI ABSENT
    if (!psp) {
      console.log("⚠️ No PlayerServerProfile found → auto-creating.");

      // Création de la banque si inexistante
      const bank = await Bank.create({
        playerId,
        items: [],
        slots: 100
      });

      psp = await PlayerServerProfile.create({
        playerId,
        serverId,
        characters: [{
          characterId: profile._id,
          slot: characterSlot
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

    // 5) Vérifie que le personnage est dans la liste sinon → ajout
    const exists = psp.characters.some(c =>
      String(c.characterId) === String(profile._id)
    );

    if (!exists) {
      console.log("🛠 Adding missing character to PlayerServerProfile");

      psp.characters.push({
        characterId: profile._id,
        slot: characterSlot
      });
      await psp.save();
    }

    // 6) OK → renvoyer la structure complète
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

        // Shared currencies depuis PlayerServerProfile
        gold: psp.sharedCurrencies.gold,
        diamondBound: psp.sharedCurrencies.diamondBound,
        diamondUnbound: psp.sharedCurrencies.diamondUnbound,

        class: profile.class,
        race: profile.race,
        primaryStats: profile.primaryStats,
        computedStats: profile.computedStats,
        lastOnline: profile.lastOnline,

        questData: profile.questData,
        inventory: profile.inventory,
        talents: profile.talents,
        availableSkillPoints: profile.availableSkillPoints
      }
    };

  } catch (err: any) {
    console.error("❌ loadPlayerCharacter error:", err);
    return { success: false, error: err.message };
  }
}
