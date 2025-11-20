import { Router } from "express";
import { 
  listClasses,
  listRaces,
  listFactions,
  getAllowedClasses,
  getCreationData
} from "../controllers/gameDataController";

const router = Router();

// === Classes ===
router.get("/classes", listClasses);

// === Races ===
router.get("/races", listRaces);

// === Factions + regroupement des races ===
router.get("/factions", listFactions);

// === Restrictions classes/races ===
router.get("/allowed-classes/:raceId", getAllowedClasses);

// === Pack complet pour l’écran de création ===
router.get("/creation", getCreationData);

export default router;
