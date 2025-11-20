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

/* ============================================================
   GET /game-data/classes
   Liste toutes les classes ou filtrées par rôle
============================================================ */
export const listClasses = async (req: Request, res: Response) => {
  try {
    const { role } = req.query;

    if (role && typeof role === "string") {
      const upperRole = role.toUpperCase() as ClassRole;
      const classes = getClassesByRole(upperRole);

      return res.json({
        filteredBy: upperRole,
        classes: classes.map(cls => ({
          classId: cls.classId,
          nameKey: cls.nameKey,
          descriptionKey: cls.descriptionKey,
          loreKey: cls.loreKey,
          roles: cls.roles
        }))
      });
    }

    res.json({
      classes: ALL_CLASSES.map(cls => ({
        classId: cls.classId,
        nameKey: cls.nameKey,
        descriptionKey: cls.descriptionKey,
        loreKey: cls.loreKey,
        roles: cls.roles
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/* ============================================================
   GET /game-data/races
   Liste toutes les races ou filtrées par faction
============================================================ */
export const listRaces = async (req: Request, res: Response) => {
  try {
    const { faction } = req.query;

    if (faction && typeof faction === "string") {
      const upperFaction = faction.toUpperCase() as Faction;

      if (upperFaction !== "AURION" && upperFaction !== "OMBRE") {
        return res.status(400).json({
          error: "Invalid faction. Must be AURION or OMBRE"
        });
      }

      const races = getRacesByFaction(upperFaction);

      return res.json({
        filteredBy: upperFaction,
        races: races.map(race => ({
          raceId: race.raceId,
          nameKey: race.nameKey,
          descriptionKey: race.descriptionKey,
          loreKey: race.loreKey,
          faction: race.faction,
          statsModifiers: race.statsModifiers
        }))
      });
    }

    res.json({
      races: ALL_RACES.map(race => ({
        raceId: race.raceId,
        nameKey: race.nameKey,
        descriptionKey: race.descriptionKey,
        loreKey: race.loreKey,
        faction: race.faction,
        statsModifiers: race.statsModifiers
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/* ============================================================
   GET /game-data/factions
============================================================ */
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

/* ============================================================
   GET /game-data/allowed-classes/:raceId
   Retourne les classes jouables pour une race donnée
============================================================ */
export const getAllowedClasses = async (req: Request, res: Response) => {
  try {
    const { raceId } = req.params;

    if (!isValidRace(raceId)) {
      return res.status(404).json({
        error: "Race not found",
        raceId
      });
    }

    const allowed = getAllowedClassesForRace(raceId);

    res.json({
      raceId,
      allowedClasses: allowed.map(cls => ({
        classId: cls.classId,
        nameKey: cls.nameKey,
        descriptionKey: cls.descriptionKey,
        loreKey: cls.loreKey,
        roles: cls.roles
      })),
      totalAllowed: allowed.length,
      totalClasses: ALL_CLASSES.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/* ============================================================
   GET /game-data/creation
   ⚡ Route complète pour l'écran de création personnage
============================================================ */
export const getCreationData = async (req: Request, res: Response) => {
  try {
    const byRace: Record<string, any[]> = {};

    for (const race of ALL_RACES) {
      const allowed = getAllowedClassesForRace(race.raceId);

      byRace[race.raceId] = allowed.map(cls => ({
        classId: cls.classId,
        nameKey: cls.nameKey,
        descriptionKey: cls.descriptionKey,
        loreKey: cls.loreKey,
        roles: cls.roles
      }));
    }

    res.json({
      races: ALL_RACES.map(r => ({
        raceId: r.raceId,
        nameKey: r.nameKey,
        descriptionKey: r.descriptionKey,
        loreKey: r.loreKey,
        faction: r.faction,
        statsModifiers: r.statsModifiers
      })),
      classes: ALL_CLASSES.map(c => ({
        classId: c.classId,
        nameKey: c.nameKey,
        descriptionKey: c.descriptionKey,
        loreKey: c.loreKey,
        roles: c.roles
      })),
      byRace
    });

  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
