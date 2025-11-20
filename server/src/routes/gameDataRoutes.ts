import { Router } from "express";

import { 
  listClasses, 
  listRaces, 
  listFactions, 
  getAllowedClasses,
  getCreationData   // <<< AJOUT ICI
} from "../controllers/gameDataController";

const router = Router();

// =========================
// ROUTE PRINCIPALE CREATION
// =========================

// GET /game-data/creation
// Renvoie races + classes + bonus + lore + restrictions
router.get("/creation", getCreationData);

// =========================
// AUTRES ROUTES
// =========================

// GET /game-data/classes
// Query optionnel: ?role=TANK|DPS|HEALER|SUPPORT
router.get("/classes", listClasses);

// GET /game-data/races
// Query optionnel: ?faction=AURION|OMBRE
router.get("/races", listRaces);

// GET /game-data/factions
router.get("/factions", listFactions);

// GET /game-data/allowed-classes/:raceId
router.get("/allowed-classes/:raceId", getAllowedClasses);

export default router;
