// server/src/colyseus/managers/ItemManager.ts

import { PlayerState } from "../schema/PlayerState";
import ItemModel from "../../models/Item";

export class ItemManager {

    constructor(
        private readonly inventoryManager: any,
        private readonly savePlayer: (player: PlayerState) => Promise<void>
    ) {}

    // ============================================================
    // OPEN LOOT BOX
    // ============================================================
    async openLootBox(player: PlayerState, slotIndex: number) {

        const inv = player.inventory;
        const slot = inv.slots[slotIndex];
        if (!slot || !slot.itemId) return false;

        const model = await ItemModel.findOne({ itemId: slot.itemId });
        if (!model || model.type !== "container") return false;

        // Vérifier la structure des rewards
        if (!Array.isArray(model.rewards) || model.rewards.length === 0)
            return false;

        // Tirage aléatoire
        const reward = this.pickRandomReward(model.rewards);
        if (!reward) return false;

        // Consommer le lootbox
        slot.amount -= 1;
        if (slot.amount <= 0) slot.clear();

        // Ajouter la récompense
        await this.inventoryManager.addItem(
            player,
            reward.itemId,
            reward.min ?? 1
        );

        // Sync inventaire
        this.inventoryManager.sync(player);
        await this.savePlayer(player);

        return true;
    }

    // Tirage pondéré
    private pickRandomReward(rewards: any[]) {
        const total = rewards.reduce((sum, r) => sum + (r.weight ?? 1), 0);
        let rnd = Math.random() * total;

        for (const r of rewards) {
            const w = r.weight ?? 1;
            if (rnd < w) return r;
            rnd -= w;
        }

        return rewards[0];
    }

    // ============================================================
    // BAG UPGRADE ITEM
    // ============================================================
    async useBagUpgrade(player: PlayerState, model: any) {

        if (!model.bagSizeIncrease || typeof model.bagSizeIncrease !== "number")
            return false;

        player.inventory.maxSlots += model.bagSizeIncrease;

        // Sync inventaire
        this.inventoryManager.sync(player);
        await this.savePlayer(player);

        return true;
    }
}
