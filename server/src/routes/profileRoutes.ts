import { Router } from "express";
import { getProfile, createProfile, listProfiles, deleteProfile } from "../controllers/profileController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Toutes les routes de profil nécessitent une authentification
router.use(authMiddleware);

// GET /profile - Liste tous les profils du joueur
router.get("/", listProfiles);

// GET /profile/:serverId - Récupère le profil sur un serveur
router.get("/:serverId", getProfile);

// POST /profile/:serverId - Crée un profil sur un serveur
router.post("/:serverId", createProfile);

// DELETE /profile/:serverId - Supprime un profil sur un serveur
router.delete("/:serverId", deleteProfile);

export default router;
