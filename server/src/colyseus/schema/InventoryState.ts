// server/src/colyseus/schema/InventoryState.ts

import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";
import { InventorySlot } from "./InventorySlot";

export class InventoryState extends Schema {

    // Taille totale du sac
    @type("number") maxSlots: number = 20;

    // Slots d’inventaire (indexés : 0 → maxSlots)
    @type([InventorySlot])
    slots = new ArraySchema<InventorySlot>();

    // Équipement (clé string obligatoire)
    @type({ map: InventorySlot })
    equipment = new MapSchema<InventorySlot>();

    constructor() {
        super();

        /* ===============================
           INIT INVENTORY SLOTS
        ================================ */
        for (let i = 0; i < this.maxSlots; i++) {
            this.slots.push(new InventorySlot());
        }

        /* ===============================
           INIT EQUIPMENT SLOTS
        ================================ */
        const equipSlots = [
            "head", "chest", "legs", "feet", "hands",
            "weapon", "offhand",
            "ring1", "ring2",
            "trinket1", "trinket2",
            "neck"
        ];

        for (const slotName of equipSlots) {
            this.equipment.set(slotName, new InventorySlot());
        }
    }

    /* ============================================================
       LOAD FROM PROFILE (Mongo → Serveur)
    ============================================================ */
    loadFromProfile(data: any) {
        if (!data || typeof data !== "object") return;

        // Charger taille sac
        this.maxSlots = data.maxSlots || 20;

        // Rebuilding slots
        const newSlots = new ArraySchema<InventorySlot>();
        for (let i = 0; i < this.maxSlots; i++) {
            const s = new InventorySlot();
            const raw = data.slots?.[i];

            if (raw && typeof raw === "object") {
                s.itemId = raw.itemId ?? "";
                s.amount = raw.amount ?? 0;
            }
            newSlots.push(s);
        }
        this.slots = newSlots;

        // Rebuilding equipment
        const newEquip = new MapSchema<InventorySlot>();
        for (const [slotName, raw] of Object.entries<any>(data.equipment || {})) {
            const s = new InventorySlot();

            if (raw && typeof raw === "object") {
                s.itemId = raw.itemId ?? "";
                s.amount = raw.amount ?? 0;
            }
            newEquip.set(slotName, s);
        }
        this.equipment = newEquip;
    }

    /* ============================================================
       SAVE TO PROFILE (Serveur → Mongo)
    ============================================================ */
    saveToProfile() {
        return {
            maxSlots: this.maxSlots,
            slots: this.slots.map(s => ({
                itemId: s.itemId,
                amount: s.amount
            })),
            equipment: Object.fromEntries(
                [...this.equipment.entries()].map(([slotName, s]) => [
                    slotName,
                    {
                        itemId: s.itemId,
                        amount: s.amount
                    }
                ])
            )
        };
    }

    /* ============================================================
       EXPORT (vers client)
    ============================================================ */
    exportSlots() {
        return this.slots.map(s => ({
            itemId: s.itemId,
            amount: s.amount
        }));
    }

    exportEquipment() {
        const obj: Record<string, any> = {};
        for (const [slotName, slot] of this.equipment.entries()) {
            obj[slotName] = {
                itemId: slot.itemId,
                amount: slot.amount
            };
        }
        return obj;
    }

    /* ============================================================
       UTILITAIRE : vider inventaire
    ============================================================ */
    clearAll() {
        for (const s of this.slots) {
            s.itemId = "";
            s.amount = 0;
        }
        for (const [k, s] of this.equipment.entries()) {
            s.itemId = "";
            s.amount = 0;
            this.equipment.set(k, s);
        }
    }
}
