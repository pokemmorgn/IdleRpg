import mongoose, { Schema, Document } from "mongoose";

/* ============================================================
   TYPES POSSIBLES DE QUÊTES
   ============================================================ */
export type QuestType =
  | "main"           // quête principale (histoire)
  | "secondary"      // quête secondaire (one-shot)
  | "repeatable"     // récurrente avec cooldown
  | "daily"          // reset 4h
  | "weekly";        // reset semaine


/* ============================================================
   OBJECTIF : Définition générique
   ============================================================ */
export interface IQuestObjective {
  objectiveId: string;
  type: string; // kill, loot, talk, explore, collect, activate, survive, escort

  // valeurs génériques (selon type)
  zoneId?: string;

  // ---- TYPE KILL ----
  enemyType?: string;
  enemyRarity?: string;
  isBoss?: boolean;
  count?: number;

  // ---- TYPE LOOT ----
  itemId?: string;
  dropSource?: string; // enemyType / chestType

  // ---- TYPE TALK ----
  npcId?: string;
  requiredItemId?: string;

  // ---- TYPE EXPLORE ----
  locationId?: string;
  x?: number;
  y?: number;
  z?: number;
  interactionRequired?: boolean;

  // ---- TYPE COLLECT ----
  resourceId?: string;

  // ---- TYPE ACTIVATE ----
  activationType?: string;
  order?: number;

  // ---- TYPE SURVIVE ----
  durationSec?: number;
  waveCount?: number;

  // ---- TYPE ESCORT ----
  escortNpcId?: string;
  targetLocationId?: string;
}

/* ============================================================
   RÉCOMPENSES
   ============================================================ */
export interface IQuestReward {
  xp?: number;
  gold?: number;
  items?: Array<{
    itemId: string;
    quantity: number;
  }>;
  reputation?: Array<{
    factionId: string;
    amount: number;
  }>;
}

/* ============================================================
   STRUCTURE PRINCIPALE DE LA QUÊTE
   ============================================================ */
export interface IQuest extends Document {
  questId: string;
  name: string;
  description: string;
  type: QuestType;

  requiredLevel: number;

  // zone & NPC lié
  zoneId: string;
  giverNpcId: string;      // NPC qui donne
  validatorNpcId?: string; // NPC qui valide (sinon auto)

  // Prérequis
  prerequisiteQuestId?: string;

  // Reset ou cooldown
  cooldownSec?: number;    // repeatable
  resetDaily?: boolean;    // daily
  resetWeekly?: boolean;   // weekly

  // Objectifs (séquentiels)
  objectives: IQuestObjective[];

  // Récompenses
  rewards: IQuestReward;

  // Options diverses
  isOneShot: boolean;      // pour les secondaires
  isActive: boolean;
}


/* ============================================================
   SCHEMAS
   ============================================================ */

const QuestObjectiveSchema = new Schema<IQuestObjective>({
  objectiveId: { type: String, required: true },
  type: { type: String, required: true },

  zoneId: String,

  enemyType: String,
  enemyRarity: String,
  isBoss: Boolean,
  count: Number,

  itemId: String,
  dropSource: String,

  npcId: String,
  requiredItemId: String,

  locationId: String,
  x: Number,
  y: Number,
  z: Number,
  interactionRequired: Boolean,

  resourceId: String,

  activationType: String,
  order: Number,

  durationSec: Number,
  waveCount: Number,

  escortNpcId: String,
  targetLocationId: String,
});

const QuestRewardSchema = new Schema<IQuestReward>({
  xp: Number,
  gold: Number,
  items: [
    {
      itemId: String,
      quantity: Number,
    }
  ],
  reputation: [
    {
      factionId: String,
      amount: Number,
    }
  ]
});

const QuestSchema = new Schema<IQuest>({
  questId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },

  type: {
    type: String,
    enum: ["main", "secondary", "repeatable", "daily", "weekly"],
    required: true
  },

  requiredLevel: { type: Number, default: 1 },

  zoneId: { type: String, required: true },
  giverNpcId: { type: String, required: true },
  validatorNpcId: { type: String },

  prerequisiteQuestId: { type: String },

  cooldownSec: Number,
  resetDaily: Boolean,
  resetWeekly: Boolean,

  objectives: { type: [QuestObjectiveSchema], required: true },

  rewards: { type: QuestRewardSchema, required: true },

  isOneShot: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
});

export default mongoose.model<IQuest>("Quest", QuestSchema);
