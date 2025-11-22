// server/src/colyseus/schema/InventoryState.ts
import { Schema, type, MapSchema } from "@colyseus/schema";
import { InventorySlot } from "./InventorySlot";

export class InventoryState extends Schema {
  @type("number")
  maxSlots: number = 20; // valeur par défaut

  @type({ map: InventorySlot })
  slots = new MapSchema<InventorySlot>();
}
