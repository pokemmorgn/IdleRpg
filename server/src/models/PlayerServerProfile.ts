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

  sharedBank: any[];

  sharedQuests: { [questId: string]: any };
}

const PlayerServerProfileSchema = new Schema<IPlayerServerProfile>({
  playerId: { type: Schema.Types.ObjectId, required: true, index: true },
  serverId: { type: String, required: true, index: true },

  characters: [{
    characterId: { type: Schema.Types.ObjectId, ref: "ServerProfile" },
    slot: Number,
  }],

  sharedCurrencies: {
    gold: { type: Number, default: 0 },
    diamondBound: { type: Number, default: 0 },
    diamondUnbound: { type: Number, default: 0 }
  },

  sharedBank: { type: Array, default: [] },
  sharedQuests: { type: Object, default: {} }
});

export default mongoose.model<IPlayerServerProfile>(
  "PlayerServerProfile",
  PlayerServerProfileSchema
);
