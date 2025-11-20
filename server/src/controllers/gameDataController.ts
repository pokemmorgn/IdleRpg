import { Request, Response } from "express";
import { ALL_CLASSES, getClassesByRole, getAllowedClassesForRace, ClassRole } from "../config/classes.config";
import { ALL_RACES, getRacesByFaction, isValidRace, Faction, getRaceById } from "../config/races.config";

/**
 * GET /game-data/classes
 */
export const listClasses = async (req: Request, res: Response) => {
  try {
    const { role } = req.query;

    if (role && typeof role === "string") {
      const upperRole = role.toUpperCase() as ClassRole;
      const classes = getClassesByRole(upperRole);
      return res.json({
        filteredBy: upperRole,
        classes
      });
    }

    res.json({ classes: ALL_CLASSES });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /game-data/races
 */
export const listRaces = async (req: Request, res: Response) => {
  try {
    const { faction } = req.query;

    if (faction && typeof faction === "string") {
      const upperFaction = faction.toUpperCase() as Faction;

      if (!["AURION", "OMBRE"].includes(upperFaction)) {
        return res.status(400).json({ error: "Invalid faction" });
      }

      return res.json({
        filteredBy: upperFaction,
        races: getRacesByFaction(upperFaction)
      });
    }

    // Retour complet
    return res.json({ races: ALL_RACES });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /game-data/factions
 */
export const listFactions = async (_req: Request, res: Response) => {
  try {
    res.json({
      factions: [
        {
          factionId: "AURION",
          races: getRacesByFaction("AURION").map(r => r.raceId)
        },
        {
          factionId: "OMBRE",
          races: getRacesByFaction("OMBRE").map(r => r.raceId)
        }
      ]
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /game-data/allowed-classes/:raceId
 */
export const getAllowedClasses = async (req: Request, res: Response) => {
  try {
    const { raceId } = req.params;

    if (!isValidRace(raceId)) {
      return res.status(404).json({ error: "Race not found" });
    }

    const allowed = getAllowedClassesForRace(raceId);
    const race = getRaceById(raceId)!;

    res.json({
      raceId,
      bonusesReadable: race.bonusesReadable,
      allowedClasses: allowed
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
