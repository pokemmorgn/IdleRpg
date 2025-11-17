import mongoose, { Schema, Document, Types } from "mongoose";
import { MAX_CHARACTERS_PER_SERVER } from "../config/character.config";
import { VALID_CLASS_IDS } from "../config/classes.config";
import { VALID_RACE_IDS } from "../config/races.config";

export interface IServerProfile extends Document {
  playerId: Types.ObjectId;   // Référence au Player
  serverId: string;           // "s1", "s2", "s3"...
  
  // Slot du personnage (1, 2, 3, 4, 5)
  characterSlot: number;      // Identifie quel "slot" ce personnage occupe
  
  // Informations du personnage
  characterName: string;      // Nom du personnage sur ce serveur
  level: number;
  xp: number;
  gold: number;
  
  // Classe et race du personnage
  class: string;              // Dynamique depuis classes.config.ts
  race: string;               // Dynamique depuis races.config.ts
  
  // Timestamps
  lastOnline: Date;
}

const ServerProfileSchema = new Schema<IServerProfile>({
  playerId: { 
    type: Schema.Types.ObjectId, 
    ref: "Player",
    required: true,
    index: true
  },
  serverId: { 
    type: String, 
    required: true,
    index: true
  },
  characterSlot: {
    type: Number,
    required: true,
    min: 1,
    max: MAX_CHARACTERS_PER_SERVER,  // Dynamique depuis character.config.ts
    default: 1
  },
  characterName: { 
    type: String, 
    required: true 
  },
  level: { 
    type: Number, 
    default: 1 
  },
  xp: { 
    type: Number, 
    default: 0 
  },
  gold: { 
    type: Number, 
    default: 0 
  },
  class: { 
    type: String, 
    required: true,
    enum: VALID_CLASS_IDS,  // ← Dynamique depuis classes.config.ts
    default: "warrior"
  },
  race: {
    type: String,
    required: true,
    enum: VALID_RACE_IDS,  // ← Dynamique depuis races.config.ts
    default: "human_elion"
  },
  lastOnline: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true 
});

// Index composé pour éviter les doublons (un joueur ne peut avoir qu'un personnage par slot sur un serveur)
ServerProfileSchema.index({ playerId: 1, serverId: 1, characterSlot: 1 }, { unique: true });

// Index pour rechercher tous les personnages d'un joueur sur un serveur
ServerProfileSchema.index({ playerId: 1, serverId: 1 });

export default mongoose.model<IServerProfile>("ServerProfile", ServerProfileSchema);
