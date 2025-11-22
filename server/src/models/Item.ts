import mongoose, { Schema, Document } from "mongoose";

export interface IItemModel extends Document {
    itemId: string;
    name: string;

    type: "consumable" | "equipment" | "material" | "container" | "quest";
    icon: string;

    stackable?: boolean;
    maxStack?: number;

    // Consumable
    effects?: any;

    // Equipment
    equipSlot?: string;
    stats?: Record<string, number>;

    // Container / loot box
    rewards?: Array<{
        itemId: string;
        min: number;
        max: number;
        weight: number;
    }>;

    // Bag upgrade
    bagSizeIncrease?: number;

    // 🔥 Nouveau : item lié au personnage (non transférable)
    personal?: boolean;

    // Shared flag (si tu veux plus tard)
    shared?: boolean;
}

const ItemSchema = new Schema<IItemModel>({
    itemId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    icon: { type: String, required: true },

    stackable: { type: Boolean, default: true },
    maxStack: { type: Number, default: 99 },

    effects: { type: Object },

    equipSlot: { type: String },
    stats: { type: Object },

    rewards: [{
        itemId: String,
        min: Number,
        max: Number,
        weight: Number
    }],

    bagSizeIncrease: Number,

    // 🔥 Ajout
    personal: { type: Boolean, default: false },

    shared: { type: Boolean, default: false }
});

export default mongoose.model<IItemModel>("Item", ItemSchema);
