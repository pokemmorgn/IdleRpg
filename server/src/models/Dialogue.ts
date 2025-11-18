import mongoose, { Schema, Document } from "mongoose";

// ===== Conditions =====
export interface IDialogueCondition {
  type: "level_min" | "level_max" | "has_tag" | "has_all_tags" | "has_any_tag" | "has_tag_matching" | "has_item" | "quest_completed";
  value?: any;           // Valeur de comparaison (nombre, etc.)
  tag?: string;          // Tag unique (si type = has_tag ou has_tag_matching)
  tags?: string[];       // Array de tags (si type = has_all_tags ou has_any_tag)
  itemId?: string;       // ID de l'item (si type = has_item) - PLACEHOLDER
  quantity?: number;     // Quantité requise (si type = has_item) - PLACEHOLDER
  questId?: string;      // ID de la quête (si type = quest_completed) - PLACEHOLDER
}

// ===== Actions =====
export interface IDialogueAction {
  type: "add_tag" | "remove_tag" | "give_xp" | "give_item" | "learn_recipe" | "learn_skill" | "start_quest" | "open_shop";
  tag?: string;          // Tag à ajouter/retirer (si type = add_tag ou remove_tag)
  amount?: number;       // Montant (si type = give_xp)
  itemId?: string;       // ID de l'item (si type = give_item) - PLACEHOLDER
  quantity?: number;     // Quantité (si type = give_item) - PLACEHOLDER
  recipeId?: string;     // ID de la recette (si type = learn_recipe) - PLACEHOLDER
  skillId?: string;      // ID du skill (si type = learn_skill) - PLACEHOLDER
  questId?: string;      // ID de la quête (si type = start_quest) - PLACEHOLDER
  shopId?: string;       // ID du shop (si type = open_shop)
}

// ===== Choix =====
export interface IDialogueChoice {
  choiceText: string;              // Clé de traduction (ex: "dialogue.thorin.choice.about_work")
  nextNode: string;                // ID du noeud suivant
  conditions?: IDialogueCondition[]; // Conditions pour afficher ce choix (optionnel)
}

// ===== Noeud =====
export interface IDialogueNode {
  nodeId: string;                  // ID unique du noeud (ex: "start", "about_work")
  text: string;                    // Clé de traduction (ex: "dialogue.thorin.greeting")
  conditions?: IDialogueCondition[]; // Conditions pour afficher ce noeud (optionnel)
  actions?: IDialogueAction[];     // Actions à exécuter quand on arrive sur ce noeud (optionnel)
  choices: IDialogueChoice[];      // Choix possibles
}

// ===== Protection Spam =====
export interface ISpamTier {
  minCount: number;      // Compteur minimum (inclus)
  maxCount: number | null; // Compteur maximum (inclus) - null = infini
  startNode: string;     // Noeud de départ pour ce tier
}

export interface ISpamProtection {
  enabled: boolean;      // Si la protection spam est activée
  resetDelay: number;    // Délai en secondes avant reset du compteur court (ex: 300 = 5 minutes)
  tiers: ISpamTier[];    // Tiers de spam
}

// ===== Dialogue =====
export interface IDialogue extends Document {
  dialogueId: string;              // ID unique du dialogue (ex: "dialogue_thorin_greeting")
  npcId?: string;                  // ID du NPC associé (optionnel, pour organisation)
  description?: string;            // Description en anglais (pour les devs)
  spamProtection?: ISpamProtection; // Protection spam (optionnel)
  nodes: IDialogueNode[];          // Arbre de dialogue
  createdAt: Date;
  updatedAt: Date;
}

// ===== Schemas =====

const DialogueConditionSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ["level_min", "level_max", "has_tag", "has_all_tags", "has_any_tag", "has_tag_matching", "has_item", "quest_completed"]
  },
  value: {
    type: Schema.Types.Mixed,
    default: null
  },
  tag: {
    type: String,
    default: null
  },
  tags: {
    type: [String],
    default: null
  },
  itemId: {
    type: String,
    default: null
  },
  quantity: {
    type: Number,
    default: null
  },
  questId: {
    type: String,
    default: null
  }
}, { _id: false });

const DialogueActionSchema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ["add_tag", "remove_tag", "give_xp", "give_item", "learn_recipe", "learn_skill", "start_quest", "open_shop"]
  },
  tag: {
    type: String,
    default: null
  },
  amount: {
    type: Number,
    default: null
  },
  itemId: {
    type: String,
    default: null
  },
  quantity: {
    type: Number,
    default: null
  },
  recipeId: {
    type: String,
    default: null
  },
  skillId: {
    type: String,
    default: null
  },
  questId: {
    type: String,
    default: null
  },
  shopId: {
    type: String,
    default: null
  }
}, { _id: false });

const DialogueChoiceSchema = new Schema({
  choiceText: {
    type: String,
    required: true
  },
  nextNode: {
    type: String,
    required: true
  },
  conditions: {
    type: [DialogueConditionSchema],
    default: []
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
  conditions: {
    type: [DialogueConditionSchema],
    default: []
  },
  actions: {
    type: [DialogueActionSchema],
    default: []
  },
  choices: {
    type: [DialogueChoiceSchema],
    default: []
  }
}, { _id: false });

const SpamTierSchema = new Schema({
  minCount: {
    type: Number,
    required: true,
    min: 0
  },
  maxCount: {
    type: Number,
    default: null
  },
  startNode: {
    type: String,
    required: true
  }
}, { _id: false });

const SpamProtectionSchema = new Schema({
  enabled: {
    type: Boolean,
    required: true,
    default: false
  },
  resetDelay: {
    type: Number,
    required: true,
    default: 300,  // 5 minutes par défaut
    min: 0
  },
  tiers: {
    type: [SpamTierSchema],
    default: []
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
  spamProtection: {
    type: SpamProtectionSchema,
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
