import mongoose, { Schema, Document, Types } from "mongoose";

export interface IBankItem {
  itemId: string;
  name: string;
  type: string;
  icon: string;
  stackable?: boolean;
  maxStack?: number;
  effects?: any;
  equipSlot?: string;
  stats?: any;
  rewards?: any[];
  bagSizeIncrease?: number;
  personal?: boolean;
  shared?: boolean;
}

export interface IBank extends Document {
  playerId: Types.ObjectId; // facultatif si banque globale
  items: IBankItem[];
  slots: number; // si tu veux limiter
}

const BankItemSchema = new Schema<IBankItem>({
  itemId: String,
  name: String,
  type: String,
  icon: String,
  stackable: Boolean,
  maxStack: Number,
  effects: Object,
  equipSlot: String,
  stats: Object,
  rewards: Array,
  bagSizeIncrease: Number,
  personal: Boolean,
  shared: Boolean
}, { _id: false });

const BankSchema = new Schema<IBank>({
  playerId: { type: Schema.Types.ObjectId, ref: "Player", required: false },

  items: {
    type: [BankItemSchema],
    default: []
  },

  slots: {
    type: Number,
    default: 100
  }
}, { timestamps: true });

export default mongoose.model<IBank>("Bank", BankSchema);
