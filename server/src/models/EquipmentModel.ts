import mongoose, { Schema, Document } from "mongoose";

export interface IEquipmentModel extends Document {
  itemId: string;

  name: string;
  description: string;
  iconId: string;

  slot:
    | "head"
    | "neck"
    | "shoulders"
    | "chest"
    | "waist"
    | "legs"
    | "feet"
    | "wrists"
    | "hands"
    | "ring"
    | "trinket"
    | "back"
    | "main_hand"
    | "off_hand";

  rarity: "common" | "rare" | "epic" | "legendary" | "mythic";

  requiredLevel: number;
  allowedClasses: string[];
  allowedRaces: string[];

  fixedStats: Record<string, number>; // ex: { hp: 50, armor: 10 }
  secondaryPool: string[];            // liste des stats possibles
  secondaryRanges: Record<
    string,
    { min: number; max: number }
  >;

  bindOnPickup: boolean;
  bindOnEquip: boolean;
  isTradable: boolean;

  sellValue: number;
}

const EquipmentSchema = new Schema<IEquipmentModel>(
  {
    itemId: { type: String, required: true, unique: true },

    name: { type: String, required: true },
    description: { type: String, default: "" },
    iconId: { type: String, required: true },

    slot: {
      type: String,
      required: true,
      enum: [
        "head",
        "neck",
        "shoulders",
        "chest",
        "waist",
        "legs",
        "feet",
        "wrists",
        "hands",
        "ring",
        "trinket",
        "back",
        "main_hand",
        "off_hand",
      ],
    },

    rarity: {
      type: String,
      required: true,
      enum: ["common", "rare", "epic", "legendary", "mythic"],
      default: "common",
    },

    requiredLevel: { type: Number, default: 1 },
    allowedClasses: { type: [String], default: [] },
    allowedRaces: { type: [String], default: [] },

    fixedStats: { type: Schema.Types.Mixed, default: {} },
    secondaryPool: { type: [String], default: [] },
    secondaryRanges: { type: Schema.Types.Mixed, default: {} },

    bindOnPickup: { type: Boolean, default: false },
    bindOnEquip: { type: Boolean, default: false },
    isTradable: { type: Boolean, default: true },

    sellValue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<IEquipmentModel>("EquipmentModel", EquipmentSchema);
