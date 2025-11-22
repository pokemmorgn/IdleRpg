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

        if (!model.rewards || !Array.isArray(model.rewards)) return false;

        const reward = this.pickRandomReward(model.rewards);
        if (!reward) return false;

        // consume the loot box
        slot.amount -= 1;
        if (slot.amount <= 0) slot.clear();

        await this.inventoryManager.addItem(player, reward.itemId, reward.min);

        this.inventoryManager.sync(player);
        await this.savePlayer(player);

        return true;
    }

    private pickRandomReward(rewards: any[]) {
        const total = rewards.reduce((sum, r) => sum + r.weight, 0);
        let rnd = Math.random() * total;

        for (const r of rewards) {
            if (rnd < r.weight) return r;
            rnd -= r.weight;
        }
        return rewards[0];
    }

    // ============================================================
    // BAG UPGRADE ITEM
    // ============================================================
    async useBagUpgrade(player: PlayerState, model: any) {
        if (!model.bagSizeIncrease) return false;

        player.inventory.maxSlots += model.bagSizeIncrease;

        this.inventoryManager.sync(player);
        await this.savePlayer(player);

        return true;
    }
}
