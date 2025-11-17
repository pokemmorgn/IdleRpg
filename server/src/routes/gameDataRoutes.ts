import { Router } from "express";
import { listClasses, listRaces, listFactions } from "../controllers/gameDataController";

const router = Router();

// Routes publiques (pas besoin d'authentification pour récupérer les classes/races)

// GET /game-data/classes - Liste toutes les classes
// Query params optionnel: ?role=TANK|DPS|HEALER|SUPPORT
router.get("/classes", listClasses);

// GET /game-data/races - Liste toutes les races
// Query params optionnel: ?faction=AURION|OMBRE
router.get("/races", listRaces);

// GET /game-data/factions - Liste les factions avec leurs races
router.get("/factions", listFactions);

export default router;
