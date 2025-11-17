import { Router } from "express";
import { listServers, getServer } from "../controllers/serverController";

const router = Router();

// GET /servers - Liste tous les serveurs
router.get("/", listServers);

// GET /servers/:serverId - Détails d'un serveur
router.get("/:serverId", getServer);

export default router;
