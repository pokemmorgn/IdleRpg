import mongoose, { Schema, Document, Types } from "mongoose";
import { MAX_CHARACTERS_PER_SERVER } from "../config/character.config";

import { VALID_CLASS_IDS } from "../config/classes.config";
import { ALL_RACES } from "../config/races.config"; // ⬅️ Important : on utilise maintenant ALL_RACES

// ===== Interfaces =====

export interface IPlayerPrimaryStats {
  strength: number;
  agility: number;
  intelligence: number;
  endurance: number;
  spirit: number;
}

export interface IPlayerComputedStats {
  hp: number;
  maxHp: number;

  resource: number;
  maxResource: number;

  manaRegen: number;
  rageRegen: number;
  energyRegen: number;

  attackPower: number;
  spellPower: number;
  attackSpeed: number;

  criticalChance: number;
  criticalDamage: number;

  damageReduction: number;

  moveSpeed: number;

  armor: number;
  magicResistance: number;
  precision: number;
  evasion: number;
  penetration: number;
  tenacity: number;
  lifesteal: number;
  spellPenetration: number;
}

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

  primaryStats: IPlayerPrimaryStats;
  computedStats: IPlayerComputedStats;

  statsLastCalculated: Date;
  lastOnline: Date;
}

// ====== Schemas ======

const PlayerPrimaryStatsSchema = new Schema({
  strength: { type: Number, required: true, min: 0, default: 10 },
  agility: { type: Number, required: true, min: 0, default: 10 },
  intelligence: { type: Number, required: true, min: 0, default: 10 },
  endurance: { type: Number, required: true, min: 0, default: 10 },
  spirit: { type: Number, required: true, min: 0, default: 10 }
}, { _id: false });

const PlayerComputedStatsSchema = new Schema({
  hp: { type: Number, required: true, default: 100 },
  maxHp: { type: Number, required: true, default: 100 },

  resource: { type: Number, required: true, default: 100 },
  maxResource: { type: Number, required: true, default: 100 },

  manaRegen: { type: Number, required: true, default: 0 },
  rageRegen: { type: Number, required: true, default: 0 },
  energyRegen: { type: Number, required: true, default: 0 },

  attackPower: { type: Number, required: true, default: 10 },
  spellPower: { type: Number, required: true, default: 10 },
  attackSpeed: { type: Number, required: true, default: 2.5 },

  criticalChance: { type: Number, required: true, default: 0 },
  criticalDamage: { type: Number, required: true, default: 150 },

  damageReduction: { type: Number, required: true, default: 0 },

  moveSpeed: { type: Number, required: true, default: 5 },

  armor: { type: Number, required: true, default: 0 },
  magicResistance: { type: Number, required: true, default: 0 },
  precision: { type: Number, required: true, default: 0 },
  evasion: { type: Number, required: true, default: 0 },
  penetration: { type: Number, required: true, default: 0 },
  tenacity: { type: Number, required: true, default: 0 },
  lifesteal: { type: Number, required: true, default: 0 },
  spellPenetration: { type: Number, required: true, default: 0 }
}, { _id: false });

const ServerProfileSchema = new Schema<IServerProfile>({
  playerId: { type: Schema.Types.ObjectId, ref: "Player", required: true, index: true },

  serverId: { type: String, required: true, index: true },

  characterSlot: {
    type: Number,
    required: true,
    min: 1,
    max: MAX_CHARACTERS_PER_SERVER,
    default: 1
  },

  characterName: { type: String, required: true },

  level: { type: Number, default: 1, min: 1 },
  xp: { type: Number, default: 0, min: 0 },
  gold: { type: Number, default: 0, min: 0 },

  class: {
    type: String,
    required: true,
    enum: VALID_CLASS_IDS,
    default: "warrior"
  },

  // 💥 ICI : on remplace VALID_RACE_IDS par ALL_RACES.map(...) 💥
  race: {
    type: String,
    required: true,
    enum: ALL_RACES.map(r => r.raceId),
    default: "human_elion"
  },

  primaryStats: { type: PlayerPrimaryStatsSchema, required: true },
  computedStats: { type: PlayerComputedStatsSchema, required: true },

  statsLastCalculated: { type: Date, default: Date.now },
  lastOnline: { type: Date, default: Date.now }
}, {
  timestamps: true
});

ServerProfileSchema.index({ playerId: 1, serverId: 1, characterSlot: 1 }, { unique: true });
ServerProfileSchema.index({ playerId: 1, serverId: 1 });

export default mongoose.model<IServerProfile>("ServerProfile", ServerProfileSchema);
