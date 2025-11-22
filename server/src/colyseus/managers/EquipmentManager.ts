// server/src/colyseus/managers/EquipmentManager.ts

import ItemModel, { IItemModel } from "../../models/Item";
import { PlayerState } from "../schema/PlayerState";
import { InventorySlot } from "../schema/InventorySlot";
import { InventoryState } from "../schema/InventoryState";
import { computeFullStats } from "./stats/PlayerStatsCalculator";

export type EquipNotify = (
    sessionId: string,
    type: string,
    payload: any
) => void;

export class EquipmentManager {

    private items: Map<string, IItemModel> = new Map();
    private notify: EquipNotify;

    constructor(notifyCallback: EquipNotify) {
        this.notify = notifyCallback;
    }

    /* ============================================================
       🔥 LOAD ALL EQUIPMENT MODELS
       ============================================================ */
    public async loadAllEquipment() {
        const docs = await ItemModel.find({ type: "equipment" });
        this.items.clear();

        for (const d of docs) {
            this.items.set(d.itemId, d.toObject());
        }

        console.log(`🛡️ [EquipmentManager] ${docs.length} équipements chargés.`);
    }

    /* ============================================================
       🔥 GET EQUIPMENT MODEL
       ============================================================ */
    public getModel(itemId: string): IItemModel | null {
        return this.items.get(itemId) ?? null;
    }

    /* ============================================================
       🔥 EQUIP AN ITEM
       ============================================================ */
    public equipItem(player: PlayerState, fromSlotIndex: number): boolean {
        const inv = player.inventory;
        const s = inv.slots[fromSlotIndex];
        if (!s || !s.itemId) return false;

        const model = this.getModel(s.itemId);
        if (!model) return false; // not equipment

        const slot = model.equipSlot;
        if (!slot) return false;

        // ex : head, ring1, ring2, trinket1, trinket2
        const currently = inv.equipment[slot];
        const wasEmpty = !currently.itemId;

        // -----------------------------------------
        // Si un item est déjà équipé → swap
        // -----------------------------------------
        if (!wasEmpty) {
            const success = this.swapWithInventory(player, slot, fromSlotIndex);
            if (!success) return false;
        } else {
            // Équiper directement
            currently.setItem(s.itemId, 1);
            s.clear();
        }

        // mise à jour stats
        this.recomputeStats(player);

        // notify client
        this.notify(player.sessionId, "equip_changed", {
            slot,
            itemId: currently.itemId
        });

        return true;
    }

    /* ============================================================
       🔥 UNEQUIP AN ITEM
       ============================================================ */
    public unequipItem(player: PlayerState, equipSlot: string): boolean {
        const inv = player.inventory;
        const eq = inv.equipment[equipSlot];
        if (!eq || !eq.itemId) return false;

        // chercher un slot vide dans l’inventaire
        const free = this.findFreeSlot(inv);
        if (free === -1) return false; // inventaire plein

        inv.slots[free].setItem(eq.itemId, 1);
        eq.clear();

        this.recomputeStats(player);

        this.notify(player.sessionId, "equip_removed", {
            slot: equipSlot
        });

        return true;
    }

    /* ============================================================
       🔥 INTERNAL — SWAP WITH INVENTORY
       ============================================================ */
    private swapWithInventory(
        player: PlayerState,
        equipSlot: string,
        fromSlot: number
    ): boolean {
        const inv = player.inventory;

        const eq = inv.equipment[equipSlot];
        const bagSlot = inv.slots[fromSlot];

        if (!eq || !bagSlot) return false;

        const tmp = new InventorySlot();
        tmp.copyFrom(eq);

        eq.setItem(bagSlot.itemId, 1);
        bagSlot.setItem(tmp.itemId, tmp.amount);

        return true;
    }

    /* ============================================================
       🔥 INTERNAL — LOOKING FOR FREE INVENTORY SLOT
       ============================================================ */
    private findFreeSlot(inv: InventoryState): number {
        for (let i = 0; i < inv.maxSlots; i++) {
            const s = inv.slots[i];
            if (!s || !s.itemId) return i;
        }
        return -1;
    }

    /* ============================================================
       🔥 INTERNAL — RECOMPUTE PLAYER STATS
       ============================================================ */
    private recomputeStats(player: PlayerState) {
        const newStats = computeFullStats(player);
        player.loadStatsFromProfile(newStats);

        this.notify(player.sessionId, "stats_update", {
            hp: player.hp,
            maxHp: player.maxHp,
            attackPower: player.attackPower,
            spellPower: player.spellPower,
            armor: player.armor,
            magicResistance: player.magicResistance,
        });
    }

    /* ============================================================
       🔥 PUBLIC API — from WorldRoom
       ============================================================ */
    public handleMessage(
        type: string,
        client: any,
        player: PlayerState,
        msg: any
    ): boolean {

        switch (type) {

            case "equip_item":
                if (this.equipItem(player, msg.fromSlot)) {
                    return true;
                }
                return false;

            case "unequip_item":
                if (this.unequipItem(player, msg.equipSlot)) {
                    return true;
                }
                return false;
        }

        return false;
    }
}
