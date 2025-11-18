import mongoose, { Schema, Document } from "mongoose";

export interface IDialogueChoice {
  choiceText: string;      // Clé de traduction (ex: "dialogue.thorin.choice.about_work")
  nextNode: string;        // ID du noeud suivant (ex: "about_work", "end")
}

export interface IDialogueNode {
  nodeId: string;          // ID unique du noeud (ex: "start", "about_work")
  text: string;            // Clé de traduction (ex: "dialogue.thorin.greeting")
  choices: IDialogueChoice[];  // Choix possibles
  action?: string;         // Action optionnelle (ex: "open_shop", "start_quest")
}

export interface IDialogue extends Document {
  dialogueId: string;      // ID unique du dialogue (ex: "dialogue_thorin_greeting")
  npcId?: string;          // ID du NPC associé (optionnel, pour organisation)
  description?: string;    // Description en anglais (pour les devs)
  nodes: IDialogueNode[];  // Arbre de dialogue
  createdAt: Date;
  updatedAt: Date;
}

const DialogueChoiceSchema = new Schema({
  choiceText: {
    type: String,
    required: true
  },
  nextNode: {
    type: String,
    required: true
  }
}, { _id: false });

const DialogueNodeSchema = new Schema({
  nodeId: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  choices: {
    type: [DialogueChoiceSchema],
    default: []
  },
  action: {
    type: String,
    default: null
  }
}, { _id: false });

const DialogueSchema = new Schema<IDialogue>({
  dialogueId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  npcId: {
    type: String,
    default: null,
    index: true
  },
  description: {
    type: String,
    default: null
  },
  nodes: {
    type: [DialogueNodeSchema],
    required: true,
    validate: {
      validator: function(nodes: IDialogueNode[]) {
        // Vérifier qu'il y a au moins un noeud
        if (nodes.length === 0) {
          return false;
        }
        
        // Vérifier qu'il y a un noeud "start"
        const hasStart = nodes.some(node => node.nodeId === "start");
        if (!hasStart) {
          return false;
        }
        
        return true;
      },
      message: "Dialogue must have at least one node and a 'start' node"
    }
  }
}, {
  timestamps: true
});

// Index pour rechercher par NPC
DialogueSchema.index({ npcId: 1 });

export default mongoose.model<IDialogue>("Dialogue", DialogueSchema);
