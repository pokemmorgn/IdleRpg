import mongoose, { Schema, Document } from "mongoose";

// ===== Interfaces =====

/**
 * Stats primaires de base d'une classe
 */
export interface IClassBaseStats {
  strength: number;      // STR → +2 Attack Power
  agility: number;       // AGI → -0.02s Attack Speed, +0.5% Evasion
  intelligence: number;  // INT → +2 Spell Power, +5 Max Mana
  endurance: number;     // END → +5 HP, +0.5% Damage Reduction
  spirit: number;        // SPI → +2 Mana Regen
}

/**
 * Gains de stats par level
 */
export interface IClassStatsPerLevel {
  strength: number;
  agility: number;
  intelligence: number;
  endurance: number;
  spirit: number;
}

/**
 * Document ClassStats (MongoDB)
 */
export interface IClassStats extends Document {
  class: string;                      // "warrior", "mage", "priest", "paladin", "rogue", "druid"
  displayName: string;                // "Guerrier", "Mage", etc.
  description: string;                // Description de la classe
  
  // Type de ressource utilisée par la classe
  resourceType: "mana" | "rage" | "energy";
  
  // Vitesse de déplacement de base (m/s)
  baseMoveSpeed: number;
  
  // Stats de base (Level 1)
  baseStats: IClassBaseStats;
  
  // Gains par level
  statsPerLevel: IClassStatsPerLevel;
  
  // Si la classe est disponible dans le jeu
  isActive: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ===== Schemas =====

const ClassBaseStatsSchema = new Schema({
  strength: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },
  agility: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },
  intelligence: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },
  endurance: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },
  spirit: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  }
}, { _id: false });

const ClassStatsPerLevelSchema = new Schema({
  strength: {
    type: Number,
    required: true,
    default: 0
  },
  agility: {
    type: Number,
    required: true,
    default: 0
  },
  intelligence: {
    type: Number,
    required: true,
    default: 0
  },
  endurance: {
    type: Number,
    required: true,
    default: 0
  },
  spirit: {
    type: Number,
    required: true,
    default: 0
  }
}, { _id: false });

const ClassStatsSchema = new Schema<IClassStats>({
  class: {
    type: String,
    required: true,
    unique: true,
    index: true,
    enum: ["warrior", "mage", "priest", "paladin", "rogue", "druid"]
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  resourceType: {
    type: String,
    required: true,
    enum: ["mana", "rage", "energy"],
    default: "mana"
  },
  baseMoveSpeed: {
    type: Number,
    required: true,
    min: 0,
    default: 5.0
  },
  baseStats: {
    type: ClassBaseStatsSchema,
    required: true
  },
  statsPerLevel: {
    type: ClassStatsPerLevelSchema,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// ===== Index =====
ClassStatsSchema.index({ class: 1 });
ClassStatsSchema.index({ isActive: 1 });

// ===== Export =====
export default mongoose.model<IClassStats>("ClassStats", ClassStatsSchema);
