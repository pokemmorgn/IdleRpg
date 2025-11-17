import { Router } from "express";
import { getProfile, createProfile, listProfiles, deleteProfile } from "../controllers/profileController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Toutes les routes de profil nécessitent une authentification
router.use(authMiddleware);

// GET /profile - Liste tous les profils du joueur (tous serveurs)
router.get("/", listProfiles);

// GET /profile/:serverId - Récupère tous les profils du joueur sur un serveur
router.get("/:serverId", getProfile);

// POST /profile/:serverId - Crée un profil sur un serveur
router.post("/:serverId", createProfile);

// DELETE /profile/:serverId/:characterSlot - Supprime un profil sur un serveur (par slot)
router.delete("/:serverId/:characterSlot", deleteProfile);

export default router;
