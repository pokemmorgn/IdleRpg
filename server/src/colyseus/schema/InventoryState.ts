// server/src/colyseus/schema/InventoryState.ts

import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";
import { InventorySlot } from "./InventorySlot";

export class InventoryState extends Schema {

    // Nombre de slots dans l’inventaire
    @type("number") maxSlots: number = 20;

    // Slots de l’inventaire
    @type([InventorySlot])
    slots = new ArraySchema<InventorySlot>();

    // Emplacements d’équipement (head, chest, ring1, ring2, etc.)
    @type({ map: InventorySlot })
    equipment = new MapSchema<InventorySlot>();

    constructor() {
        super();

        // Initialiser les slots vides
        for (let i = 0; i < this.maxSlots; i++) {
            this.slots.push(new InventorySlot());
        }

        // Initialiser les équipements
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
    }

    /* ==============================================
       LOAD FROM PROFILE (Mongo → Serveur)
       ============================================== */
    loadFromProfile(data: any) {
        if (!data || typeof data !== "object") return;

        // maxSlots
        this.maxSlots = data.maxSlots || 20;

        // Rebuild inventory slots
        this.slots = new ArraySchema<InventorySlot>();
        for (let i = 0; i < this.maxSlots; i++) {
            const slot = new InventorySlot();
            const raw = data.slots?.[i];
            if (raw && typeof raw === "object") {
                slot.itemId = raw.itemId ?? "";
                slot.amount = raw.amount ?? 0;
            }
            this.slots.push(slot);
        }

        // Rebuild equipment
        this.equipment = new MapSchema<InventorySlot>();
        for (const [slotName, raw] of Object.entries<any>(data.equipment || {})) {
            const slot = new InventorySlot();
            if (raw && typeof raw === "object") {
                slot.itemId = raw.itemId ?? "";
                slot.amount = raw.amount ?? 0;
            }
            this.equipment.set(slotName, slot);
        }
    }

    /* ==============================================
       SAVE TO PROFILE (Serveur → Mongo)
       ============================================== */
    saveToProfile() {
        return {
            maxSlots: this.maxSlots,
            slots: this.slots.map(s => ({
                itemId: s.itemId,
                amount: s.amount
            })),
            equipment: Object.fromEntries(
                [...this.equipment.entries()].map(([k, v]) => [
                    k,
                    {
                        itemId: v.itemId,
                        amount: v.amount
                    }
                ])
            )
        };
    }
}
