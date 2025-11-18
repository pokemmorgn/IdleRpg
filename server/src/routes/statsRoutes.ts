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

const router = Router();

// ===== ROUTES CLASSES =====

/**
 * GET /stats/classes
 * Liste toutes les classes disponibles avec leurs stats
 */
router.get("/classes", getAllClasses);

/**
 * GET /stats/classes/:className
 * Récupère les stats d'une classe spécifique
 */
router.get("/classes/:className", getClassByName);

/**
 * POST /stats/classes (Admin)
 * Créer une nouvelle classe avec ses stats
 * 
 * Body:
 * {
 *   "class": "warrior",
 *   "displayName": "Guerrier",
 *   "description": "Tank robuste...",
 *   "resourceType": "rage",
 *   "baseMoveSpeed": 5.0,
 *   "baseStats": {
 *     "strength": 20,
 *     "agility": 12,
 *     "intelligence": 5,
 *     "endurance": 25,
 *     "spirit": 5
 *   },
 *   "statsPerLevel": {
 *     "strength": 2,
 *     "agility": 1,
 *     "intelligence": 0,
 *     "endurance": 3,
 *     "spirit": 0
 *   }
 * }
 */
router.post("/classes", createClass);

/**
 * PUT /stats/classes/:className (Admin)
 * Modifier les stats d'une classe
 */
router.put("/classes/:className", updateClass);

// ===== ROUTES PLAYER =====

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
 * Simule un level up (pour test)
 * 
 * Body:
 * {
 *   "newLevel": 10
 * }
 */
router.post("/player/:profileId/level-up", simulateLevelUp);

export default router;
