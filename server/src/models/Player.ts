import mongoose, { Schema, Document } from "mongoose";

export interface IPlayer extends Document {
  username: string;
  email?: string;
  password: string;

  lastOnline: Date;
}

const PlayerSchema = new Schema<IPlayer>({
  username: { type: String, required: true, unique: true },
  email: { type: String },
  password: { type: String, required: true },

  lastOnline: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model<IPlayer>("Player", PlayerSchema);
