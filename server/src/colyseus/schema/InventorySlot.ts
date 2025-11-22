// server/src/colyseus/schema/InventorySlot.ts
import { Schema, type } from "@colyseus/schema";

export class InventorySlot extends Schema {
  @type("string")
  itemId: string = "";

  @type("boolean")
  isEquipment: boolean = false;

  @type("string")
  uniqueId: string = ""; // instance unique (UUID)

  @type("number")
  quantity: number = 0;

  @type("boolean")
  isBound: boolean = false;

  @type("string")
  rarity: string = ""; // utile pour l'affichage côté client

  @type("string")
  iconId: string = ""; // direct pour Unity

  // Stats générées pour les équipements
  @type({ map: "number" })
  generatedStats = new Map<string, number>();
}
