import express from "express";
import {
  createDialogue,
  bulkCreateDialogues,
  listDialogues,
  getDialogue,
  updateDialogue,
  deleteDialogue,
  validateDialogue
} from "../controllers/dialogueController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticateToken);

/**
 * POST /dialogues
 * Créer un dialogue
 */
router.post("/", createDialogue);

/**
 * POST /dialogues/bulk
 * Créer plusieurs dialogues d'un coup
 */
router.post("/bulk", bulkCreateDialogues);

/**
 * GET /dialogues
 * Lister tous les dialogues (avec filtre optionnel par npcId)
 */
router.get("/", listDialogues);

/**
 * GET /dialogues/:dialogueId
 * Récupérer un dialogue spécifique
 */
router.get("/:dialogueId", getDialogue);

/**
 * GET /dialogues/:dialogueId/validate
 * Valider un dialogue (vérifier la cohérence)
 */
router.get("/:dialogueId/validate", validateDialogue);

/**
 * PUT /dialogues/:dialogueId
 * Modifier un dialogue
 */
router.put("/:dialogueId", updateDialogue);

/**
 * DELETE /dialogues/:dialogueId
 * Supprimer un dialogue
 */
router.delete("/:dialogueId", deleteDialogue);

export default router;
