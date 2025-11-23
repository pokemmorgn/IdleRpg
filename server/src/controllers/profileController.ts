import { Request, Response } from "express";
import ServerProfile from "../models/ServerProfile";
import Server from "../models/Server";
import PlayerServerProfile from "../models/PlayerServerProfile";
import Bank from "../models/Bank";

import { isValidCharacterSlot } from "../config/character.config";
import { isValidClass, isClassAllowedForRace } from "../config/classes.config";
import { isValidRace } from "../config/races.config";
import { StatsManager } from "../managers/StatsManager";

interface AuthRequest extends Request {
  playerId?: string;
}

/* ============================================================
   GET /profile — liste tous les profils d’un joueur
============================================================ */
export const listProfiles = async (req: AuthRequest, res: Response) => {
  try {
    const playerId = req.playerId;
    if (!playerId)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const profiles = await ServerProfile.find({ playerId })
      .sort({ serverId: 1, characterSlot: 1 });

    const groupedByServer: Record<string, any[]> = {};

    for (const profile of profiles) {
      if (!groupedByServer[profile.serverId]) groupedByServer[profile.serverId] = [];

      // Récupère PlayerServerProfile par serveur
      const psp = await PlayerServerProfile.findOne({
        playerId,
        serverId: profile.serverId
      });

      groupedByServer[profile.serverId].push({
        profileId: String(profile._id),
        characterName: profile.characterName,
        serverId: profile.serverId,
        characterSlot: profile.characterSlot,
        level: profile.level,
        class: profile.class,
        race: profile.race,

        // ⭐ MONNAIES PARTAGÉES
        gold: psp?.sharedCurrencies.gold ?? 0,
        diamondBound: psp?.sharedCurrencies.diamondBound ?? 0,
        diamondUnbound: psp?.sharedCurrencies.diamondUnbound ?? 0,

        lastOnline: profile.lastOnline
      });
    }

    res.json({
      success: true,
      count: profiles.length,
      profilesByServer: groupedByServer
    });

  } catch (err: any) {
    console.error("❌ listProfiles error:", err.message);
    res.status(500).json({ success: false, error: "Failed to list profiles" });
  }
};


/* ============================================================
   GET /profile/:serverId — liste les personnages d’un serveur
============================================================ */
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { serverId } = req.params;
    const playerId = req.playerId;

    if (!playerId)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const profiles = await ServerProfile
      .find({ playerId, serverId })
      .sort({ characterSlot: 1 });

    const psp = await PlayerServerProfile.findOne({
      playerId,
      serverId
    });

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

        // ⭐ MONNAIES PARTAGÉES
        gold: psp?.sharedCurrencies.gold ?? 0,
        diamondBound: psp?.sharedCurrencies.diamondBound ?? 0,
        diamondUnbound: psp?.sharedCurrencies.diamondUnbound ?? 0,

        class: profile.class,
        race: profile.race,
        primaryStats: profile.primaryStats,
        computedStats: profile.computedStats,
        lastOnline: profile.lastOnline
      }))
    });

  } catch (err: any) {
    console.error("❌ getProfile error:", err.message);
    res.status(500).json({ success: false, error: "Failed to get profiles" });
  }
};


/* ============================================================
   POST /profile/:serverId — créer un personnage
============================================================ */
export const createProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { serverId } = req.params;
    const { characterSlot, characterName, characterClass, characterRace } = req.body;
    const playerId = req.playerId;

    if (!playerId)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    // VALIDATIONS
    if (!characterSlot || !characterName || !characterClass || !characterRace)
      return res.status(400).json({ success: false, error: "Missing required fields" });

    if (!isValidCharacterSlot(characterSlot))
      return res.status(400).json({ success: false, error: "Invalid character slot" });

    const server = await Server.findOne({ serverId });
    if (!server)
      return res.status(404).json({ success: false, error: `Server ${serverId} not found` });

    if (server.status === "maintenance")
      return res.status(403).json({ success: false, error: "Server is in maintenance" });

    if (!isValidClass(characterClass))
      return res.status(400).json({ success: false, error: `Invalid class: ${characterClass}` });

    if (!isValidRace(characterRace))
      return res.status(400).json({ success: false, error: `Invalid race: ${characterRace}` });

    if (!isClassAllowedForRace(characterClass, characterRace))
      return res.status(400).json({ success: false, error: "Class not allowed for race" });

    // Slot déjà utilisé ?
    const existingCharacter = await ServerProfile.findOne({ playerId, serverId, characterSlot });
    if (existingCharacter)
      return res.status(400).json({ success: false, error: "Slot already in use" });

    // Nom déjà pris ?
    const existingName = await ServerProfile.findOne({ serverId, characterName });
    if (existingName)
      return res.status(400).json({ success: false, error: "Name already taken" });

    /* ============================================================
       🔥 CREATION DU PERSONNAGE
    ============================================================ */
    const newProfile = await ServerProfile.create({
      playerId,
      serverId,
      characterSlot,
      characterName,
      level: 1,
      xp: 0,

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
        maxHp: 1,
        resource: 0,
        maxResource: 0,
        manaRegen: 0,
        rageRegen: 0,
        energyRegen: 0,
        attackPower: 0,
        spellPower: 0,
        attackSpeed: 1.0,
        criticalChance: 0,
        criticalDamage: 150,
        damageReduction: 0,
        moveSpeed: 1,
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

    /* ============================================================
       🔥 Ajouter ce personnage au PlayerServerProfile
    ============================================================ */
    let psp = await PlayerServerProfile.findOne({ playerId, serverId });

    if (!psp) {
      // Crée la banque globale
      const bank = await Bank.create({
        playerId,
        items: [],
        slots: 100
      });

      psp = await PlayerServerProfile.create({
        playerId,
        serverId,

        characters: [{
          characterId: newProfile._id,
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
    } else {
      psp.characters.push({
        characterId: newProfile._id,
        slot: characterSlot
      });
      await psp.save();
    }

    /* ============================================================
       🔥 Calcul des stats du personnage
    ============================================================ */
    await StatsManager.initializeNewCharacter(String(newProfile._id));
    const profileWithStats = await ServerProfile.findById(newProfile._id);

    return res.status(201).json({
      success: true,
      message: `Character ${characterName} created successfully`,
      profile: {
        profileId: String(profileWithStats!._id),
        characterName: profileWithStats!.characterName,
        serverId: profileWithStats!.serverId,
        characterSlot: profileWithStats!.characterSlot,

        level: profileWithStats!.level,
        xp: profileWithStats!.xp,

        // ⭐ MONNAIES PARTAGÉES
        gold: psp.sharedCurrencies.gold,
        diamondBound: psp.sharedCurrencies.diamondBound,
        diamondUnbound: psp.sharedCurrencies.diamondUnbound,

        class: profileWithStats!.class,
        race: profileWithStats!.race,
        primaryStats: profileWithStats!.primaryStats,
        computedStats: profileWithStats!.computedStats,
        lastOnline: profileWithStats!.lastOnline
      }
    });

  } catch (err: any) {
    console.error("❌ createProfile error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to create character"
    });
  }
};


/* ============================================================
   DELETE /profile/:serverId/:characterSlot
============================================================ */
export const deleteProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { serverId, characterSlot } = req.params;
    const playerId = req.playerId;

    if (!playerId)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const slot = parseInt(characterSlot);

    if (!isValidCharacterSlot(slot))
      return res.status(400).json({ success: false, error: "Invalid character slot" });

    const profile = await ServerProfile.findOne({
      playerId,
      serverId,
      characterSlot: slot
    });

    if (!profile)
      return res.status(404).json({ success: false, error: "Character not found" });

    await ServerProfile.findByIdAndDelete(profile._id);

    // 🔥 enlever aussi du PlayerServerProfile
    const psp = await PlayerServerProfile.findOne({ playerId, serverId });
    if (psp) {
      psp.characters = psp.characters.filter(
        c => String(c.characterId) !== String(profile._id)
      );
      await psp.save();
    }

    res.json({
      success: true,
      message: `Character ${profile.characterName} deleted successfully`
    });

  } catch (err: any) {
    console.error("❌ deleteProfile error:", err.message);
    res.status(500).json({ success: false, error: "Failed to delete character" });
  }
};

export const createCharacter = createProfile;
