// server/src/colyseus/managers/InventoryManager.ts

import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { InventorySlot } from "../schema/InventorySlot";
import { InventoryState } from "../schema/InventoryState";

import ItemModel from "../../models/Item";
import EquipModel from "../../models/Equipment";

export type InventoryNotify = (sessionId: string, type: string, payload: any) => void;

export class InventoryManager {

    constructor(
        private readonly gameState: GameState,
        private readonly notify: InventoryNotify,
        private readonly savePlayerData: (player: PlayerState) => Promise<void>
    ) {}

    // =========================================================================
    // INITIALISATION
    // =========================================================================
    public initializePlayerInventory(player: PlayerState) {
        if (!player.inventory) {
            player.inventory = new InventoryState();
        }
    }

    // =========================================================================
    // MESSAGE HANDLER (appelé depuis WorldRoom)
    // =========================================================================
    public handleMessage(
        type: string,
        client: any,
        player: PlayerState,
        msg: any
    ): boolean {

        switch (type) {

            case "inventory_move":
                this.moveItem(player, msg.from, msg.to);
                return true;

            case "inventory_split":
                this.splitStack(player, msg.from, msg.to, msg.amount);
                return true;

            case "inventory_drop":
                this.removeItem(player, msg.slot);
                return true;

            case "inventory_equip":
                this.equipItem(player, msg.slot);
                return true;

            case "inventory_unequip":
                this.unequipItem(player, msg.slot);
                return true;

            case "inventory_use":
                this.useItem(player, msg.slot);
                return true;

            default:
                return false;
        }
    }

    // =========================================================================
    // AJOUTER UN ITEM
    // =========================================================================
    public async addItem(player: PlayerState, itemId: string, amount = 1): Promise<boolean> {

        const model =
            (await ItemModel.findOne({ itemId })) ||
            (await EquipModel.findOne({ itemId }));

        if (!model) return false;

        // Trouver un slot libre
        const inv = player.inventory;
        for (const slot of inv.slots) {
            if (!slot.itemId) {
                slot.setItem(model.itemId, amount);
                this.sync(player);
                await this.savePlayerData(player);
                return true;
            }
        }

        // Pas de place
        this.notify(player.sessionId, "error", { message: "Inventory full" });
        return false;
    }

    // =========================================================================
    // DÉPLACER / SWAP ITEM
    // =========================================================================
    private async moveItem(player: PlayerState, from: number, to: number) {
        const inv = player.inventory;
        if (!inv.slots[from] || !inv.slots[to]) return;

        const a = inv.slots[from];
        const b = inv.slots[to];

        // Swap complet
        const tmp = new InventorySlot();
        tmp.copyFrom(a);

        a.copyFrom(b);
        b.copyFrom(tmp);

        this.sync(player);
        await this.savePlayerData(player);
    }

    // =========================================================================
    // SPLIT STACKS
    // =========================================================================
    private async splitStack(player: PlayerState, from: number, to: number, amount: number) {
        const inv = player.inventory;
        const sFrom = inv.slots[from];
        const sTo = inv.slots[to];

        if (!sFrom.itemId || sTo.itemId) return;

        if (sFrom.amount < amount) return;

        sFrom.amount -= amount;
        sTo.setItem(sFrom.itemId, amount);

        this.sync(player);
        await this.savePlayerData(player);
    }

    // =========================================================================
    // RETIRER UN ITEM
    // =========================================================================
    private async removeItem(player: PlayerState, slot: number) {
        const inv = player.inventory;
        const s = inv.slots[slot];
        if (!s) return;

        s.clear();

        this.sync(player);
        await this.savePlayerData(player);
    }

    // =========================================================================
    // EQUIPER UN ITEM
    // =========================================================================
    private async equipItem(player: PlayerState, slot: number) {
        const inv = player.inventory;
        const s = inv.slots[slot];
        if (!s?.itemId) return;

        const model = await EquipModel.findOne({ itemId: s.itemId });
        if (!model) {
            this.notify(player.sessionId, "error", { message: "Not equipment" });
            return;
        }

        // Repère l’emplacement d’équipement
        const equipSlot = model.slot;
        if (!equipSlot) {
            this.notify(player.sessionId, "error", { message: "Invalid equipment slot" });
            return;
        }

        // Déplace l'ancien équipement dans l'inventaire
        const currently = player.inventory.equipment[equipSlot];
        if (currently?.itemId) {
            this.addItem(player, currently.itemId, currently.amount);
        }

        // Équipe
        player.inventory.equipment[equipSlot] = new InventorySlot();
        player.inventory.equipment[equipSlot].setItem(s.itemId, 1);

        // Retire de l'inventaire
        s.clear();

        this.sync(player);
        await this.savePlayerData(player);
    }

    // =========================================================================
    // DESÉQUIPER
    // =========================================================================
    private async unequipItem(player: PlayerState, equipSlot: string) {
        const inv = player.inventory;

        const s = inv.equipment[equipSlot];
        if (!s?.itemId) return;

        if (!(await this.addItem(player, s.itemId, 1))) {
            this.notify(player.sessionId, "error", { message: "No space in inventory" });
            return;
        }

        s.clear();

        this.sync(player);
        await this.savePlayerData(player);
    }

    // =========================================================================
    // UTILISER ITEM
    // =========================================================================
    private async useItem(player: PlayerState, slot: number) {
        const inv = player.inventory;
        const s = inv.slots[slot];
        if (!s?.itemId) return;

        const model = await ItemModel.findOne({ itemId: s.itemId });
        if (!model || model.type !== "consumable") return;

        // Appliquer l'effet
        this.notify(player.sessionId, "item_used", {
            itemId: s.itemId,
            effect: model.effect
        });

        // Consommer
        s.amount -= 1;
        if (s.amount <= 0) s.clear();

        this.sync(player);
        await this.savePlayerData(player);
    }

    // =========================================================================
    // SYNC CLIENT
    // =========================================================================
    private sync(player: PlayerState) {
        this.notify(player.sessionId, "inventory_update", {
            inventory: player.inventory.serialize()
        });
    }

}
