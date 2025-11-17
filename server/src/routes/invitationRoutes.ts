import { Router } from "express";
import { 
  createInvitation, 
  listInvitations, 
  validateInvitation,
  getInvitationInfo
} from "../controllers/invitationController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Toutes les routes d'invitation nécessitent une authentification
router.use(authMiddleware);

// GET /invitation/info - Récupère les infos du système d'invitation
router.get("/info", getInvitationInfo);

// POST /invitation/validate - Valide un code d'invitation
router.post("/validate", validateInvitation);

// GET /invitation/:serverId - Liste les invitations du joueur sur un serveur
router.get("/:serverId", listInvitations);

// POST /invitation/:serverId - Crée un nouveau code d'invitation
router.post("/:serverId", createInvitation);

export default router;
