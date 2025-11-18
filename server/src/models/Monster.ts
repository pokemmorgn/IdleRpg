import mongoose, { Schema, Document } from "mongoose";

export interface IMonsterStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface IMonsterBehavior {
  type: "aggressive" | "neutral" | "passive";
  aggroRange: number;
  leashRange: number;
  attackRange: number;
}

export interface ILootEntry {
  itemId: string;
  dropChance: number;
  quantityMin: number;
  quantityMax: number;
}

export interface IMonster extends Document {
  monsterId: string;
  serverId: string;
  name: string;
  type: "normal" | "elite" | "boss";
  level: number;
  
  stats: IMonsterStats;
  
  zoneId?: string;
  spawnPosition: {
    x: number;
    y: number;
    z: number;
  };
  spawnRotation: {
    x: number;
    y: number;
    z: number;
  };
  
  behavior: IMonsterBehavior;
  
  lootTable: ILootEntry[];
  xpReward: number;
  
  respawnTime: number;
  respawnOnDeath: boolean;
  
  modelId: string;
  isActive: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const MonsterStatsSchema = new Schema({
  hp: { type: Number, required: true, default: 100 },
  maxHp: { type: Number, required: true, default: 100 },
  attack: { type: Number, required: true, default: 10 },
  defense: { type: Number, required: true, default: 5 },
  speed: { type: Number, required: true, default: 100 }
}, { _id: false });

const MonsterBehaviorSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ["aggressive", "neutral", "passive"],
    default: "aggressive"
  },
  aggroRange: { type: Number, required: true, default: 10 },
  leashRange: { type: Number, required: true, default: 30 },
  attackRange: { type: Number, required: true, default: 2 }
}, { _id: false });

const LootEntrySchema = new Schema({
  itemId: { type: String, required: true },
  dropChance: { type: Number, required: true, min: 0, max: 1 },
  quantityMin: { type: Number, required: true, default: 1 },
  quantityMax: { type: Number, required: true, default: 1 }
}, { _id: false });

const MonsterSchema = new Schema<IMonster>({
  monsterId: {
    type: String,
    required: true,
    index: true
  },
  serverId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ["normal", "elite", "boss"],
    default: "normal"
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  stats: {
    type: MonsterStatsSchema,
    required: true
  },
  zoneId: {
    type: String,
    default: null,
    index: true
  },
  spawnPosition: {
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 },
    z: { type: Number, required: true, default: 0 }
  },
  spawnRotation: {
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 },
    z: { type: Number, required: true, default: 0 }
  },
  behavior: {
    type: MonsterBehaviorSchema,
    required: true
  },
  lootTable: {
    type: [LootEntrySchema],
    default: []
  },
  xpReward: {
    type: Number,
    required: true,
    default: 10,
    min: 0
  },
  respawnTime: {
    type: Number,
    required: true,
    default: 30,
    min: 0
  },
  respawnOnDeath: {
    type: Boolean,
    required: true,
    default: true
  },
  modelId: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

MonsterSchema.index({ serverId: 1, monsterId: 1 }, { unique: true });
MonsterSchema.index({ serverId: 1, isActive: 1 });
MonsterSchema.index({ serverId: 1, type: 1 });
MonsterSchema.index({ serverId: 1, zoneId: 1, isActive: 1 });

export default mongoose.model<IMonster>("Monster", MonsterSchema);
