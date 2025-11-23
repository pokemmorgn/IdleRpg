import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPlayerServerProfile extends Document {
  playerId: Types.ObjectId;
  serverId: string;

  characters: Array<{
    characterId: Types.ObjectId;
    slot: number;
  }>;

  sharedCurrencies: {
    gold: number;
    diamondBound: number;
    diamondUnbound: number;
  };

  sharedBankId: Types.ObjectId | null;
  sharedQuests: Record<string, any>;

  createdAt: Date;
  updatedAt: Date;
}

const PlayerServerProfileSchema = new Schema<IPlayerServerProfile>({
  playerId: { type: Schema.Types.ObjectId, required: true, index: true },
  serverId: { type: String, required: true, index: true },

  characters: [
    {
      characterId: { type: Schema.Types.ObjectId, ref: "ServerProfile", required: true },
      slot: { type: Number, required: true }
    }
  ],

  sharedCurrencies: {
    gold: { type: Number, default: 0 },
    diamondBound: { type: Number, default: 0 },
    diamondUnbound: { type: Number, default: 0 }
  },

  sharedBankId: {
    type: Schema.Types.ObjectId,
    ref: "Bank",
    default: null
  },

  sharedQuests: {
    type: Object,
    default: {}
  }
}, { timestamps: true });

PlayerServerProfileSchema.index(
  { playerId: 1, serverId: 1 },
  { unique: true }
);

export const PlayerServerProfile = mongoose.model<IPlayerServerProfile>(
  "PlayerServerProfile",
  PlayerServerProfileSchema
);
