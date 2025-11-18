import { Request, Response } from "express";
import ClassStats from "../models/ClassStats";
import ServerProfile from "../models/ServerProfile";
import { StatsManager } from "../managers/StatsManager";

/**
 * GET /stats/classes
 * Liste toutes les classes disponibles avec leurs stats
 */
export const getAllClasses = async (req: Request, res: Response) => {
  try {
    const classes = await StatsManager.getAllClasses();
    
    res.json({
      success: true,
      count: classes.length,
      classes: classes.map(cls => ({
        class: cls.class,
        displayName: cls.displayName,
        description: cls.description,
        resourceType: cls.resourceType,
        baseMoveSpeed: cls.baseMoveSpeed,
        baseStats: cls.baseStats,
        statsPerLevel: cls.statsPerLevel,
        isActive: cls.isActive
      }))
    });
  } catch (err: any) {
    console.error("❌ [statsController] Erreur getAllClasses:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch classes"
    });
  }
};

/**
 * GET /stats/classes/:className
 * Récupère les stats d'une classe spécifique
 */
export const getClassByName = async (req: Request, res: Response) => {
  try {
    const { className } = req.params;
    
    const classStats = await StatsManager.getClassStats(className);
    
    if (!classStats) {
      return res.status(404).json({
        success: false,
        error: `Class ${className} not found`
      });
    }
    
    res.json({
      success: true,
      class: {
        class: classStats.class,
        displayName: classStats.displayName,
        description: classStats.description,
        resourceType: classStats.resourceType,
        baseMoveSpeed: classStats.baseMoveSpeed,
        baseStats: classStats.baseStats,
        statsPerLevel: classStats.statsPerLevel,
        isActive: classStats.isActive
      }
    });
  } catch (err: any) {
    console.error("❌ [statsController] Erreur getClassByName:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch class"
    });
  }
};

/**
 * POST /stats/classes (Admin)
 * Créer une nouvelle classe avec ses stats
 */
export const createClass = async (req: Request, res: Response) => {
  try {
    const {
      class: className,
      displayName,
      description,
      resourceType,
      baseMoveSpeed,
      baseStats,
      statsPerLevel
    } = req.body;
    
    // Validation
    if (!className || !displayName || !description || !resourceType || !baseStats || !statsPerLevel) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields"
      });
    }
    
    // Vérifier que la classe n'existe pas déjà
    const existing = await ClassStats.findOne({ class: className });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Class ${className} already exists`
      });
    }
    
    // Créer la classe
    const newClass = await ClassStats.create({
      class: className,
      displayName,
      description,
      resourceType,
      baseMoveSpeed: baseMoveSpeed || 5.0,
      baseStats,
      statsPerLevel,
      isActive: true
    });
    
    res.status(201).json({
      success: true,
      message: `Class ${className} created successfully`,
      class: {
        class: newClass.class,
        displayName: newClass.displayName,
        description: newClass.description,
        resourceType: newClass.resourceType,
        baseMoveSpeed: newClass.baseMoveSpeed,
        baseStats: newClass.baseStats,
        statsPerLevel: newClass.statsPerLevel,
        isActive: newClass.isActive
      }
    });
  } catch (err: any) {
    console.error("❌ [statsController] Erreur createClass:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to create class"
    });
  }
};

/**
 * PUT /stats/classes/:className (Admin)
 * Modifier les stats d'une classe
 */
export const updateClass = async (req: Request, res: Response) => {
  try {
    const { className } = req.params;
    const updates = req.body;
    
    const classStats = await ClassStats.findOne({ class: className });
    
    if (!classStats) {
      return res.status(404).json({
        success: false,
        error: `Class ${className} not found`
      });
    }
    
    // Mettre à jour les champs autorisés
    if (updates.displayName) classStats.displayName = updates.displayName;
    if (updates.description) classStats.description = updates.description;
    if (updates.resourceType) classStats.resourceType = updates.resourceType;
    if (updates.baseMoveSpeed !== undefined) classStats.baseMoveSpeed = updates.baseMoveSpeed;
    if (updates.baseStats) classStats.baseStats = updates.baseStats;
    if (updates.statsPerLevel) classStats.statsPerLevel = updates.statsPerLevel;
    if (updates.isActive !== undefined) classStats.isActive = updates.isActive;
    
    await classStats.save();
    
    res.json({
      success: true,
      message: `Class ${className} updated successfully`,
      class: {
        class: classStats.class,
        displayName: classStats.displayName,
        description: classStats.description,
        resourceType: classStats.resourceType,
        baseMoveSpeed: classStats.baseMoveSpeed,
        baseStats: classStats.baseStats,
        statsPerLevel: classStats.statsPerLevel,
        isActive: classStats.isActive
      }
    });
  } catch (err: any) {
    console.error("❌ [statsController] Erreur updateClass:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to update class"
    });
  }
};

/**
 * GET /stats/player/:profileId
 * Récupère les stats calculées d'un joueur
 */
export const getPlayerStats = async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    
    const profile = await ServerProfile.findById(profileId);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: `Profile ${profileId} not found`
      });
    }
    
    res.json({
      success: true,
      profile: {
        characterName: profile.characterName,
        class: profile.class,
        race: profile.race,
        level: profile.level,
        primaryStats: profile.primaryStats,
        computedStats: profile.computedStats,
        statsLastCalculated: profile.statsLastCalculated
      }
    });
  } catch (err: any) {
    console.error("❌ [statsController] Erreur getPlayerStats:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch player stats"
    });
  }
};

/**
 * POST /stats/player/:profileId/recalculate
 * Force le recalcul des stats d'un joueur
 */
export const recalculatePlayerStats = async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    
    const profile = await ServerProfile.findById(profileId);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: `Profile ${profileId} not found`
      });
    }
    
    // Recalculer les stats
    await StatsManager.updatePlayerStats(profileId);
    
    // Recharger le profil mis à jour
    const updatedProfile = await ServerProfile.findById(profileId);
    
    res.json({
      success: true,
      message: `Stats recalculated for ${updatedProfile!.characterName}`,
      profile: {
        characterName: updatedProfile!.characterName,
        class: updatedProfile!.class,
        level: updatedProfile!.level,
        primaryStats: updatedProfile!.primaryStats,
        computedStats: updatedProfile!.computedStats,
        statsLastCalculated: updatedProfile!.statsLastCalculated
      }
    });
  } catch (err: any) {
    console.error("❌ [statsController] Erreur recalculatePlayerStats:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to recalculate player stats"
    });
  }
};

/**
 * POST /stats/player/:profileId/level-up
 * Simule un level up (pour test)
 */
export const simulateLevelUp = async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const { newLevel } = req.body;
    
    if (!newLevel || newLevel < 1) {
      return res.status(400).json({
        success: false,
        error: "Invalid newLevel"
      });
    }
    
    const profile = await ServerProfile.findById(profileId);
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: `Profile ${profileId} not found`
      });
    }
    
    if (newLevel <= profile.level) {
      return res.status(400).json({
        success: false,
        error: `New level (${newLevel}) must be higher than current level (${profile.level})`
      });
    }
    
    // Effectuer le level up
    await StatsManager.onLevelUp(profileId, newLevel);
    
    // Recharger le profil mis à jour
    const updatedProfile = await ServerProfile.findById(profileId);
    
    res.json({
      success: true,
      message: `${updatedProfile!.characterName} leveled up to ${newLevel}!`,
      profile: {
        characterName: updatedProfile!.characterName,
        class: updatedProfile!.class,
        level: updatedProfile!.level,
        primaryStats: updatedProfile!.primaryStats,
        computedStats: updatedProfile!.computedStats
      }
    });
  } catch (err: any) {
    console.error("❌ [statsController] Erreur simulateLevelUp:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to level up"
    });
  }
};
