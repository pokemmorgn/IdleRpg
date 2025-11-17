/**
 * Service de gestion des codes d'invitation
 */

import Invitation, { IInvitation } from "../models/Invitation";
import ServerProfile from "../models/ServerProfile";
import { 
  generateInvitationCode,
  INVITATION_LEVEL_REQUIREMENT,
  MAX_INVITATIONS_PER_PLAYER,
  INVITATION_CODE_EXPIRY_DAYS,
  INVITATION_SYSTEM_ENABLED
} from "../config/servers.config";

/**
 * Génère un nouveau code d'invitation pour un joueur
 */
export async function createInvitationCode(
  playerId: string,
  profileId: string,
  serverId: string
): Promise<{ success: boolean; code?: string; error?: string }> {
  try {
    // Vérifier que le système d'invitation est activé
    if (!INVITATION_SYSTEM_ENABLED) {
      return { success: false, error: "Invitation system is disabled" };
    }

    // Vérifier que le profil existe
    const profile = await ServerProfile.findById(profileId);
    if (!profile) {
      return { success: false, error: "Profile not found" };
    }

    // Vérifier que le profil appartient bien au joueur
    if (profile.playerId.toString() !== playerId) {
      return { success: false, error: "Profile does not belong to player" };
    }

    // Vérifier que le profil est sur le bon serveur
    if (profile.serverId !== serverId) {
      return { success: false, error: "Profile is not on this server" };
    }

    // Vérifier le niveau du joueur
    if (profile.level < INVITATION_LEVEL_REQUIREMENT) {
      return { 
        success: false, 
        error: `Level ${INVITATION_LEVEL_REQUIREMENT} required to create invitations` 
      };
    }

    // Compter les invitations actives (non utilisées et non expirées)
    const activeInvitationsCount = await Invitation.countDocuments({
      inviterPlayerId: playerId,
      serverId: serverId,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (activeInvitationsCount >= MAX_INVITATIONS_PER_PLAYER) {
      return { 
        success: false, 
        error: `Maximum ${MAX_INVITATIONS_PER_PLAYER} active invitations reached` 
      };
    }

    // Générer un code unique
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = generateInvitationCode();
      const existing = await Invitation.findOne({ code });
      
      if (!existing) {
        break;
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        return { success: false, error: "Failed to generate unique code" };
      }
    } while (true);

    // Calculer la date d'expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_CODE_EXPIRY_DAYS);

    // Créer l'invitation
    const invitation = await Invitation.create({
      code: code,
      inviterProfileId: profileId,
      inviterPlayerId: playerId,
      serverId: serverId,
      used: false,
      usedBy: null,
      usedAt: null,
      expiresAt: expiresAt
    });

    console.log(`✉️ Code d'invitation créé: ${code} par ${profile.characterName} pour ${serverId}`);

    return { success: true, code: invitation.code };

  } catch (error: any) {
    console.error("❌ Erreur lors de la création du code d'invitation:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Vérifie si un code d'invitation est valide
 */
export async function validateInvitationCode(
  code: string,
  playerId: string,
  serverId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Vérifier que le système d'invitation est activé
    if (!INVITATION_SYSTEM_ENABLED) {
      return { valid: false, error: "Invitation system is disabled" };
    }

    // Rechercher l'invitation
    const invitation = await Invitation.findOne({ code: code.toUpperCase() });

    if (!invitation) {
      return { valid: false, error: "Invalid invitation code" };
    }

    // Vérifier que c'est pour le bon serveur
    if (invitation.serverId !== serverId) {
      return { valid: false, error: "Invitation code is for a different server" };
    }

    // Vérifier qu'elle n'a pas été utilisée
    if (invitation.used) {
      return { valid: false, error: "Invitation code already used" };
    }

    // Vérifier qu'elle n'est pas expirée
    if (invitation.expiresAt < new Date()) {
      return { valid: false, error: "Invitation code expired" };
    }

    // Vérifier que le joueur ne s'invite pas lui-même
    if (invitation.inviterPlayerId.toString() === playerId) {
      return { valid: false, error: "Cannot use your own invitation code" };
    }

    return { valid: true };

  } catch (error: any) {
    console.error("❌ Erreur lors de la validation du code:", error.message);
    return { valid: false, error: error.message };
  }
}

/**
 * Utilise un code d'invitation
 */
export async function useInvitationCode(
  code: string,
  playerId: string,
  serverId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Valider le code
    const validation = await validateInvitationCode(code, playerId, serverId);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Marquer comme utilisé
    const invitation = await Invitation.findOneAndUpdate(
      { code: code.toUpperCase() },
      {
        used: true,
        usedBy: playerId,
        usedAt: new Date()
      },
      { new: true }
    );

    if (!invitation) {
      return { success: false, error: "Invitation code not found" };
    }

    console.log(`✅ Code d'invitation utilisé: ${code} par ${playerId} sur ${serverId}`);

    return { success: true };

  } catch (error: any) {
    console.error("❌ Erreur lors de l'utilisation du code:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Liste les invitations d'un joueur sur un serveur
 */
export async function getPlayerInvitations(
  playerId: string,
  serverId: string
): Promise<IInvitation[]> {
  try {
    const invitations = await Invitation.find({
      inviterPlayerId: playerId,
      serverId: serverId
    }).sort({ createdAt: -1 });

    return invitations;

  } catch (error: any) {
    console.error("❌ Erreur lors de la récupération des invitations:", error.message);
    return [];
  }
}

/**
 * Compte les invitations actives d'un joueur
 */
export async function countActiveInvitations(
  playerId: string,
  serverId: string
): Promise<number> {
  try {
    const count = await Invitation.countDocuments({
      inviterPlayerId: playerId,
      serverId: serverId,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    return count;

  } catch (error: any) {
    console.error("❌ Erreur lors du comptage des invitations:", error.message);
    return 0;
  }
}
