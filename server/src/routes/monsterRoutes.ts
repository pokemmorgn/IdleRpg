import express from "express";
import {
  createMonster,
  bulkCreateMonsters,
  listMonsters,
  getMonster,
  updateMonster,
  deleteMonster
} from "../controllers/monsterController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

router.use(authMiddleware);

router.post("/:serverId", createMonster);
router.post("/:serverId/bulk", bulkCreateMonsters);
router.get("/:serverId", listMonsters);
router.get("/:serverId/:monsterId", getMonster);
router.put("/:serverId/:monsterId", updateMonster);
router.delete("/:serverId/:monsterId", deleteMonster);

export default router;
