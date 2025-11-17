import mongoose, { Schema, Document } from "mongoose";

export interface IPlayer extends Document {
  username: string;
  email?: string;
  level: number;
  xp: number;
  gold: number;
  lastOnline: Date;
}

const PlayerSchema = new Schema<IPlayer>({
  username: { type: String, required: true },

  email: { type: String },

  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  gold: { type: Number, default: 0 },

  lastOnline: { type: Date, default: Date.now },
}, {
  timestamps: true
});

export default mongoose.model<IPlayer>("Player", PlayerSchema);
