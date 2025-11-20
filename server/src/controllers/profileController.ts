import { Request, Response } from "express";
import ServerProfile from "../models/ServerProfile";
import Server from "../models/Server";
import { isValidCharacterSlot } from "../config/character.config";
import { isValidClass, isClassAllowedForRace } from "../config/classes.config";
import { isValidRace } from "../config/races.config";
import { StatsManager } from "../managers/StatsManager";

// 🔥 Typer proprement les requêtes authentifiées
interface AuthRequest extends Request {
  playerId?: string;
}

/**
 * GET /profile
 * Liste tous les profils du joueur (tous serveurs)
 */
export const listProfiles = async (req: AuthRequest, res: Response) => {
  try {
    const playerId = req.playerId;

    if (!playerId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const profiles = await ServerProfile.find({ playerId }).sort({
      serverId: 1,
      characterSlot: 1
    });

    res.json({
      success: true,
      count: profiles.length,
      profiles: profiles.map(profile => ({
        profileId: String(profile._id),
        characterName: profile.characterName,
        serverId: profile.serverId,
        characterSlot: profile.characterSlot,
        level: profile.level,
        class: profile.class,
        race: profile.race,
        lastOnline: profile.lastOnline
      }))
    });
  } catch (err: any) {
    console.error("❌ Erreur listProfiles:", err.message);
    res.status(500).json({ success: false, error: "Failed to list profiles" });
  }
};

/**
 * GET /profile/:serverId
 * Récupère tous les profils du joueur sur un serveur
 */
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { serverId } = req.params;
    const playerId = req.playerId;

    if (!playerId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const profiles = await ServerProfile.find({
      playerId,
      serverId
    }).sort({ characterSlot: 1 });

    res.json({
      success: true,
      serverId,
      count: profiles.length,
      profiles: profiles.map(profile => ({
        profileId: String(profile._id),
        characterName: profile.characterName,
        characterSlot: profile.characterSlot,
        level: profile.level,
        xp: profile.xp,
        gold: profile.gold,
        class: profile.class,
        race: profile.race,
        primaryStats: profile.primaryStats,
        computedStats: profile.computedStats,
        lastOnline: profile.lastOnline
      }))
    });
  } catch (err: any) {
    console.error("❌ Erreur getProfile:", err.message);
    res.status(500).json({ success: false, error: "Failed to get profiles" });
  }
};

/**
 * POST /profile/:serverId
 * Crée un profil sur un serveur
 */
export const createProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { serverId } = req.params;
    const { characterSlot, characterName, characterClass, characterRace } = req.body;
    const playerId = req.playerId;

    if (!playerId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    // === VALIDATIONS ===

    if (!characterSlot || !characterName || !characterClass || !characterRace) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    if (!isValidCharacterSlot(characterSlot)) {
      return res.status(400).json({
        success: false,
        error: `Invalid character slot: ${characterSlot}`
      });
    }

    const server = await Server.findOne({ serverId });
    if (!server) {
      return res.status(404).json({
        success: false,
        error: `Server ${serverId} not found`
      });
    }

    if (server.status === "maintenance") {
      return res.status(403).json({
        success: false,
        error: "Server is in maintenance"
      });
    }

    if (!isValidClass(characterClass)) {
      return res.status(400).json({
        success: false,
        error: `Invalid class: ${characterClass}`
      });
    }

    if (!isValidRace(characterRace)) {
      return res.status(400).json({
        success: false,
        error: `Invalid race: ${characterRace}`
      });
    }

    if (!isClassAllowedForRace(characterClass, characterRace)) {
      return res.status(400).json({
        success: false,
        error: `Class ${characterClass} is not allowed for race ${characterRace}`
      });
    }

    const existingCharacter = await ServerProfile.findOne({
      playerId,
      serverId,
      characterSlot
    });

    if (existingCharacter) {
      return res.status(400).json({
        success: false,
        error: `Character slot ${characterSlot} is already occupied on server ${serverId}`
      });
    }

    const existingName = await ServerProfile.findOne({
      serverId,
      characterName
    });

    if (existingName) {
      return res.status(400).json({
        success: false,
        error: `Character name "${characterName}" is already taken on server ${serverId}`
      });
    }

    // === CRÉATION DU PERSONNAGE ===
    // On met tout à zéro → StatsManager fera le vrai calcul
    const newProfile = await ServerProfile.create({
      playerId,
      serverId,
      characterSlot,
      characterName,
      level: 1,
      xp: 0,
      gold: 0,
      class: characterClass,
      race: characterRace,

      primaryStats: {
        strength: 0,
        agility: 0,
        intelligence: 0,
        endurance: 0,
        spirit: 0
      },

      computedStats: {
        hp: 1,
        maxHp: 1,                 // min: 1
        resource: 0,
        maxResource: 0,
      
        manaRegen: 0,
        rageRegen: 0,
        energyRegen: 0,
      
        attackPower: 0,
        spellPower: 0,
      
        attackSpeed: 1.0,         // min: 0.8
      
        criticalChance: 0,
        criticalDamage: 150,
      
        damageReduction: 0,
        moveSpeed: 1,             // >= 0
      
        armor: 0,
        magicResistance: 0,
        precision: 0,
        evasion: 0,
        penetration: 0,
        tenacity: 0,
        lifesteal: 0,
        spellPenetration: 0
      },


      lastOnline: new Date()
    });

    // === CALCUL INITIAL DES STATS ===
    await StatsManager.initializeNewCharacter(String(newProfile._id));

    // Recharger depuis Mongo avec les stats calculées
    const profileWithStats = await ServerProfile.findById(newProfile._id);

    res.status(201).json({
      success: true,
      message: `Character ${characterName} created successfully`,
      profile: {
        profileId: String(profileWithStats!._id),
        characterName: profileWithStats!.characterName,
        serverId: profileWithStats!.serverId,
        characterSlot: profileWithStats!.characterSlot,
        level: profileWithStats!.level,
        xp: profileWithStats!.xp,
        gold: profileWithStats!.gold,
        class: profileWithStats!.class,
        race: profileWithStats!.race,
        primaryStats: profileWithStats!.primaryStats,
        computedStats: profileWithStats!.computedStats,
        lastOnline: profileWithStats!.lastOnline
      }
    });
  } catch (err: any) {
    console.error("❌ Erreur createProfile:", err.message);
    res.status(500).json({ success: false, error: "Failed to create character" });
  }
};

/**
 * DELETE /profile/:serverId/:characterSlot
 */
export const deleteProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { serverId, characterSlot } = req.params;
    const playerId = req.playerId;

    if (!playerId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const slotNumber = parseInt(characterSlot);

    if (!isValidCharacterSlot(slotNumber)) {
      return res.status(400).json({
        success: false,
        error: `Invalid character slot: ${characterSlot}`
      });
    }

    const profile = await ServerProfile.findOne({
      playerId,
      serverId,
      characterSlot: slotNumber
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: `No character found in slot ${characterSlot} on server ${serverId}`
      });
    }

    await ServerProfile.findByIdAndDelete(profile._id);

    res.json({
      success: true,
      message: `Character ${profile.characterName} deleted successfully`
    });
  } catch (err: any) {
    console.error("❌ Erreur deleteProfile:", err.message);
    res.status(500).json({ success: false, error: "Failed to delete profile" });
  }
};

export const createCharacter = createProfile;
