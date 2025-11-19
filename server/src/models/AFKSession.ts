import mongoose, { Schema, Document } from "mongoose";

/**
 * AFKSession - Stocke les sessions AFK des joueurs
 * 
 * Responsabilités :
 * - Tracker l'état AFK d'un joueur
 * - Accumuler les récompenses (monstres tués, XP, loot)
 * - Gérer la limite de 2h
 * - Stocker la position de référence AFK
 */
export interface IAFKSession extends Document {
  profileId: string;           // Référence au ServerProfile
  serverId: string;            // Serveur concerné (ex: "s1")
  
  // État de la session
  isActive: boolean;           // Si le mode AFK est actuellement actif
  startTime: Date;             // Date de début de la session AFK
  lastUpdateTime: Date;        // Dernière mise à jour du récap
  
  // Position de référence (position au moment de l'activation AFK)
  referencePosition: {
    x: number;
    y: number;
    z: number;
  };
  
  // Récapitulatif accumulé
  summary: {
    monstersKilled: number;    // Nombre de monstres tués
    xpGained: number;          // XP gagnée (pas encore appliquée)
    goldGained: number;        // Or gagné (pas encore dans l'inventaire)
    deaths: number;            // Nombre de morts du joueur
    totalTime: number;         // Temps total en secondes
  };
  
  // Limite de temps
  maxDuration: number;         // Durée max en secondes (7200 = 2h)
  timeLimitReached: boolean;   // Si la limite de 2h a été atteinte
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const AFKSessionSchema = new Schema<IAFKSession>({
  profileId: {
    type: String,
    required: true,
    index: true
  },
  serverId: {
    type: String,
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    required: true,
    default: false
  },
  startTime: {
    type: Date,
    required: true,
    default: () => new Date()
  },
  lastUpdateTime: {
    type: Date,
    required: true,
    default: () => new Date()
  },
  referencePosition: {
    x: {
      type: Number,
      required: true,
      default: 0
    },
    y: {
      type: Number,
      required: true,
      default: 0
    },
    z: {
      type: Number,
      required: true,
      default: 0
    }
  },
  summary: {
    monstersKilled: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    xpGained: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    goldGained: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    deaths: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    totalTime: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    }
  },
  maxDuration: {
    type: Number,
    required: true,
    default: 7200  // 2 heures
  },
  timeLimitReached: {
    type: Boolean,
    required: true,
    default: false
  }
}, {
  timestamps: true
});

// Index composé pour rechercher rapidement la session d'un joueur sur un serveur
AFKSessionSchema.index({ profileId: 1, serverId: 1 }, { unique: true });

// Index pour trouver les sessions actives
AFKSessionSchema.index({ isActive: 1 });

// Index pour trouver les sessions d'un serveur spécifique
AFKSessionSchema.index({ serverId: 1, isActive: 1 });

export default mongoose.model<IAFKSession>("AFKSession", AFKSessionSchema);
