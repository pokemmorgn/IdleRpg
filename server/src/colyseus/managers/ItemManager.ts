// server/src/colyseus/managers/ItemManager.ts

import ItemModel, { IItemModel } from "../../models/Item";
import { PlayerState } from "../schema/PlayerState";
import { InventoryState } from "../schema/InventoryState";
import { InventorySlot } from "../schema/InventorySlot";

export type ItemNotify = (
    sessionId: string,
    type: string,
    payload: any
) => void;

/**
 * 📦 ItemManager
 * 
 * Responsable de :
 * - Charger les items depuis MongoDB
 * - Récupérer un modèle d'item
 * - Gérer l'utilisation des items consommables
 * - Gérer les coffres (chests)
 * - Gérer les items "augment bag size"
 * - Valider stackable / non-stackable
 */
export class ItemManager {

    private items: Map<string, IItemModel> = new Map();
    private notify: ItemNotify;

    constructor(
        notifyCallback: ItemNotify
    ) {
        this.notify = notifyCallback;
    }

    /* ============================================================
       🔥 1. LOAD ALL ITEMS
       ============================================================ */
    public async loadAllItems() {
        const docs = await ItemModel.find({});
        this.items.clear();

        for (const doc of docs) {
            this.items.set(doc.itemId, doc.toObject());
        }

        console.log(`📦 [ItemManager] ${docs.length} items chargés.`);
    }

    /* ============================================================
       🔥 2. GET ITEM MODEL
       ============================================================ */
    public getItemModel(itemId: string): IItemModel | null {
        return this.items.get(itemId) ?? null;
    }

    /* ============================================================
       🔥 3. UTILISATION D’UN ITEM
       ============================================================ */
    public async useItem(player: PlayerState, slot: InventorySlot): Promise<boolean> {
        if (!slot || !slot.itemId) return false;

        const model = this.getItemModel(slot.itemId);
        if (!model) return false;

        switch (model.type) {

            /* ---------------------------------------------------------
               🧪 Consommables
               --------------------------------------------------------- */
            case "consumable":
                return this.useConsumable(player, slot, model);

            /* ---------------------------------------------------------
               📤 Coffres (lootbox)
               --------------------------------------------------------- */
            case "chest":
                return this.openChest(player, slot, model);

            /* ---------------------------------------------------------
               🎒 Augment bag size
               --------------------------------------------------------- */
            case "bag_upgrade":
                return this.applyBagUpgrade(player, slot, model);

            default:
                return false;
        }
    }

    /* ============================================================
       🔥 4. CONSOMMABLES
       ============================================================ */
    private async useConsumable(
        player: PlayerState,
        slot: InventorySlot,
        model: IItemModel
    ): Promise<boolean> {

        if (!model.effects) return false;

        // applique les effets (exemples)
        if (model.effects.hp) {
            player.hp = Math.min(player.maxHp, player.hp + model.effects.hp);
        }
        if (model.effects.food) {
            player.food += model.effects.food;
        }

        // consommé → retire 1 stack
        slot.amount -= 1;
        if (slot.amount <= 0) slot.clear();

        // notify
        this.notify(player.sessionId, "item_used", {
            itemId: model.itemId,
            effects: model.effects
        });

        return true;
    }

    /* ============================================================
       🔥 5. CHEST / LOOTBOX
       ============================================================ */
    private async openChest(
        player: PlayerState,
        slot: InventorySlot,
        model: IItemModel
    ): Promise<boolean> {

        if (!model.rewards || !Array.isArray(model.rewards)) return false;

        // consommer le chest
        slot.amount -= 1;
        if (slot.amount <= 0) slot.clear();

        const reward = this.pickRandomReward(model.rewards);

        // return au client
        this.notify(player.sessionId, "chest_opened", {
            chestId: model.itemId,
            reward
        });

        return true;
    }

    private pickRandomReward(list: any[]): any {
        const totalWeight = list.reduce((acc, r) => acc + (r.weight || 1), 0);
        let roll = Math.random() * totalWeight;

        for (const r of list) {
            roll -= r.weight || 1;
            if (roll <= 0) return r;
        }
        return list[list.length - 1];
    }

    /* ============================================================
       🔥 6. BAG SIZE UPGRADE
       ============================================================ */
    private async applyBagUpgrade(
        player: PlayerState,
        slot: InventorySlot,
        model: IItemModel
    ): Promise<boolean> {

        if (!model.bagSizeIncrease) return false;

        player.inventory.maxSlots += model.bagSizeIncrease;

        slot.amount -= 1;
        if (slot.amount <= 0) slot.clear();

        this.notify(player.sessionId, "bag_upgraded", {
            newMaxSlots: player.inventory.maxSlots
        });

        return true;
    }

}
