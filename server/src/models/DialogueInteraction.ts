import mongoose, { Schema, Document } from "mongoose";

export interface IDialogueInteraction extends Document {
  profileId: string;        // Référence au ServerProfile
  npcId: string;            // ID du NPC avec qui on interagit
  
  // Compteur permanent (total depuis le début)
  totalInteractions: number;
  
  // Compteur court terme (réinitialisé après X minutes)
  shortTermCount: number;
  shortTermResetAt: Date;   // Date de réinitialisation du compteur court
  
  lastInteractionAt: Date;  // Dernière interaction
  createdAt: Date;
  updatedAt: Date;
}

const DialogueInteractionSchema = new Schema<IDialogueInteraction>({
  profileId: {
    type: String,
    required: true,
    index: true
  },
  npcId: {
    type: String,
    required: true,
    index: true
  },
  totalInteractions: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  shortTermCount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  shortTermResetAt: {
    type: Date,
    required: true,
    default: () => new Date()
  },
  lastInteractionAt: {
    type: Date,
    required: true,
    default: () => new Date()
  }
}, {
  timestamps: true
});

// Index composé pour rechercher rapidement
DialogueInteractionSchema.index({ profileId: 1, npcId: 1 }, { unique: true });

export default mongoose.model<IDialogueInteraction>("DialogueInteraction", DialogueInteractionSchema);
