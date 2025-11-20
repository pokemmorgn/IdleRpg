import { Request, Response } from "express";

import { 
  ALL_RACES, 
  getRacesByFaction, 
  getReadableRaceBonuses,
  getRaceById
} from "../config/races.config";

import { 
  ALL_CLASSES, 
  getAllowedClassesForRace,
  CLASS_RACE_RESTRICTIONS
} from "../config/classes.config";


/**
 * GET /game-data/creation
 * Renvoie toutes les informations nécessaires à l'écran de création de personnage
 */
export const getCreationData = async (req: Request, res: Response) => {
  try {

    const races = ALL_RACES.map(r => ({
      raceId: r.raceId,
      nameKey: r.nameKey,
      descriptionKey: r.descriptionKey,
      loreKey: r.loreKey,
      faction: r.faction,
      bonuses: getReadableRaceBonuses(r)   // <<--- BONUS RACIAUX LISIBLES
    }));

    const classes = ALL_CLASSES.map(c => ({
      classId: c.classId,
      nameKey: c.nameKey,
      descriptionKey: c.descriptionKey,
      loreKey: c.loreKey,
      roles: c.roles
    }));

    res.json({
      races,
      classes,
      restrictions: CLASS_RACE_RESTRICTIONS
    });

  } catch (err: any) {
    console.error("❌ getCreationData error:", err);
    res.status(500).json({ error: err.message });
  }
};
