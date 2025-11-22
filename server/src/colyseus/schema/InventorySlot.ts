// server/src/colyseus/schema/InventorySlot.ts
import { Schema, type } from "@colyseus/schema";

export class InventorySlot extends Schema {

    @type("string") itemId: string = "";
    @type("number") amount: number = 0;

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
    }

    copyFrom(other: InventorySlot) {
        this.itemId = other.itemId;
        this.amount = other.amount;
    }

    isEmpty() {
        return !this.itemId || this.amount <= 0;
    }
}
