import { Schema, type, MapSchema } from "@colyseus/schema";
import { InventorySlot } from "./InventorySlot";

export class InventoryState extends Schema {

    @type({ map: InventorySlot })
    slots = new MapSchema<InventorySlot>();

    @type({ map: InventorySlot })
    equipment = new MapSchema<InventorySlot>();

    constructor() {
        super();

        // 20 slots par défaut
        for (let i = 0; i < 20; i++) {
            this.slots.set(String(i), new InventorySlot());
        }

        // Equipment slots
        const equipSlots = [
            "head", "neck", "shoulders", "chest", "legs", "feet", "hands",
            "ring1", "ring2", "trinket1", "trinket2", "weapon", "offhand"
        ];

        for (const k of equipSlots) {
            this.equipment.set(k, new InventorySlot());
        }
    }

    // ============================================================
    // LOAD FROM PROFILE
    // ============================================================
    loadFromProfile(data: any) {

        if (!data) return;

        // --- SLOTS ---
        for (const [k, raw] of Object.entries(data.slots || {})) {
            const v = raw as { itemId?: string; amount?: number };
            const slot = this.slots.get(k);
            if (!slot) continue;

            slot.itemId = v.itemId || "";
            slot.amount = v.amount || 0;
        }

        // --- EQUIPMENT ---
        for (const [k, raw] of Object.entries(data.equipment || {})) {
            const v = raw as { itemId?: string; amount?: number };
            const slot = this.equipment.get(k);
            if (!slot) continue;

            slot.itemId = v.itemId || "";
            slot.amount = v.amount || 0;
        }
    }

    // ============================================================
    // SAVE TO PROFILE
    // ============================================================
    saveToProfile() {
        return {
            slots: Object.fromEntries(
                [...this.slots].map(([k, s]) => [
                    k,
                    { itemId: s.itemId, amount: s.amount }
                ])
            ),
            equipment: Object.fromEntries(
                [...this.equipment].map(([k, s]) => [
                    k,
                    { itemId: s.itemId, amount: s.amount }
                ])
            )
        };
    }
}
