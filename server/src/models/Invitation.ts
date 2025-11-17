import mongoose, { Schema, Document, Types } from "mongoose";

export interface IInvitation extends Document {
  code: string;                    // Code unique d'invitation (ex: "A3B5C7D9")
  inviterProfileId: Types.ObjectId; // ID du profil qui a créé l'invitation
  inviterPlayerId: Types.ObjectId;  // ID du joueur qui a créé l'invitation
  serverId: string;                 // Serveur concerné (ex: "s1")
  
  // Utilisation
  used: boolean;                    // Si le code a été utilisé
  usedBy: Types.ObjectId | null;    // ID du joueur qui a utilisé le code
  usedAt: Date | null;              // Date d'utilisation
  
  // Expiration
  expiresAt: Date;                  // Date d'expiration du code
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true
  },
  inviterProfileId: {
    type: Schema.Types.ObjectId,
    ref: "ServerProfile",
    required: true,
    index: true
  },
  inviterPlayerId: {
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
  used: {
    type: Boolean,
    default: false,
    index: true
  },
  usedBy: {
    type: Schema.Types.ObjectId,
    ref: "Player",
    default: null
  },
  usedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Index composé pour rechercher les invitations d'un joueur sur un serveur
InvitationSchema.index({ inviterPlayerId: 1, serverId: 1 });

// Index composé pour rechercher les codes non utilisés et non expirés
InvitationSchema.index({ used: 1, expiresAt: 1 });

export default mongoose.model<IInvitation>("Invitation", InvitationSchema);
