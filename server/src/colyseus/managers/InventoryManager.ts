// server/src/colyseus/managers/InventoryManager.ts

import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import ItemModel from "../../models/Item";
import { InventorySlot } from "../schema/InventorySlot";

import { EquipmentManager } from "./EquipmentManager";
import { ItemManager } from "./ItemManager";

export class InventoryManager {

    private equipmentManager: EquipmentManager;
    private itemManager: ItemManager;

    constructor(
        private readonly state: GameState,
        private readonly emit: (sessionId: string, type: string, payload: any) => void,
        private readonly savePlayer: (player: PlayerState) => Promise<void>
    ) {
        this.equipmentManager = new EquipmentManager(this.emit, this.savePlayer);
        this.itemManager = new ItemManager(this, this.savePlayer);
    }

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

            // 🔥 ÉQUIPER
            case "inv_equip":
                await this.equipmentManager.equip(player, msg.fromSlot);
                return true;

            // 🔥 DÉSÉQUIPER
            case "inv_unequip":
                await this.equipmentManager.unequip(player, msg.equipSlot);
                return true;

            // 🔥 OUVRIR UN CONTENEUR (lootbox)
            case "inv_open":
                await this.itemManager.openLootBox(player, msg.slot);
                return true;

            // 🔥 UTILISER UN ITEM QUI AUGMENTE LE SAC
            case "inv_upgrade_bag":
                await this.handleBagUpgrade(player, msg.slot);
                return true;

            default:
                return false;
        }
    }

    // ============================================================
    // UTILISE UN BAG UPGRADE ITEM
    // ============================================================
    private async handleBagUpgrade(player: PlayerState, slotIndex: number) {

        const slot = player.inventory.slots[slotIndex];
        if (!slot || !slot.itemId) return;

        const model = await ItemModel.findOne({ itemId: slot.itemId });
        if (!model) return;
        if (!model.bagSizeIncrease) return;

        slot.amount -= 1;
        if (slot.amount <= 0) slot.clear();

        // Utilise l’upgrade
        await this.itemManager.useBagUpgrade(player, model);

        this.sync(player);
        await this.savePlayer(player);
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

        // 1) Ajouter à une pile existante
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

        // 2) Ajouter dans un slot vide
        for (let i = 0; i < inv.slots.length && amount > 0; i++) {
            const slot = inv.slots[i];
            if (slot.itemId === "") {
                const add = stackable ? Math.min(amount, maxStack) : 1;
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
    // SPLIT
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

        this.emit(player.sessionId, "item_used", {
            itemId: model.itemId,
            effects: model.effects ?? {}
        });

        slot.amount -= 1;
        if (slot.amount <= 0) slot.clear();

        this.sync(player);
        await this.savePlayer(player);
    }

    // ============================================================
    // SYNC CLIENT
    // ============================================================
    public sync(player: PlayerState) {
        this.emit(player.sessionId, "inventory_update", {
            slots: player.inventory.exportSlots(),
            equipment: player.inventory.exportEquipment()
        });
    }
}
