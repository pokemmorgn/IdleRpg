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
  Faction
} from "../config/races.config";

/* ============================================================================
   GET /game-data/classes
============================================================================ */
export const listClasses = async (req: Request, res: Response) => {
  try {
    const { role } = req.query;

    if (role && typeof role === "string") {
      const upperRole = role.toUpperCase() as ClassRole;
      const filtered = getClassesByRole(upperRole);

      return res.json({
        filteredBy: upperRole,
        classes: filtered
      });
    }

    res.json({ classes: ALL_CLASSES });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/* ============================================================================
   GET /game-data/races
============================================================================ */
export const listRaces = async (req: Request, res: Response) => {
  try {
    const { faction } = req.query;

    if (faction && typeof faction === "string") {
      const f = faction.toUpperCase() as Faction;

      if (f !== "AURION" && f !== "OMBRE") {
        return res.status(400).json({ error: "Invalid faction" });
      }

      return res.json({
        filteredBy: f,
        races: getRacesByFaction(f)
      });
    }

    res.json({ races: ALL_RACES });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/* ============================================================================
   GET /game-data/factions
============================================================================ */
export const listFactions = async (req: Request, res: Response) => {
  try {
    res.json({
      factions: [
        {
          factionId: "AURION",
          nameKey: "faction.aurion.name",
          descriptionKey: "faction.aurion.description",
          races: getRacesByFaction("AURION").map(r => r.raceId)
        },
        {
          factionId: "OMBRE",
          nameKey: "faction.ombre.name",
          descriptionKey: "faction.ombre.description",
          races: getRacesByFaction("OMBRE").map(r => r.raceId)
        }
      ]
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/* ============================================================================
   GET /game-data/allowed-classes/:raceId
============================================================================ */
export const getAllowedClasses = async (req: Request, res: Response) => {
  try {
    const { raceId } = req.params;

    if (!isValidRace(raceId)) {
      return res.status(404).json({ error: "Race not found", raceId });
    }

    const allowed = getAllowedClassesForRace(raceId);

    res.json({
      raceId,
      totalAllowed: allowed.length,
      totalClasses: ALL_CLASSES.length,
      allowedClasses: allowed
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/* ============================================================================
   GET /game-data/creation
   => Pack complet pour l’écran de création Unity
============================================================================ */
export const getCreationData = async (req: Request, res: Response) => {
  try {
    const byRace: Record<string, any[]> = {};

    for (const race of ALL_RACES) {
      byRace[race.raceId] = getAllowedClassesForRace(race.raceId);
    }

    res.json({
      races: ALL_RACES,
      classes: ALL_CLASSES,
      byRace
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
