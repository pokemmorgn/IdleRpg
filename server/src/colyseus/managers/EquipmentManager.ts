// server/src/colyseus/managers/EquipmentManager.ts

import { PlayerState } from "../schema/PlayerState";
import ItemModel from "../../models/Item";
import { InventorySlot } from "../schema/InventorySlot";

export class EquipmentManager {

    constructor(
        private readonly emit: (sessionId: string, type: string, payload: any) => void,
        private readonly savePlayer: (player: PlayerState) => Promise<void>
    ) {}

    // ============================================================
    // EQUIP
    // ============================================================
    async equip(player: PlayerState, fromSlotIndex: number) {

        const inv = player.inventory;
        const s = inv.slots[fromSlotIndex];
        if (!s || !s.itemId) return;

        const model = await ItemModel.findOne({ itemId: s.itemId });
        if (!model || model.type !== "equipment") return;

        const equipSlot = String(model.equipSlot);   // 🔥 IMPORTANT
        const currently = inv.equipment.get(equipSlot);

        // Remettre l’ancien équipement dans un slot libre
        if (currently && currently.itemId !== "") {
            const free = this.findFreeBagSlot(inv);
            if (free === -1) return;

            inv.slots[free].setItem(currently.itemId, currently.amount);
        }

        // équiper le nouveau
        const newSlot = new InventorySlot();
        newSlot.setItem(s.itemId, 1);
        inv.equipment.set(equipSlot, newSlot);      // 🔥 KEY STRING

        // enlever du sac
        s.amount -= 1;
        if (s.amount <= 0) s.clear();

        this.sync(player);
        await this.savePlayer(player);
    }

    // ============================================================
    // UNEQUIP
    // ============================================================
    async unequip(player: PlayerState, equipSlot: number) {

        const inv = player.inventory;

        const key = String(equipSlot);             // 🔥 KEY STRING
        const eq = inv.equipment.get(key);
        if (!eq || !eq.itemId) return;

        const free = this.findFreeBagSlot(inv);
        if (free === -1) return;

        inv.slots[free].setItem(eq.itemId, 1);

        const empty = new InventorySlot();
        inv.equipment.set(key, empty);             // 🔥 KEY STRING

        this.sync(player);
        await this.savePlayer(player);
    }

    // ============================================================
    // FIND FREE SLOT
    // ============================================================
    private findFreeBagSlot(inv: any): number {
        for (let i = 0; i < inv.slots.length; i++) {
            if (!inv.slots[i].itemId) return i;
        }
        return -1;
    }

    // ============================================================
    // SYNC
    // ============================================================
    private sync(player: PlayerState) {
        this.emit(player.sessionId, "inventory_update", {
            slots: player.inventory.slots.map(s => ({ itemId: s.itemId, amount: s.amount })),
            equipment: Object.fromEntries(
                [...player.inventory.equipment.entries()].map(([k, s]) => [
                    k, { itemId: s.itemId, amount: s.amount }
                ])
            )
        });
    }
}
