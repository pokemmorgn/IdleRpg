// server/src/colyseus/managers/InventoryManager.ts

import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { InventorySlot } from "../schema/InventorySlot";
import { InventoryState } from "../schema/InventoryState";

import ItemModel from "../../models/Item";

/**
 * InventoryManager
 * ----------------
 * Gère :
 * - ajouter item dans sac
 * - retirer
 * - déplacer slots
 * - split
 * - équipement
 * - utiliser consommables
 */
export class InventoryManager {

    constructor(
        private state: GameState,
        private sendToClient: (sessionId: string, type: string, data: any) => void,
        private savePlayer: (player: PlayerState) => Promise<void>
    ) {}

    // =====================================================================
    // INIT PLAYER INVENTORY
    // =====================================================================
    ensureInventory(player: PlayerState) {
        if (!player.inventory) {
            player.inventory = new InventoryState();
        }
    }

    // =====================================================================
    // AJOUTER ITEM
    // =====================================================================
    async addItem(player: PlayerState, itemId: string, amount: number) {
        this.ensureInventory(player);
        const inv = player.inventory;

        // Charger modèle d'item depuis DB
        const model = await ItemModel.findOne({ itemId });
        if (!model) return;

        const isStack = model.stackable !== false;

        // 1) Essayer de stacker dans un slot existant
        if (isStack) {
            for (const [, slot] of inv.slots) {
                if (slot.itemId === itemId) {
                    slot.amount += amount;
                    this.syncInventory(player);
                    return;
                }
            }
        }

        // 2) Chercher un slot vide
        for (const [, slot] of inv.slots) {
            if (slot.isEmpty()) {
                slot.setItem(itemId, amount);
                this.syncInventory(player);
                return;
            }
        }

        // Pas de place → TODO: envoyer un message "sac plein"
        this.sendToClient(player.sessionId, "inventory_full", {});
    }

    // =====================================================================
    // DÉPLACER SLOT
    // =====================================================================
    moveItem(player: PlayerState, from: string, to: string) {
        this.ensureInventory(player);
        const inv = player.inventory;

        const sFrom = inv.slots.get(from);
        const sTo = inv.slots.get(to);

        if (!sFrom || !sTo) return;

        // swap
        const tmp = new InventorySlot();
        tmp.copyFrom(sFrom);

        sFrom.copyFrom(sTo);
        sTo.copyFrom(tmp);

        this.syncInventory(player);
    }

    // =====================================================================
    // SPLIT STACK
    // =====================================================================
    splitItem(player: PlayerState, from: string, to: string, amount: number) {
        this.ensureInventory(player);
        const inv = player.inventory;

        const sFrom = inv.slots.get(from);
        const sTo = inv.slots.get(to);

        if (!sFrom || !sTo) return;
        if (sFrom.amount < amount) return;

        if (!sTo.isEmpty() && sTo.itemId !== sFrom.itemId) return;

        // Move amount
        sFrom.amount -= amount;

        if (sTo.isEmpty()) {
            sTo.setItem(sFrom.itemId, amount);
        } else {
            sTo.amount += amount;
        }

        if (sFrom.amount <= 0) sFrom.clear();

        this.syncInventory(player);
    }

    // =====================================================================
    // SUPPRIMER ITEM
    // =====================================================================
    removeItem(player: PlayerState, slotIndex: string, amount: number) {
        this.ensureInventory(player);

        const slot = player.inventory.slots.get(slotIndex);
        if (!slot) return;
        if (slot.amount < amount) return;

        slot.amount -= amount;
        if (slot.amount <= 0) slot.clear();

        this.syncInventory(player);
    }

    // =====================================================================
    // EQUIPER
    // =====================================================================
    async equipItem(player: PlayerState, slotIndex: string) {
        this.ensureInventory(player);
        const inv = player.inventory;

        const slot = inv.slots.get(slotIndex);
        if (!slot || slot.isEmpty()) return;

        const model = await ItemModel.findOne({ itemId: slot.itemId });
        if (!model) return;

        if (model.type !== "equipment") return;

        const equipSlot = model.equipSlot;
        if (!equipSlot) return;

        const current = inv.equipment.get(equipSlot);

        // Si déjà un équipement à cet endroit → swap
        if (current && !current.isEmpty()) {
            const tmp = new InventorySlot();
            tmp.copyFrom(current);

            current.copyFrom(slot);
            slot.copyFrom(tmp);
        } else {
            // move
            inv.equipment.set(equipSlot, new InventorySlot());
            const equipSlotObj = inv.equipment.get(equipSlot);
            if (equipSlotObj) equipSlotObj.setItem(slot.itemId, 1);

            // retirer de l'inventaire
            if (slot.amount > 1) {
                slot.amount -= 1;
            } else {
                slot.clear();
            }
        }

        this.syncInventory(player);
        this.syncEquipment(player);
    }

    // =====================================================================
    // DÉSÉQUIPER
    // =====================================================================
    unequipItem(player: PlayerState, equipSlot: string) {
        this.ensureInventory(player);
        const inv = player.inventory;

        const s = inv.equipment.get(equipSlot);
        if (!s || s.isEmpty()) return;

        // chercher un slot vide
        for (const [, slot] of inv.slots) {
            if (slot.isEmpty()) {
                slot.setItem(s.itemId, 1);
                s.clear();
                this.syncInventory(player);
                this.syncEquipment(player);
                return;
            }
        }

        // pas de place
        this.sendToClient(player.sessionId, "inventory_full", {});
    }

    // =====================================================================
    // UTILISER CONSOMMABLE
    // =====================================================================
    async useItem(player: PlayerState, slotIndex: string) {
        this.ensureInventory(player);

        const inv = player.inventory;
        const s = inv.slots.get(slotIndex);
        if (!s || s.isEmpty()) return;

        const model = await ItemModel.findOne({ itemId: s.itemId });
        if (!model || model.type !== "consumable") return;

        // Appliquer effets (ex: heal)
        if (model.effects?.heal) {
            player.hp = Math.min(player.maxHp, player.hp + model.effects.heal);

            this.sendToClient(player.sessionId, "hp_update", {
                hp: player.hp,
                maxHp: player.maxHp
            });
        }

        // retirer 1
        s.amount -= 1;
        if (s.amount <= 0) s.clear();

        this.syncInventory(player);
    }

    // =====================================================================
    // SYNC AVEC CLIENT
    // =====================================================================
    syncInventory(player: PlayerState) {
        this.sendToClient(player.sessionId, "inventory_update", {
            inventory: player.inventory.saveToProfile()
        });
    }

    syncEquipment(player: PlayerState) {
        this.sendToClient(player.sessionId, "equipment_update", {
            equipment: player.inventory.saveToProfile().equipment
        });
    }

    // =====================================================================
    // MESSAGE ROUTER
    // =====================================================================
    async handleMessage(type: string, client: any, player: PlayerState, msg: any) {

        switch (type) {

            case "inv_add":
                await this.addItem(player, msg.itemId, msg.amount || 1);
                break;

            case "inv_move":
                this.moveItem(player, msg.from, msg.to);
                break;

            case "inv_split":
                this.splitItem(player, msg.from, msg.to, msg.amount || 1);
                break;

            case "inv_remove":
                this.removeItem(player, msg.slot, msg.amount || 1);
                break;

            case "inv_equip":
                await this.equipItem(player, msg.slot);
                break;

            case "inv_unequip":
                this.unequipItem(player, msg.slot);
                break;

            case "inv_use":
                await this.useItem(player, msg.slot);
                break;
        }

        // sauvegarde automatique
        await this.savePlayer(player);
    }
}
