import mongoose, { Schema, Document } from "mongoose";

export interface ITalent extends Document {
  talentId: string; // ex: "warrior_fury_critical_strike"
  name: string;
  description: string;
  icon: string;

  treeId: string; // ex: "warrior_fury"
  maxRank: number;
  requiredLevel: number;

  // Prérequis pour pouvoir apprendre le premier rang
  prerequisites: {
    type: 'talent' | 'level';
    talentId?: string; // requis si type='talent'
    rank?: number;     // requis si type='talent'
    level?: number;   // requis si type='level'
  }[];

  // Le nom du fichier de script à exécuter (sans .ts)
  scriptName: string; 
}

const TalentSchema = new Schema<ITalent>({
  talentId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  treeId: { type: String, required: true, index: true },
  maxRank: { type: Number, required: true, default: 1 },
  requiredLevel: { type: Number, required: true, default: 1 },
  prerequisites: [{ type: Schema.Types.Mixed }], // Flexible pour différents types de prérequis
  scriptName: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model<ITalent>("Talent", TalentSchema);
