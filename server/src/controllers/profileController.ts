import { Request, Response } from "express";
import ServerProfile, { IServerProfile } from "../models/ServerProfile";
import ServerModel from "../models/Server";

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
 */
export const createProfile = async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const playerId = req.playerId; // Injecté par authMiddleware
    const { characterName, characterClass } = req.body;

    if (!playerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!characterName) {
      return res.status(400).json({ error: "Character name is required" });
    }

    // Vérifie que le serveur existe et est accessible
    const server = await ServerModel.findOne({ serverId });
    if (!server) {
      return res.status(404).json({ error: "Server not found" });
    }

    if (server.status !== "online") {
      return res.status(400).json({ error: `Server is ${server.status}` });
    }

    // Vérifie qu'il n'y a pas déjà un profil
    const existingProfile = await ServerProfile.findOne({ playerId, serverId });
    if (existingProfile) {
      return res.status(400).json({ error: "Profile already exists on this server" });
    }

    // Crée le profil
    const profile: IServerProfile = await ServerProfile.create({
      playerId,
      serverId,
      characterName,
      class: characterClass || "warrior",
      level: 1,
      xp: 0,
      gold: 0
    });

    res.status(201).json({
      message: "Profile created",
      profile: {
        profileId: profile._id,
        serverId: profile.serverId,
        characterName: profile.characterName,
        level: profile.level,
        xp: profile.xp,
        gold: profile.gold,
        class: profile.class
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /profiles
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
        lastOnline: p.lastOnline
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
