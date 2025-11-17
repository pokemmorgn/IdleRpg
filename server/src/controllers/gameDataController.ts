import { Request, Response } from "express";
import { ALL_CLASSES, getClassesByRole, ClassRole } from "../config/classes.config";
import { ALL_RACES, getRacesByFaction, Faction } from "../config/races.config";

/**
 * GET /game-data/classes
 * Récupère la liste de toutes les classes disponibles
 */
export const listClasses = async (req: Request, res: Response) => {
  try {
    const { role } = req.query;

    // Si un rôle est spécifié, filtrer par rôle
    if (role && typeof role === "string") {
      const upperRole = role.toUpperCase() as ClassRole;
      const classes = getClassesByRole(upperRole);

      return res.json({
        classes: classes.map(cls => ({
          classId: cls.classId,
          nameKey: cls.nameKey,
          descriptionKey: cls.descriptionKey,
          roles: cls.roles
        })),
        filteredBy: upperRole
      });
    }

    // Retourner toutes les classes
    res.json({
      classes: ALL_CLASSES.map(cls => ({
        classId: cls.classId,
        nameKey: cls.nameKey,
        descriptionKey: cls.descriptionKey,
        roles: cls.roles
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /game-data/races
 * Récupère la liste de toutes les races disponibles
 */
export const listRaces = async (req: Request, res: Response) => {
  try {
    const { faction } = req.query;

    // Si une faction est spécifiée, filtrer par faction
    if (faction && typeof faction === "string") {
      const upperFaction = faction.toUpperCase() as Faction;
      
      if (upperFaction !== "AURION" && upperFaction !== "OMBRE") {
        return res.status(400).json({ 
          error: "Invalid faction. Must be AURION or OMBRE" 
        });
      }

      const races = getRacesByFaction(upperFaction);

      return res.json({
        races: races.map(race => ({
          raceId: race.raceId,
          nameKey: race.nameKey,
          descriptionKey: race.descriptionKey,
          faction: race.faction
        })),
        filteredBy: upperFaction
      });
    }

    // Retourner toutes les races
    res.json({
      races: ALL_RACES.map(race => ({
        raceId: race.raceId,
        nameKey: race.nameKey,
        descriptionKey: race.descriptionKey,
        faction: race.faction
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /game-data/factions
 * Récupère la liste des factions avec leurs races
 */
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
