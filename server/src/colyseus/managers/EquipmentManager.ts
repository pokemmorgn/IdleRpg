// server/src/colyseus/managers/EquipmentManager.ts

import { PlayerState } from "../schema/PlayerState";
import ItemModel from "../../models/Item";
import { InventorySlot } from "../schema/InventorySlot";
import { computeFullStats } from "./stats/PlayerStatsCalculator";

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

        const equipSlot = String(model.equipSlot);
        const currently = inv.equipment.get(equipSlot);

        // ---------------------------------------------------------
        // 🟥 RETIRER ancien item du itemCache
        // ---------------------------------------------------------
        if (currently && currently.itemId) {
            delete player.itemCache[currently.itemId];
        }

        // Remettre l’ancien équipement dans un slot libre
        if (currently && currently.itemId !== "") {
            const free = this.findFreeBagSlot(inv);
            if (free === -1) return;
            inv.slots[free].setItem(currently.itemId, currently.amount);
        }

        // ---------------------------------------------------------
        // 🟩 ÉQUIPER NOUVEL ITEM
        // ---------------------------------------------------------
        const newSlot = new InventorySlot();
        newSlot.setItem(s.itemId, 1);
        inv.equipment.set(equipSlot, newSlot);

        // 🔥 Ajouter à itemCache
        player.itemCache[s.itemId] = {
            stats: model.stats || {}
        };

        // Enlever du sac
        s.amount -= 1;
        if (s.amount <= 0) s.clear();

        // ---------------------------------------------------------
        // 🔥 RECALCUL + SYNC
        // ---------------------------------------------------------
        const newStats = await computeFullStats(player);
        player.loadStatsFromProfile(newStats);

        this.emit(player.sessionId, "stats_update", newStats);
        this.sync(player);
        await this.savePlayer(player);
    }

    // ============================================================
    // UNEQUIP
    // ============================================================
    async unequip(player: PlayerState, equipSlot: string) {

        const inv = player.inventory;
        const key = String(equipSlot);

        const eq = inv.equipment.get(key);
        if (!eq || !eq.itemId) return;

        const free = this.findFreeBagSlot(inv);
        if (free === -1) return;

        // Remettre dans l'inventaire
        inv.slots[free].setItem(eq.itemId, 1);

        // ---------------------------------------------------------
        // 🟥 supprimer l’item du cache !
        // ---------------------------------------------------------
        delete player.itemCache[eq.itemId];

        // vider le slot d’équipement
        const empty = new InventorySlot();
        inv.equipment.set(key, empty);

        // ---------------------------------------------------------
        // 🔥 RECALCUL
        // ---------------------------------------------------------
        const newStats = await computeFullStats(player);
        player.loadStatsFromProfile(newStats);

        this.emit(player.sessionId, "stats_update", newStats);
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
            slots: player.inventory.exportSlots(),
            equipment: player.inventory.exportEquipment(),
            personalItems: player.inventory.exportPersonalItems()
        });
    }
}
