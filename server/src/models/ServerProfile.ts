import mongoose, { Schema, Document, Types } from "mongoose";
import { MAX_CHARACTERS_PER_SERVER } from "../config/character.config";
import { VALID_CLASS_IDS } from "../config/classes.config";
import { VALID_RACE_IDS } from "../config/races.config";

// ===== Interfaces =====

/**
 * Stats primaires d'un joueur (calculées depuis ClassStats + level)
 */
export interface IPlayerPrimaryStats {
  strength: number;
  agility: number;
  intelligence: number;
  endurance: number;
  spirit: number;
}

/**
 * Stats calculées d'un joueur (stockées pour performance)
 */
export interface IPlayerComputedStats {
  // === Vie ===
  hp: number;                 // HP actuel
  maxHp: number;              // HP maximum
  
  // === Ressource ===
  resource: number;           // Ressource actuelle (mana/rage/energy)
  maxResource: number;        // Ressource maximum
  resourceRegen: number;      // Régénération par seconde (mana uniquement)
  
  // === Combat de base ===
  attackPower: number;        // Dégâts physiques (AP)
  spellPower: number;         // Dégâts magiques (SP)
  attackSpeed: number;        // Vitesse d'attaque (secondes entre attaques)
  
  // === Critique ===
  criticalChance: number;     // Chance de critique (%) - équipement uniquement
  criticalDamage: number;     // Multiplicateur de critique (fixe 150%)
  
  // === Défense ===
  damageReduction: number;    // Réduction des dégâts totale (%)
  
  // === Mobilité ===
  moveSpeed: number;          // Vitesse de déplacement (m/s)
  
  // === Stats avancées (équipement - Phase 2) ===
  armor: number;              // Armure (réduit dégâts physiques via diminishing returns)
  magicResistance: number;    // Résistance magique (réduit dégâts magiques %)
  precision: number;          // Réduit chance de Miss (%)
  evasion: number;            // Chance d'esquive (%)
  penetration: number;        // Pénétration d'armure (%)
  tenacity: number;           // Réduit dégâts critiques subis (%)
  lifesteal: number;          // Vol de vie (%)
  spellPenetration: number;   // Pénétration magique (%)
}

/**
 * Document ServerProfile (MongoDB)
 */
export interface IServerProfile extends Document {
  playerId: Types.ObjectId;
  serverId: string;
  characterSlot: number;
  characterName: string;
  level: number;
  xp: number;
  gold: number;
  class: string;
  race: string;
  
  // Stats primaires (calculées et stockées)
  primaryStats: IPlayerPrimaryStats;
  
  // Stats calculées (stockées pour performance)
  computedStats: IPlayerComputedStats;
  
  // Timestamp du dernier recalcul des stats
  statsLastCalculated: Date;
  
  lastOnline: Date;
}

// ===== Schemas =====

const PlayerPrimaryStatsSchema = new Schema({
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

const PlayerComputedStatsSchema = new Schema({
  // === Vie ===
  hp: {
    type: Number,
    required: true,
    min: 0,
    default: 100
  },
  maxHp: {
    type: Number,
    required: true,
    min: 1,
    default: 100
  },
  
  // === Ressource ===
  resource: {
    type: Number,
    required: true,
    min: 0,
    default: 100
  },
  maxResource: {
    type: Number,
    required: true,
    min: 0,
    default: 100
  },
  resourceRegen: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  
  // === Combat de base ===
  attackPower: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },
  spellPower: {
    type: Number,
    required: true,
    min: 0,
    default: 10
  },
  attackSpeed: {
    type: Number,
    required: true,
    min: 0.8,
    default: 2.5
  },
  
  // === Critique ===
  criticalChance: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  },
  criticalDamage: {
    type: Number,
    required: true,
    default: 150
  },
  
  // === Défense ===
  damageReduction: {
    type: Number,
    required: true,
    min: 0,
    max: 75,
    default: 0
  },
  
  // === Mobilité ===
  moveSpeed: {
    type: Number,
    required: true,
    min: 0,
    default: 5.0
  },
  
  // === Stats avancées (équipement - Phase 2) ===
  armor: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  magicResistance: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  precision: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  evasion: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  penetration: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  tenacity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  lifesteal: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  spellPenetration: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  }
}, { _id: false });

const ServerProfileSchema = new Schema<IServerProfile>({
  playerId: {
    type: Schema.Types.ObjectId,
    ref: "Player",
    required: true,
    index: true
  },
  serverId: {
    type: String,
    required: true,
    index: true
  },
  characterSlot: {
    type: Number,
    required: true,
    min: 1,
    max: MAX_CHARACTERS_PER_SERVER,
    default: 1
  },
  characterName: {
    type: String,
    required: true
  },
  level: {
    type: Number,
    default: 1,
    min: 1
  },
  xp: {
    type: Number,
    default: 0,
    min: 0
  },
  gold: {
    type: Number,
    default: 0,
    min: 0
  },
  class: {
    type: String,
    required: true,
    enum: VALID_CLASS_IDS,
    default: "warrior"
  },
  race: {
    type: String,
    required: true,
    enum: VALID_RACE_IDS,
    default: "human_elion"
  },
  primaryStats: {
    type: PlayerPrimaryStatsSchema,
    required: true
  },
  computedStats: {
    type: PlayerComputedStatsSchema,
    required: true
  },
  statsLastCalculated: {
    type: Date,
    default: Date.now
  },
  lastOnline: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ===== Index =====
ServerProfileSchema.index({ playerId: 1, serverId: 1, characterSlot: 1 }, { unique: true });
ServerProfileSchema.index({ playerId: 1, serverId: 1 });

// ===== Export =====
export default mongoose.model<IServerProfile>("ServerProfile", ServerProfileSchema);
