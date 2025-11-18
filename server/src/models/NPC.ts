import mongoose, { Schema, Document } from "mongoose";

export interface INPC extends Document {
  npcId: string;              // ID logique du NPC (ex: "npc_blacksmith_01")
  serverId: string;           // Serveur où se trouve cette instance (ex: "s1")
  
  // Informations de base
  name: string;               // Nom affiché (ex: "Forge Master Thorin")
  type: string;               // Type: "quest_giver", "merchant", "dialogue", "hybrid"
  level: number;              // Niveau du NPC
  faction: string;            // Faction: "AURION", "OMBRE", "NEUTRAL"
  
  // Zone/Map (optionnel)
  zoneId?: string;            // ID de la zone (ex: "village_start", "forest_dark") - null par défaut
  
  // Position dans le monde (coordonnées globales)
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    x: number;
    y: number;
    z: number;
  };
  
  // Référence du modèle 3D pour Unity
  modelId: string;            // ID du prefab Unity (ex: "npc_dwarf_blacksmith")
  
  // Fonctionnalités (références vers d'autres collections)
  dialogueId?: string;        // Référence vers Dialogue (optionnel)
  shopId?: string;            // Référence vers Shop (optionnel, si merchant)
  questIds: string[];         // Array de questId (vide pour l'instant)
  
  // Interaction
  interactionRadius: number;  // Distance max pour interagir (en unités Unity)
  
  // Status
  isActive: boolean;          // Si le NPC est actif dans le monde
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const NPCSchema = new Schema<INPC>({
  npcId: {
    type: String,
    required: true,
    index: true
  },
  serverId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ["quest_giver", "merchant", "dialogue", "hybrid"],
    default: "dialogue"
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  faction: {
    type: String,
    required: true,
    enum: ["AURION", "OMBRE", "NEUTRAL"],
    default: "NEUTRAL"
  },
  zoneId: {
    type: String,
    default: null,
    index: true  // Index pour filtrer par zone
  },
  position: {
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 },
    z: { type: Number, required: true, default: 0 }
  },
  rotation: {
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 },
    z: { type: Number, required: true, default: 0 }
  },
  modelId: {
    type: String,
    required: true
  },
  dialogueId: {
    type: String,
    default: null
  },
  shopId: {
    type: String,
    default: null
  },
  questIds: {
    type: [String],
    default: []
  },
  interactionRadius: {
    type: Number,
    required: true,
    min: 0.5,
    max: 10,
    default: 3
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index composé UNIQUE : un NPC ne peut exister qu'une fois par serveur
NPCSchema.index({ serverId: 1, npcId: 1 }, { unique: true });

// Index pour lister tous les NPC actifs d'un serveur
NPCSchema.index({ serverId: 1, isActive: 1 });

// Index pour rechercher par type sur un serveur
NPCSchema.index({ serverId: 1, type: 1 });

// Index pour rechercher par zone sur un serveur (utile pour l'optimisation)
NPCSchema.index({ serverId: 1, zoneId: 1, isActive: 1 });

export default mongoose.model<INPC>("NPC", NPCSchema);
