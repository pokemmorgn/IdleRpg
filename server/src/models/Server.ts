import mongoose, { Schema, Document } from "mongoose";

export interface IServer extends Document {
  serverId: string;        // "s1", "s2", "s3"...
  name: string;            // "Server 1", "Server 2"...
  cluster: number;         // Numéro du cluster (1, 2, 3...)
  status: string;          // "online", "maintenance", "full", "locked"
  capacity: number;        // Nombre max de joueurs
  currentPlayers: number;  // Nombre actuel de joueurs
  openedAt: Date;         // Date d'ouverture du serveur
}

const ServerSchema = new Schema<IServer>({
  serverId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  cluster: {
    type: Number,
    required: true,
    index: true
  },
  status: { 
    type: String, 
    required: true,
    enum: ["online", "maintenance", "full", "locked"], // ← AJOUTÉ "locked"
    default: "online"
  },
  capacity: { 
    type: Number, 
    default: 10000 
  },
  currentPlayers: { 
    type: Number, 
    default: 0 
  },
  openedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true 
});

// Index composé pour rechercher par cluster
ServerSchema.index({ cluster: 1, serverId: 1 });

export default mongoose.model<IServer>("Server", ServerSchema);
