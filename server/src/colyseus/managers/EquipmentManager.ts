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
    // EQUIP ITEM FROM BAG → SLOT
    // ============================================================
    async equip(player: PlayerState, fromSlotIndex: number) {

        const inv = player.inventory;
        const s = inv.slots[fromSlotIndex];
        if (!s || !s.itemId) return;

        const model = await ItemModel.findOne({ itemId: s.itemId });
        if (!model || model.type !== "equipment") return;

        const equipSlot = model.equipSlot;
        if (!equipSlot) return;

        const currently = inv.equipment.get(equipSlot);

        // Si un item est déjà équipé → le remettre dans un slot libre
        if (currently && currently.itemId !== "") {
            const free = this.findFreeBagSlot(inv);
            if (free === -1) return;

            inv.slots[free].setItem(currently.itemId, currently.amount);
        }

        // équiper le nouveau
        const newSlot = new InventorySlot();
        newSlot.setItem(s.itemId, 1);
        inv.equipment.set(equipSlot, newSlot);

        // enlever du sac
        s.amount -= 1;
        if (s.amount <= 0) s.clear();

        this.sync(player);
        await this.savePlayer(player);
    }

    // ============================================================
    // UNEQUIP BACK TO BAG
    // ============================================================
    async unequip(player: PlayerState, equipSlot: number) {

        const inv = player.inventory;

        const eq = inv.equipment.get(equipSlot);
        if (!eq || !eq.itemId) return;

        const free = this.findFreeBagSlot(inv);
        if (free === -1) return;

        inv.slots[free].setItem(eq.itemId, 1);

        const empty = new InventorySlot();
        inv.equipment.set(equipSlot, empty);

        this.sync(player);
        await this.savePlayer(player);
    }

    // ============================================================
    // FIND FREE BAG SLOT
    // ============================================================
    private findFreeBagSlot(inv: any): number {
        for (let i = 0; i < inv.slots.length; i++) {
            if (!inv.slots[i].itemId) return i;
        }
        return -1;
    }

    // ============================================================
    // SYNC CLIENT
    // ============================================================
    private sync(player: PlayerState) {
        this.emit(player.sessionId, "inventory_update", {
            slots: player.inventory.exportSlots(),
            equipment: player.inventory.exportEquipment()
        });
    }
}
