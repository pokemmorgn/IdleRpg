import mongoose, { Schema, Document } from "mongoose";

export interface IItemModel extends Document {
  itemId: string;

  name: string;
  description: string;

  iconId: string;

  category:
    | "material"
    | "consumable"
    | "chest"
    | "collection"
    | "upgrade"
    | "bag"
    | "quest_item"
    | "other";

  rarity: "common" | "rare" | "epic" | "legendary" | "mythic";

  maxStack: number;

  isAccountBound: boolean;
  isCharacterBound: boolean;
  isTradable: boolean;
  isSellable: boolean;
  sellValue: number;

  effects?: any;
}

const ItemModelSchema = new Schema<IItemModel>(
  {
    itemId: { type: String, required: true, unique: true },

    name: { type: String, required: true },
    description: { type: String, default: "" },

    iconId: { type: String, required: true },

    category: {
      type: String,
      required: true,
      enum: [
        "material",
        "consumable",
        "chest",
        "collection",
        "upgrade",
        "bag",
        "quest_item",
        "other"
      ],
    },

    rarity: {
      type: String,
      required: true,
      enum: ["common", "rare", "epic", "legendary", "mythic"],
      default: "common",
    },

    maxStack: { type: Number, default: 1 },

    isAccountBound: { type: Boolean, default: false },
    isCharacterBound: { type: Boolean, default: false },
    isTradable: { type: Boolean, default: true },
    isSellable: { type: Boolean, default: true },
    sellValue: { type: Number, default: 0 },

    effects: { type: Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

export default mongoose.model<IItemModel>("ItemModel", ItemModelSchema);
