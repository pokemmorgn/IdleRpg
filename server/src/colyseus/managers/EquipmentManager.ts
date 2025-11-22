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

        // récupérer ancien équipement
        const oldSlot = inv.equipment.get(equipSlot);

        // si déjà équipé → remettre dans inventaire
        if (oldSlot && oldSlot.itemId) {
            const free = this.findFreeBagSlot(inv);
            if (free === -1) return;
            inv.slots[free].setItem(oldSlot.itemId, oldSlot.amount);
        }

        // créer un nouveau slot d’équipement
        const newSlot = new InventorySlot();
        newSlot.setItem(s.itemId, 1);

        // 💥 copier les stats depuis ItemModel dans le slot
        if (model.stats) {
            for (const [stat, value] of Object.entries(model.stats)) {
                newSlot.stats.set(stat, value as number);
            }
        }

        // placer dans la MapSchema d’équipement
        inv.equipment.set(equipSlot, newSlot);

        // retirer du sac
        s.amount -= 1;
        if (s.amount <= 0) s.clear();

        // recalcul
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
        const eq = inv.equipment.get(equipSlot);
        if (!eq || !eq.itemId) return;

        const free = this.findFreeBagSlot(inv);
        if (free === -1) return;

        // remettre dans sac
        inv.slots[free].setItem(eq.itemId, 1);

        // vider l'équipement
        const empty = new InventorySlot();
        inv.equipment.set(equipSlot, empty);

        // recalcul
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
