// server/src/colyseus/schema/InventoryState.ts

import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";
import { InventorySlot } from "./InventorySlot";

export class InventoryState extends Schema {

    @type("number") maxSlots: number = 20;

    @type([InventorySlot])
    slots = new ArraySchema<InventorySlot>();

    @type({ map: InventorySlot })
    equipment = new MapSchema<InventorySlot>();

    @type({ map: InventorySlot })
    personalItems = new MapSchema<InventorySlot>();

    constructor() {
        super();

        // INVENTORY SLOTS
        for (let i = 0; i < this.maxSlots; i++) {
            this.slots.push(new InventorySlot());
        }

        // EQUIPMENT
        const equipSlots = [
            "head", "chest", "legs", "feet", "hands",
            "weapon", "offhand",
            "ring1", "ring2",
            "trinket1", "trinket2",
            "neck"
        ];

        for (const slot of equipSlots) {
            this.equipment.set(slot, new InventorySlot());
        }

        // PERSONAL ITEMS
        this.personalItems = new MapSchema<InventorySlot>();
    }

    /* ==============================================
       LOAD FROM PROFILE
       ============================================== */
    loadFromProfile(data: any) {
        if (!data || typeof data !== "object") return;

        this.maxSlots = data.maxSlots || 20;

        // SLOTS
        this.slots = new ArraySchema<InventorySlot>();
        for (let i = 0; i < this.maxSlots; i++) {
            const slot = new InventorySlot();
            const raw = data.slots?.[i];
            if (raw) {
                slot.itemId = raw.itemId ?? "";
                slot.amount = raw.amount ?? 0;
            }
            this.slots.push(slot);
        }

        // EQUIPMENT
        this.equipment = new MapSchema<InventorySlot>();
        for (const [name, raw] of Object.entries<any>(data.equipment || {})) {
            const slot = new InventorySlot();
            if (raw) {
                slot.itemId = raw.itemId ?? "";
                slot.amount = raw.amount ?? 0;
            }
            this.equipment.set(name, slot);
        }

        // PERSONAL ITEMS
        this.personalItems = new MapSchema<InventorySlot>();
        for (const [name, raw] of Object.entries<any>(data.personalItems || {})) {
            const slot = new InventorySlot();
            if (raw) {
                slot.itemId = raw.itemId ?? "";
                slot.amount = raw.amount ?? 0;
            }
            this.personalItems.set(name, slot);
        }
    }

    /* ==============================================
       EXPORT (Send to client)
       ============================================== */
    exportSlots() {
        return this.slots.map(s => ({
            itemId: s.itemId,
            amount: s.amount
        }));
    }

    exportEquipment() {
        return Object.fromEntries(
            [...this.equipment.entries()].map(([k, s]) => [
                k,
                { itemId: s.itemId, amount: s.amount }
            ])
        );
    }

    exportPersonalItems() {
        return Object.fromEntries(
            [...this.personalItems.entries()].map(([k, s]) => [
                k,
                { itemId: s.itemId, amount: s.amount }
            ])
        );
    }

    /* ==============================================
       SAVE TO PROFILE (Mongo → JSON)
       ============================================== */
    saveToProfile() {
        return {
            maxSlots: this.maxSlots,

            slots: this.exportSlots(),

            equipment: this.exportEquipment(),

            personalItems: this.exportPersonalItems()
        };
    }
}
