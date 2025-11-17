import mongoose, { Schema, Document, Types } from "mongoose";

export export interface IServerProfile extends Document {
  playerId: Types.ObjectId;   // Référence au Player
  serverId: string;           // "eu-1", "na-1", "asia-1"...
  
  // Informations du personnage principal
  characterName: string;      // Nom du personnage sur ce serveur
  level: number;
  xp: number;
  gold: number;
  
  // Classe du personnage
  class: string;              // "warrior", "mage", "archer"...
  
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
    enum: ["warrior", "mage", "archer"],
    default: "warrior"
  },
  lastOnline: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true 
});

// Index composé pour éviter les doublons (un joueur ne peut avoir qu'un profil par serveur)
ServerProfileSchema.index({ playerId: 1, serverId: 1 }, { unique: true });

export default mongoose.model<IServerProfile>("ServerProfile", ServerProfileSchema);
