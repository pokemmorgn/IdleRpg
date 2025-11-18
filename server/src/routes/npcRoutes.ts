import { Router } from "express";
import { 
  createNPC, 
  listNPCs, 
  getNPC, 
  updateNPC, 
  deleteNPC,
  bulkCreateNPCs
} from "../controllers/npcController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Toutes les routes NPC nécessitent une authentification
// (Unity Editor doit s'authentifier pour créer/modifier les NPC)
router.use(authMiddleware);

// POST /npcs/:serverId - Créer un NPC sur un serveur
router.post("/:serverId", createNPC);

// POST /npcs/:serverId/bulk - Créer plusieurs NPC d'un coup (utile pour Unity Editor)
router.post("/:serverId/bulk", bulkCreateNPCs);

// GET /npcs/:serverId - Lister tous les NPC d'un serveur
router.get("/:serverId", listNPCs);

// GET /npcs/:serverId/:npcId - Détails d'un NPC spécifique
router.get("/:serverId/:npcId", getNPC);

// PUT /npcs/:serverId/:npcId - Modifier un NPC
router.put("/:serverId/:npcId", updateNPC);

// DELETE /npcs/:serverId/:npcId - Supprimer un NPC
router.delete("/:serverId/:npcId", deleteNPC);

export default router;
