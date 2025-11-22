// server/src/colyseus/schema/InventoryState.ts
import { Schema, type, MapSchema } from "@colyseus/schema";
import { InventorySlot } from "./InventorySlot";

export class InventoryState extends Schema {

    // slots du sac
    @type({ map: InventorySlot })
    slots = new MapSchema<InventorySlot>();

    // slots d’équipement
    @type({ map: InventorySlot })
    equipment = new MapSchema<InventorySlot>();

    @type("number") maxSlots: number = 20;

    constructor() {
        super();
        this.initializeSlots();
        this.initializeEquipment();
    }

    initializeSlots() {
        for (let i = 0; i < this.maxSlots; i++) {
            this.slots.set(String(i), new InventorySlot());
        }
    }

    initializeEquipment() {
        const equipSlots = [
            "head", "neck", "shoulder", "chest", "legs",
            "hands", "feet", "weapon", "ring1", "ring2",
            "trinket1", "trinket2"
        ];
        for (const slotId of equipSlots) {
            this.equipment.set(slotId, new InventorySlot());
        }
    }

    /* =======================================================
       PERSISTENCE MongoDB
    ======================================================== */

    loadFromProfile(data: any) {
        if (!data) return;

        // Load inventory slots
        Object.entries(data.slots || {}).forEach(([k, v]) => {
            const slot = new InventorySlot();
            slot.itemId = v.itemId || "";
            slot.amount = v.amount || 0;
            this.slots.set(k, slot);
        });

        // Load equipment
        Object.entries(data.equipment || {}).forEach(([k, v]) => {
            const slot = new InventorySlot();
            slot.itemId = v.itemId || "";
            slot.amount = v.amount || 0;
            this.equipment.set(k, slot);
        });

        this.maxSlots = data.maxSlots || 20;
    }

    saveToProfile() {
        return {
            maxSlots: this.maxSlots,
            slots: Object.fromEntries(
                [...this.slots].map(([k, v]) => [
                    k,
                    { itemId: v.itemId, amount: v.amount }
                ])
            ),
            equipment: Object.fromEntries(
                [...this.equipment].map(([k, v]) => [
                    k,
                    { itemId: v.itemId, amount: v.amount }
                ])
            )
        };
    }

    serialize() {
        return this.saveToProfile();
    }
}
