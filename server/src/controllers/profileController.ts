import { Request, Response } from "express";
import ServerProfile, { IServerProfile } from "../models/ServerProfile";
import ServerModel from "../models/Server";
import { syncPlayerCount, canJoinServer } from "../services/serverScalingService";
import { validateInvitationCode, useInvitationCode } from "../services/invitationService";
import { isValidClass, isClassAllowedForRace, getAllowedClassesForRace, VALID_CLASS_IDS } from "../config/classes.config";
import { isValidRace, VALID_RACE_IDS } from "../config/races.config";
import { MAX_CHARACTERS_PER_SERVER, isValidCharacterSlot } from "../config/character.config";

/**
 * GET /profile/:serverId
 * Récupère tous les profils du joueur sur un serveur
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const playerId = req.playerId; // Injecté par authMiddleware

    if (!playerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Vérifie que le serveur existe
    const server = await ServerModel.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    // Cherche tous les profils du joueur sur ce serveur
    const profiles: IServerProfile[] = await ServerProfile.find({ playerId, serverId }).sort({ characterSlot: 1 });

    if (profiles.length === 0) {
      return res.json({
        exists: false,
        serverId,
        characterCount: 0,
        maxCharacters: MAX_CHARACTERS_PER_SERVER,
        message: "No profile on this server"
      });
    }

    res.json({
      exists: true,
      serverId,
      characterCount: profiles.length,
      maxCharacters: MAX_CHARACTERS_PER_SERVER,
      profiles: profiles.map(p => ({
        profileId: p._id,
        serverId: p.serverId,
        characterSlot: p.characterSlot,
        characterName: p.characterName,
        level: p.level,
        xp: p.xp,
        gold: p.gold,
        class: p.class,
        race: p.race,
        lastOnline: p.lastOnline
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /profile/:serverId
 * Crée un nouveau profil sur un serveur
 * DÉCLENCHE L'AUTO-SCALING si le seuil est atteint (basé sur les comptes uniques)
 * SUPPORTE les codes d'invitation pour serveurs verrouillés
 */
export const createProfile = async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const playerId = req.playerId; // Injecté par authMiddleware
    const { characterName, characterClass, characterRace, characterSlot, invitationCode } = req.body;

    if (!playerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!characterName) {
      return res.status(400).json({ error: "Character name is required" });
    }

    if (!characterClass) {
      return res.status(400).json({ error: "Character class is required" });
    }

    if (!characterRace) {
      return res.status(400).json({ error: "Character race is required" });
    }

    // Valider la classe
    if (!isValidClass(characterClass)) {
      return res.status(400).json({ 
        error: "Invalid character class",
        validClasses: VALID_CLASS_IDS
      });
    }

    // Valider la race
    if (!isValidRace(characterRace)) {
      return res.status(400).json({ 
        error: "Invalid character race",
        validRaces: VALID_RACE_IDS
      });
    }

    // Valider la combinaison classe/race
    if (!isClassAllowedForRace(characterClass, characterRace)) {
      return res.status(400).json({ 
        error: "This class is not allowed for this race",
        race: characterRace,
        class: characterClass,
        allowedClasses: getAllowedClassesForRace(characterRace).map(c => c.classId)
      });
    }

    // Vérifie que le serveur existe
    const server = await ServerModel.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    // Compter combien de personnages le joueur a déjà sur ce serveur
    const existingCharactersCount = await ServerProfile.countDocuments({ playerId, serverId });

    if (existingCharactersCount >= MAX_CHARACTERS_PER_SERVER) {
      return res.status(400).json({ 
        error: `Maximum ${MAX_CHARACTERS_PER_SERVER} characters per server reached`,
        currentCount: existingCharactersCount,
        maxCharacters: MAX_CHARACTERS_PER_SERVER
      });
    }

    // Déterminer le slot du personnage
    let slotToUse: number;

    if (characterSlot !== undefined) {
      // Le client a spécifié un slot
      if (!isValidCharacterSlot(characterSlot)) {
        return res.status(400).json({ 
          error: "Invalid character slot",
          validSlots: Array.from({ length: MAX_CHARACTERS_PER_SERVER }, (_, i) => i + 1)
        });
      }

      // Vérifier que ce slot n'est pas déjà occupé
      const slotTaken = await ServerProfile.findOne({ playerId, serverId, characterSlot });
      if (slotTaken) {
        return res.status(400).json({ 
          error: `Character slot ${characterSlot} is already occupied`,
          existingCharacter: slotTaken.characterName
        });
      }

      slotToUse = characterSlot;
    } else {
      // Trouver automatiquement le premier slot libre
      const existingSlots = await ServerProfile.find({ playerId, serverId })
        .select("characterSlot")
        .sort({ characterSlot: 1 });

      const usedSlots = new Set(existingSlots.map(p => p.characterSlot));
      
      // Trouver le premier slot libre
      slotToUse = 1;
      for (let i = 1; i <= MAX_CHARACTERS_PER_SERVER; i++) {
        if (!usedSlots.has(i)) {
          slotToUse = i;
          break;
        }
      }
    }

    // Gestion du code d'invitation si le serveur est verrouillé
    let hasValidInvitation = false;
    
    if (invitationCode) {
      // Valider le code d'invitation
      const validation = await validateInvitationCode(invitationCode, playerId, serverId);
      
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      
      hasValidInvitation = true;
    }

    // Vérifier si le joueur peut rejoindre le serveur (seulement si c'est son premier perso sur ce serveur)
    if (existingCharactersCount === 0) {
      const canJoin = await canJoinServer(serverId, hasValidInvitation);
      
      if (!canJoin) {
        if (server.status === "locked") {
          return res.status(403).json({ 
            error: "Server is locked. Invitation code required.",
            serverStatus: "locked"
          });
        } else if (server.status === "maintenance") {
          return res.status(400).json({ error: "Server is in maintenance" });
        } else if (server.status === "full") {
          return res.status(400).json({ error: "Server is full" });
        } else {
          return res.status(400).json({ error: "Cannot join this server" });
        }
      }
    }

    // Créer le profil
    const profile: IServerProfile = await ServerProfile.create({
      playerId,
      serverId,
      characterSlot: slotToUse,
      characterName,
      class: characterClass,
      race: characterRace,
      level: 1,
      xp: 0,
      gold: 0
    });

    // Si un code d'invitation a été utilisé (et que c'est le premier perso), le marquer comme utilisé
    if (hasValidInvitation && invitationCode && existingCharactersCount === 0) {
      await useInvitationCode(invitationCode, playerId, serverId);
    }

    // ⚡ SYNCHRONISER LE COMPTEUR DE JOUEURS (déclenche l'auto-scaling si besoin)
    // Note : syncPlayerCount compte les comptes uniques, donc créer un 2ème perso ne change rien
    await syncPlayerCount(serverId);

    res.status(201).json({
      message: "Profile created",
      profile: {
        profileId: profile._id,
        serverId: profile.serverId,
        characterSlot: profile.characterSlot,
        characterName: profile.characterName,
        level: profile.level,
        xp: profile.xp,
        gold: profile.gold,
        class: profile.class,
        race: profile.race
      },
      usedInvitation: hasValidInvitation && existingCharactersCount === 0,
      characterCount: existingCharactersCount + 1,
      maxCharacters: MAX_CHARACTERS_PER_SERVER
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /profile
 * Liste tous les profils du joueur (sur tous les serveurs)
 */
export const listProfiles = async (req: Request, res: Response) => {
  try {
    const playerId = req.playerId; // Injecté par authMiddleware

    if (!playerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const profiles: IServerProfile[] = await ServerProfile.find({ playerId })
      .sort({ serverId: 1, characterSlot: 1 });

    res.json({
      profiles: profiles.map(p => ({
        profileId: p._id,
        serverId: p.serverId,
        characterSlot: p.characterSlot,
        characterName: p.characterName,
        level: p.level,
        xp: p.xp,
        gold: p.gold,
        class: p.class,
        race: p.race,
        lastOnline: p.lastOnline
      })),
      totalCharacters: profiles.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /profile/:serverId/:characterSlot
 * Supprime un profil sur un serveur (par slot)
 * SYNCHRONISE le compteur de joueurs
 */
export const deleteProfile = async (req: Request, res: Response) => {
  try {
    const { serverId, characterSlot } = req.params;
    const playerId = req.playerId;

    if (!playerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const slot = parseInt(characterSlot);

    if (isNaN(slot) || !isValidCharacterSlot(slot)) {
      return res.status(400).json({ error: "Invalid character slot" });
    }

    const profile = await ServerProfile.findOne({ playerId, serverId, characterSlot: slot });

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const characterName = profile.characterName;

    await profile.deleteOne();

    // ⚡ SYNCHRONISER LE COMPTEUR DE JOUEURS
    // Note : Si c'était le dernier perso du joueur sur ce serveur, le compteur va diminuer
    await syncPlayerCount(serverId);

    res.json({
      message: "Profile deleted",
      serverId: serverId,
      characterSlot: slot,
      characterName: characterName
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
