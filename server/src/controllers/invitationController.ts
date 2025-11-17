import { Request, Response } from "express";
import { 
  createInvitationCode, 
  validateInvitationCode,
  getPlayerInvitations,
  countActiveInvitations
} from "../services/invitationService";
import ServerProfile from "../models/ServerProfile";
import { 
  INVITATION_SYSTEM_ENABLED,
  INVITATION_LEVEL_REQUIREMENT,
  MAX_INVITATIONS_PER_PLAYER,
  INVITATION_CODE_EXPIRY_DAYS
} from "../config/servers.config";

/**
 * POST /invitation/:serverId
 * Crée un nouveau code d'invitation pour un serveur
 */
export const createInvitation = async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const playerId = req.playerId;

    if (!playerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!INVITATION_SYSTEM_ENABLED) {
      return res.status(400).json({ error: "Invitation system is disabled" });
    }

    // Vérifier que le joueur a un profil sur ce serveur
    const profile = await ServerProfile.findOne({ playerId, serverId });
    if (!profile) {
      return res.status(404).json({ error: "No profile on this server" });
    }

    // Créer le code d'invitation
    const result = await createInvitationCode(
      playerId,
      profile._id.toString(),
      serverId
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({
      message: "Invitation code created",
      code: result.code,
      serverId: serverId,
      expiresInDays: INVITATION_CODE_EXPIRY_DAYS
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /invitation/:serverId
 * Liste les invitations du joueur sur un serveur
 */
export const listInvitations = async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const playerId = req.playerId;

    if (!playerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const invitations = await getPlayerInvitations(playerId, serverId);
    const activeCount = await countActiveInvitations(playerId, serverId);

    res.json({
      serverId: serverId,
      invitations: invitations.map(inv => ({
        code: inv.code,
        used: inv.used,
        usedBy: inv.usedBy,
        usedAt: inv.usedAt,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        isExpired: inv.expiresAt < new Date(),
        isActive: !inv.used && inv.expiresAt > new Date()
      })),
      activeCount: activeCount,
      maxInvitations: MAX_INVITATIONS_PER_PLAYER,
      canCreateMore: activeCount < MAX_INVITATIONS_PER_PLAYER
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /invitation/validate
 * Valide un code d'invitation
 */
export const validateInvitation = async (req: Request, res: Response) => {
  try {
    const { code, serverId } = req.body;
    const playerId = req.playerId;

    if (!playerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!code || !serverId) {
      return res.status(400).json({ error: "Code and serverId are required" });
    }

    const result = await validateInvitationCode(code, playerId, serverId);

    if (!result.valid) {
      return res.status(400).json({ 
        valid: false, 
        error: result.error 
      });
    }

    res.json({
      valid: true,
      serverId: serverId,
      message: "Invitation code is valid"
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /invitation/info
 * Récupère les infos du système d'invitation
 */
export const getInvitationInfo = async (req: Request, res: Response) => {
  try {
    const playerId = req.playerId;

    if (!playerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    res.json({
      enabled: INVITATION_SYSTEM_ENABLED,
      levelRequirement: INVITATION_LEVEL_REQUIREMENT,
      maxInvitationsPerPlayer: MAX_INVITATIONS_PER_PLAYER,
      codeExpiryDays: INVITATION_CODE_EXPIRY_DAYS
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
