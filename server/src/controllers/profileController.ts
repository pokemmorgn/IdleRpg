import { Request, Response } from "express";
import ServerProfile from "../models/ServerProfile";
import Server from "../models/Server";
import { isValidCharacterSlot } from "../config/character.config";
import { isValidClass } from "../config/classes.config";
import { isValidRace } from "../config/races.config";
import { isClassAllowedForRace } from "../config/classes.config";
import { StatsManager } from "../managers/StatsManager"; // ← AJOUT

/**
 * POST /profile/create
 * Créer un nouveau personnage sur un serveur
 */
export const createCharacter = async (req: Request, res: Response) => {
  try {
    const { playerId, serverId, characterSlot, characterName, characterClass, characterRace } = req.body;

    // === VALIDATIONS ===

    if (!playerId || !serverId || !characterSlot || !characterName || !characterClass || !characterRace) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields"
      });
    }

    // Vérifier que le slot est valide
    if (!isValidCharacterSlot(characterSlot)) {
      return res.status(400).json({
        success: false,
        error: `Invalid character slot: ${characterSlot}`
      });
    }

    // Vérifier que le serveur existe
    const server = await Server.findOne({ serverId });
    if (!server) {
      return res.status(404).json({
        success: false,
        error: `Server ${serverId} not found`
      });
    }

    // Vérifier que le serveur est accessible
    if (server.status === "maintenance") {
      return res.status(403).json({
        success: false,
        error: "Server is in maintenance"
      });
    }

    // Vérifier que la classe est valide
    if (!isValidClass(characterClass)) {
      return res.status(400).json({
        success: false,
        error: `Invalid class: ${characterClass}`
      });
    }

    // Vérifier que la race est valide
    if (!isValidRace(characterRace)) {
      return res.status(400).json({
        success: false,
        error: `Invalid race: ${characterRace}`
      });
    }

    // Vérifier que la combinaison classe/race est autorisée
    if (!isClassAllowedForRace(characterClass, characterRace)) {
      return res.status(400).json({
        success: false,
        error: `Class ${characterClass} is not allowed for race ${characterRace}`
      });
    }

    // Vérifier que le slot n'est pas déjà occupé
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

    // Vérifier que le nom n'est pas déjà pris sur ce serveur
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

    // Créer le profil avec des stats par défaut (seront recalculées après)
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
        strength: 10,
        agility: 10,
        intelligence: 10,
        endurance: 10,
        spirit: 10
      },
      computedStats: {
        hp: 100,
        maxHp: 100,
        resource: 100,
        maxResource: 100,
        manaRegen: 0,
        rageRegen: 0,
        energyRegen: 0,
        attackPower: 10,
        spellPower: 10,
        attackSpeed: 2.5,
        criticalChance: 0,
        criticalDamage: 150,
        damageReduction: 0,
        moveSpeed: 5.0,
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

    // ========================================
    // INITIALISER LES STATS (NOUVEAU)
    // ========================================
    await StatsManager.initializeNewCharacter(String(newProfile._id));

    // Recharger le profil avec les stats calculées
    const profileWithStats = await ServerProfile.findById(newProfile._id);

    console.log(`✅ Personnage créé: ${characterName} (${characterClass}/${characterRace}) sur ${serverId}`);
    console.log(`   Stats: HP=${profileWithStats!.computedStats.maxHp}, AP=${profileWithStats!.computedStats.attackPower}, SP=${profileWithStats!.computedStats.spellPower}`);

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
    console.error("❌ Erreur createCharacter:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to create character"
    });
  }
};
