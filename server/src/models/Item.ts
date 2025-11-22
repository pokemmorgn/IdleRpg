import mongoose, { Schema, Document } from "mongoose";

export interface IItemModel extends Document {
  itemId: string;

  // category: "equipment" | "consumable" | "material" | "chest"
  type: string;

  name: string;
  description?: string;

  iconId?: string;

  // Stackable items
  stackable?: boolean;
  maxStack?: number;

  // Equipment only
  equipSlot?: string; // head, chest, ring1, ring2...

  // Rarity: common/rare/epic/legendary/mythic
  rarity?: string;

  // Consumables only
  effects?: any;

  // Alt-shared or not
  shared?: boolean;
}

const ItemSchema = new Schema<IItemModel>({
  itemId: { type: String, required: true, unique: true },

  type: { type: String, required: true }, // equipment / consumable / material / chest

  name: { type: String, required: true },
  description: { type: String },

  iconId: { type: String },

  stackable: { type: Boolean, default: true },
  maxStack: { type: Number, default: 99 },

  equipSlot: { type: String },

  rarity: { type: String, default: "common" },

  effects: { type: Object },

  shared: { type: Boolean, default: false }
});

export default mongoose.model<IItemModel>("Item", ItemSchema);
