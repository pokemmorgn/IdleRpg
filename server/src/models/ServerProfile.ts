import mongoose, { Schema, Document } from "mongoose";

export interface IServer extends Document {
  serverId: string;        // "eu-1", "na-1", "asia-1"...
  name: string;            // "Europe - Server 1"
  region: string;          // "EU", "NA", "ASIA"
  status: string;          // "online", "maintenance", "full"
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
  region: { 
    type: String, 
    required: true,
    enum: ["EU", "NA", "ASIA"]
  },
  status: { 
    type: String, 
    required: true,
    enum: ["online", "maintenance", "full"],
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

export default mongoose.model<IServer>("Server", ServerSchema);
