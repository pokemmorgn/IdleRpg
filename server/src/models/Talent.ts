import mongoose, { Schema, Document } from "mongoose";

export interface ITalent extends Document {
  talentId: string; // Ex: "warrior_crit_01"
  name: string;
  description: string;
  icon: string; // Chemin vers l'icône
  
  // Conditions pour débloquer le talent
  requiredLevel: number;
  prerequisiteTalentId?: string; // ID du talent précédent dans l'arbre
  maxRank: number; // Ex: 5

  // Effet du talent par rang
  effect: {
    stat: string; // Ex: "criticalChance", "attackPower"
    valuePerRank: number; // Ex: 1.5 (pour +1.5% par rang)
  };
}

const TalentSchema = new Schema<ITalent>({
  talentId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  requiredLevel: { type: Number, required: true, default: 1 },
  prerequisiteTalentId: { type: String, required: false },
  maxRank: { type: Number, required: true, default: 1 },
  effect: {
    stat: { type: String, required: true },
    valuePerRank: { type: Number, required: true }
  }
}, {
  timestamps: true
});

export default mongoose.model<ITalent>("Talent", TalentSchema);
