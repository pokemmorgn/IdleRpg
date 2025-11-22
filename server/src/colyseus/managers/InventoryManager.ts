// server/src/colyseus/managers/InventoryManager.ts

import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import ItemModel from "../../models/Item";
import { InventoryState } from "../schema/InventoryState";
import { InventorySlot } from "../schema/InventorySlot";

export class InventoryManager {

    constructor(
        private readonly state: GameState,
        private readonly emit: (sessionId: string, type: string, payload: any) => void,
        private readonly savePlayer: (player: PlayerState) => Promise<void>
    ) {}

    // ============================================================
    // MESSAGE HANDLER
    // ============================================================
    async handleMessage(type: string, client: any, player: PlayerState, msg: any): Promise<boolean> {

        switch (type) {

            case "inv_add":
                await this.addItem(player, msg.itemId, msg.amount ?? 1);
                return true;

            case "inv_remove":
                this.removeItem(player, msg.itemId, msg.amount ?? 1);
                return true;

            case "inv_swap":
                this.swapSlots(player, msg.from, msg.to);
                return true;

            case "inv_split":
                this.splitStack(player, msg.from, msg.to, msg.amount);
                return true;

            case "inv_use":
                await this.useItem(player, msg.slot);
                return true;

            default:
                return false;
        }
    }

    // ============================================================
    // ADD ITEM
    // ============================================================
    async addItem(player: PlayerState, itemId: string, amount: number = 1) {

        const model = await ItemModel.findOne({ itemId });
        if (!model) return;

        const inv = player.inventory;

        const stackable = model.stackable !== false;
        const maxStack = model.maxStack ?? 99;

        // 🔹 1) tenter d'ajouter dans un stack existant
        if (stackable) {
            for (let i = 0; i < inv.slots.length; i++) {
                const slot = inv.slots[i];
                if (slot.itemId === itemId && slot.amount < maxStack) {
                    const free = maxStack - slot.amount;
                    const toAdd = Math.min(free, amount);
                    slot.amount += toAdd;
                    amount -= toAdd;
                    if (amount <= 0) {
                        this.sync(player);
                        await this.savePlayer(player);
                        return;
                    }
                }
            }
        }

        // 🔹 2) remplir des nouveaux slots
        for (let i = 0; i < inv.slots.length && amount > 0; i++) {
            const slot = inv.slots[i];
            if (slot.itemId === "") {
                const add = model.stackable !== false ? Math.min(amount, maxStack) : 1;
                slot.setItem(itemId, add);
                amount -= add;
            }
        }

        this.sync(player);
        await this.savePlayer(player);
    }

    // ============================================================
    // REMOVE ITEM
    // ============================================================
    removeItem(player: PlayerState, itemId: string, amount: number = 1) {
        const inv = player.inventory;

        for (let i = 0; i < inv.slots.length; i++) {
            const slot = inv.slots[i];

            if (slot.itemId === itemId) {
                const remove = Math.min(slot.amount, amount);
                slot.amount -= remove;
                amount -= remove;

                if (slot.amount <= 0) slot.clear();

                if (amount <= 0) break;
            }
        }

        this.sync(player);
    }

    // ============================================================
    // SWAP SLOTS
    // ============================================================
    swapSlots(player: PlayerState, from: number, to: number) {
        const inv = player.inventory;

        const a = inv.slots[from];
        const b = inv.slots[to];

        const tmp = new InventorySlot();
        tmp.copyFrom(a);

        a.copyFrom(b);
        b.copyFrom(tmp);

        this.sync(player);
    }

    // ============================================================
    // SPLIT A STACK
    // ============================================================
    splitStack(player: PlayerState, from: number, to: number, amount: number) {
        const inv = player.inventory;

        const sFrom = inv.slots[from];
        const sTo = inv.slots[to];

        if (sFrom.amount <= amount || sTo.itemId !== "") return;

        sFrom.amount -= amount;
        sTo.setItem(sFrom.itemId, amount);

        this.sync(player);
    }

    // ============================================================
    // USE CONSUMABLE
    // ============================================================
    async useItem(player: PlayerState, slotIndex: number) {
        const inv = player.inventory;
        const slot = inv.slots[slotIndex];
        if (!slot || !slot.itemId) return;

        const model = await ItemModel.findOne({ itemId: slot.itemId });
        if (!model) return;

        if (model.type !== "consumable") return;

        // appliquer l’effet
        this.emit(player.sessionId, "item_used", {
            itemId: model.itemId,
            effects: model.effects ?? {}
        });

        // consommer
        slot.amount -= 1;
        if (slot.amount <= 0) slot.clear();

        this.sync(player);
        await this.savePlayer(player);
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
