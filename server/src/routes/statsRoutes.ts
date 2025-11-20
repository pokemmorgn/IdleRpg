import { Router } from "express";

// ===== CONTROLLERS STATS & CLASSES (MongoDB) =====
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

// ============================================================================
// ==============================   CLASSES   =================================
// ============================================================================

router.get("/classes", getAllClasses);
router.get("/classes/:className", getClassByName);
router.post("/classes", createClass);
router.put("/classes/:className", updateClass);

// ============================================================================
// ===============================   PLAYER   =================================
// ============================================================================

router.get("/player/:profileId", getPlayerStats);
router.post("/player/:profileId/recalculate", recalculatePlayerStats);
router.post("/player/:profileId/level-up", simulateLevelUp);

export default router;
