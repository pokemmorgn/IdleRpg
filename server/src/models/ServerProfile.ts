import mongoose, { Schema, Document, Types } from "mongoose";

export interface IServerProfile extends Document {
  playerId: Types.ObjectId;   // Référence au Player
  serverId: string;           // "s1", "s2", "s3"...
  
  // Informations du personnage principal
  characterName: string;      // Nom du personnage sur ce serveur
  level: number;
  xp: number;
  gold: number;
  
  // Classe et race du personnage
  class: string;              // "paladin", "mage", "hunter"...
  race: string;               // "human_elion", "dwarf_rune", "varkyns_beast"...
  
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
    enum: ["paladin", "hunter", "mage", "priest", "rogue", "warlock"],
    default: "paladin"
  },
  race: {
    type: String,
    required: true,
    enum: [
      "human_elion", 
      "dwarf_rune", 
      "winged_lunaris", 
      "sylphide_forest",
      "varkyns_beast",
      "morhri_insect",
      "ghrannite_stone",
      "selenite_lunar"
    ],
    default: "human_elion"
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
