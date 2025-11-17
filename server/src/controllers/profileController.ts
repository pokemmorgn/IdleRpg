import { Request, Response } from "express";
import ServerProfile, { IServerProfile } from "../models/ServerProfile";
import ServerModel from "../models/Server";
import { incrementPlayerCount, decrementPlayerCount, canJoinServer } from "../services/serverScalingService";
import { validateInvitationCode, useInvitationCode } from "../services/invitationService";
import { isValidClass } from "../config/classes.config";
import { isValidRace } from "../config/races.config";

/**
 * GET /profile/:serverId
 * Récupère le profil du joueur sur un serveur (ou retourne null si pas de profil)
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

    // Cherche le profil
    const profile: IServerProfile | null = await ServerProfile.findOne({ playerId, serverId });

    if (!profile) {
      return res.json({
        exists: false,
        serverId,
        message: "No profile on this server"
      });
    }

    res.json({
      exists: true,
      profile: {
        profileId: profile._id,
        serverId: profile.serverId,
        characterName: profile.characterName,
        level: profile.level,
        xp: profile.xp,
        gold: profile.gold,
        class: profile.class,
        race: profile.race,
        lastOnline: profile.lastOnline
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /profile/:serverId
 * Crée un nouveau profil sur un serveur
 * DÉCLENCHE L'AUTO-SCALING si le seuil est atteint
 * SUPPORTE les codes d'invitation pour serveurs verrouillés
 */
export const createProfile = async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const playerId = req.playerId; // Injecté par authMiddleware
    const { characterName, characterClass, characterRace, invitationCode } = req.body;

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
        validClasses: ["paladin", "hunter", "mage", "priest", "rogue", "warlock"]
      });
    }

    // Valider la race
    if (!isValidRace(characterRace)) {
      return res.status(400).json({ 
        error: "Invalid character race",
        validRaces: [
          "human_elion", "dwarf_rune", "winged_lunaris", "sylphide_forest",
          "varkyns_beast", "morhri_insect", "ghrannite_stone", "selenite_lunar"
        ]
      });
    }

    // Vérifie que le serveur existe
    const server = await ServerModel.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    // Vérifie qu'il n'y a pas déjà un profil
    const existingProfile = await ServerProfile.findOne({ playerId, serverId });
    if (existingProfile) {
      return res.status(400).json({ error: "Profile already exists on this server" });
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

    // Vérifier si le joueur peut rejoindre le serveur
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

    // Créer le profil
    const profile: IServerProfile = await ServerProfile.create({
      playerId,
      serverId,
      characterName,
      class: characterClass,
      race: characterRace,
      level: 1,
      xp: 0,
      gold: 0
    });

    // Si un code d'invitation a été utilisé, le marquer comme utilisé
    if (hasValidInvitation && invitationCode) {
      await useInvitationCode(invitationCode, playerId, serverId);
    }

    // ⚡ INCRÉMENTER LE COMPTEUR DE JOUEURS (déclenche l'auto-scaling si besoin)
    await incrementPlayerCount(serverId);

    res.status(201).json({
      message: "Profile created",
      profile: {
        profileId: profile._id,
        serverId: profile.serverId,
        characterName: profile.characterName,
        level: profile.level,
        xp: profile.xp,
        gold: profile.gold,
        class: profile.class,
        race: profile.race
      },
      usedInvitation: hasValidInvitation
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

    const profiles: IServerProfile[] = await ServerProfile.find({ playerId });

    res.json({
      profiles: profiles.map(p => ({
        profileId: p._id,
        serverId: p.serverId,
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
 * DELETE /profile/:serverId
 * Supprime un profil sur un serveur
 * DÉCRÉMENTE le compteur de joueurs
 */
export const deleteProfile = async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const playerId = req.playerId;

    if (!playerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const profile = await ServerProfile.findOne({ playerId, serverId });

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    await profile.deleteOne();

    // ⚡ DÉCRÉMENTER LE COMPTEUR DE JOUEURS
    await decrementPlayerCount(serverId);

    res.json({
      message: "Profile deleted",
      serverId: serverId
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
