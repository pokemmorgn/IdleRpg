import { Request, Response } from "express";
import {
  ALL_CLASSES,
  getClassesByRole,
  getAllowedClassesForRace,
  ClassRole
} from "../config/classes.config";

import {
  ALL_RACES,
  getRacesByFaction,
  isValidRace,
  getRaceById,
  Faction
} from "../config/races.config";

// ------------------------------------------------------
// GET /game-data/classes
// ------------------------------------------------------
export const listClasses = async (req: Request, res: Response) => {
  const { role } = req.query;

  if (role && typeof role === "string") {
    const upper = role.toUpperCase() as ClassRole;
    return res.json({
      filteredBy: upper,
      classes: getClassesByRole(upper)
    });
  }

  res.json({ classes: ALL_CLASSES });
};

// ------------------------------------------------------
// GET /game-data/races
// ------------------------------------------------------
export const listRaces = async (req: Request, res: Response) => {
  const { faction } = req.query;

  if (faction) {
    const upper = (faction as string).toUpperCase() as Faction;
    return res.json({
      filteredBy: upper,
      races: getRacesByFaction(upper)
    });
  }

  res.json({ races: ALL_RACES });
};

// ------------------------------------------------------
// GET /game-data/factions
// ------------------------------------------------------
export const listFactions = async (_req: Request, res: Response) => {
  res.json({
    factions: [
      { factionId: "AURION", races: getRacesByFaction("AURION").map(r => r.raceId) },
      { factionId: "OMBRE", races: getRacesByFaction("OMBRE").map(r => r.raceId) }
    ]
  });
};

// ------------------------------------------------------
// GET /game-data/allowed-classes/:raceId
// ------------------------------------------------------
export const getAllowedClasses = async (req: Request, res: Response) => {
  const { raceId } = req.params;

  if (!isValidRace(raceId)) {
    return res.status(404).json({ error: "Race not found" });
  }

  const race = getRaceById(raceId)!;

  res.json({
    raceId,
    bonusesLocalized: race.bonusesLocalized,  // ⬅ IMPORTANT
    allowedClasses: getAllowedClassesForRace(raceId)
  });
};
