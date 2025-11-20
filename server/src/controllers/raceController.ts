import { Request, Response } from "express";
import {
  ALL_RACES,
  getRaceById
} from "../config/races.config";

import {
  ALL_CLASSES,
  CLASS_RACE_RESTRICTIONS,
  getAllowedClassesForRace
} from "../config/classes.config";

/**
 * GET /stats/races
 */
export function getAllRaces(req: Request, res: Response) {
  return res.json({ races: ALL_RACES });
}

/**
 * GET /stats/races/:raceId
 */
export function getRace(req: Request, res: Response) {
  const race = getRaceById(req.params.raceId);

  if (!race) {
    return res.status(404).json({ error: "Race not found" });
  }

  return res.json(race);
}

/**
 * GET /stats/races/:raceId/classes
 */
export function getRaceAllowedClasses(req: Request, res: Response) {
  const race = getRaceById(req.params.raceId);

  if (!race) {
    return res.status(404).json({ error: "Race not found" });
  }

  const classes = getAllowedClassesForRace(race.raceId);

  return res.json({
    race: race.raceId,
    classes
  });
}

/**
 * GET /stats/creation-data
 * ➜ Version ADVANCED :
 *   - races
 *   - classes
 *   - restrictions
 *   - byRace (classes filtrées, déjà préparées)
 */
export function getCreationData(req: Request, res: Response) {
  const byRace: Record<string, any[]> = {};

  for (const race of ALL_RACES) {
    const allowed = CLASS_RACE_RESTRICTIONS[race.raceId] || [];
    byRace[race.raceId] = ALL_CLASSES.filter(cls =>
      allowed.includes(cls.classId)
    );
  }

  return res.json({
    races: ALL_RACES,
    classes: ALL_CLASSES,
    restrictions: CLASS_RACE_RESTRICTIONS,
    byRace
  });
}
