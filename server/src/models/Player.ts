import mongoose, { Schema } from "mongoose";

const PlayerSchema = new Schema({
  username: String,
  level: Number,
  xp: Number,
  gold: Number,
}, { timestamps: true });

export default mongoose.model("Player", PlayerSchema);
