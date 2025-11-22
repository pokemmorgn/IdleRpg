// server/src/colyseus/schema/InventorySlot.ts

import { Schema, type, MapSchema } from "@colyseus/schema";

export class InventorySlot extends Schema {

    @type("string") itemId: string = "";
    @type("number") amount: number = 0;

    // 🔥 Ajout : les stats transportées par cet item
    @type({ map: "number" }) stats = new MapSchema<number>();

    constructor() {
        super();
    }

    setItem(id: string, amt: number) {
        this.itemId = id;
        this.amount = amt;
    }

    clear() {
        this.itemId = "";
        this.amount = 0;
        this.stats.clear();   // 🔥 nettoyer les stats !
    }

    copyFrom(other: InventorySlot) {
        this.itemId = other.itemId;
        this.amount = other.amount;

        this.stats.clear();
        for (const [k, v] of other.stats.entries()) {
            this.stats.set(k, v);
        }
    }

    isEmpty() {
        return !this.itemId || this.amount <= 0;
    }
}
