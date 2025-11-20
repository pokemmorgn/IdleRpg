import { Request, Response } from "express";
import {
  ALL_RACES,
  getRaceById,
  getAllowedClassesForRace
} from "../config/races.config";

export function getAllRaces(req: Request, res: Response) {
  return res.json({ races: ALL_RACES });
}

export function getRace(req: Request, res: Response) {
  const race = getRaceById(req.params.raceId);

  if (!race) {
    return res.status(404).json({ error: "Race not found" });
  }

  return res.json(race);
}

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
