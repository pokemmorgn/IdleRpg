import mongoose, { Schema, Document } from "mongoose";

export interface IPlayerTags extends Document {
  profileId: string;     // Référence au ServerProfile
  tags: string[];        // Array de tags (ex: ["dialogue.thorin.tutorial_completed", "npc.elder.met"])
  createdAt: Date;
  updatedAt: Date;
}

const PlayerTagsSchema = new Schema<IPlayerTags>({
  profileId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tags: {
    type: [String],
    default: [],
    index: true  // Index pour recherche rapide
  }
}, {
  timestamps: true
});

// Index pour rechercher rapidement par profileId
PlayerTagsSchema.index({ profileId: 1 });

// Index pour rechercher par tag (queries type "qui a ce tag ?")
PlayerTagsSchema.index({ tags: 1 });

export default mongoose.model<IPlayerTags>("PlayerTags", PlayerTagsSchema);
