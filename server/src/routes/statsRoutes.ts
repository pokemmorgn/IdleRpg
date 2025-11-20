import { Router } from "express";
import {
  getAllClasses,
  getClassByName,
  createClass,
  updateClass,
  getPlayerStats,
  recalculatePlayerStats,
  simulateLevelUp
} from "../controllers/statsController";

import {
  getAllRaces,
  getRace,
  getRaceAllowedClasses
} from "../controllers/raceController";

const router = Router();

// ===== ROUTES CLASSES =====

router.get("/classes", getAllClasses);
router.get("/classes/:className", getClassByName);
router.post("/classes", createClass);
router.put("/classes/:className", updateClass);

// ===== ROUTES RACES =====

/**
 * GET /stats/races
 * Liste toutes les races (clé nom, desc, lore, faction, bonus…)
 */
router.get("/races", getAllRaces);

/**
 * GET /stats/races/:raceId
 * Récupère une race spécifique
 */
router.get("/races/:raceId", getRace);

/**
 * GET /stats/races/:raceId/classes
 * Récupère les classes autorisées pour cette race
 */
router.get("/races/:raceId/classes", getRaceAllowedClasses);

// ===== ROUTES PLAYER =====

router.get("/player/:profileId", getPlayerStats);
router.post("/player/:profileId/recalculate", recalculatePlayerStats);
router.post("/player/:profileId/level-up", simulateLevelUp);

export default router;
