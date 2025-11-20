import { Router } from "express";

// ===== CONTROLLERS CLASSES =====
import {
  getAllClasses,
  getClassByName,
  createClass,
  updateClass,
  getPlayerStats,
  recalculatePlayerStats,
  simulateLevelUp
} from "../controllers/statsController";

// ===== CONTROLLERS RACES =====
import {
  getAllRaces,
  getRace,
  getRaceAllowedClasses,
  getCreationData
} from "../controllers/raceController";

const router = Router();

// ============================================================================
// ==============================   CLASSES   =================================
// ============================================================================

/**
 * GET /stats/classes
 * Liste toutes les classes avec leurs stats (MongoDB)
 */
router.get("/classes", getAllClasses);

/**
 * GET /stats/classes/:className
 * Récupère les stats d'une classe spécifique
 */
router.get("/classes/:className", getClassByName);

/**
 * POST /stats/classes
 * Créer une nouvelle classe (ADMIN)
 */
router.post("/classes", createClass);

/**
 * PUT /stats/classes/:className
 * Modifier les stats d'une classe (ADMIN)
 */
router.put("/classes/:className", updateClass);

// ============================================================================
// ==============================   RACES     =================================
// ============================================================================

/**
 * GET /stats/races
 * Liste toutes les races (depuis races.config)
 */
router.get("/races", getAllRaces);

/**
 * GET /stats/races/:raceId
 * Détails d'une race
 */
router.get("/races/:raceId", getRace);

/**
 * GET /stats/races/:raceId/classes
 * Liste des classes autorisées pour cette race
 */
router.get("/races/:raceId/classes", getRaceAllowedClasses);

// ============================================================================
// ==========================   CREATION DATA   ================================
// ============================================================================

/**
 * GET /stats/creation-data
 * Version ADVANCED :
 * - races (config)
 * - classes (config)
 * - restrictions (race → classId[])
 * - byRace (race → objets classes complets)
 */
router.get("/creation-data", getCreationData);

// ============================================================================
// ===============================   PLAYER   =================================
// ============================================================================

/**
 * GET /stats/player/:profileId
 * Récupère les stats calculées d'un joueur
 */
router.get("/player/:profileId", getPlayerStats);

/**
 * POST /stats/player/:profileId/recalculate
 * Force le recalcul des stats d'un joueur
 */
router.post("/player/:profileId/recalculate", recalculatePlayerStats);

/**
 * POST /stats/player/:profileId/level-up
 * Simule un gain de niveau
 */
router.post("/player/:profileId/level-up", simulateLevelUp);

export default router;
