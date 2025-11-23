// server/src/colyseus/managers/CurrencyManager.ts

import { Client } from "colyseus";
import { PlayerState } from "../schema/PlayerState";

export class CurrencyManager {

    // Types autorisés côté serveur
    private static VALID_TYPES = ["gold", "diamonds", "diamonds_bound"];

    // Montant maximum par requête (anti burst hack)
    private static MAX_DELTA = 5000;

    // Anti-spam par joueur
    private lastOpTimestamp: Map<string, number> = new Map();
    private opCountWindow: Map<string, number> = new Map();

    constructor() {
        console.log("💰 CurrencyManager chargé (secure mode).");
    }

    // ===========================================================
    // 🔐 ANTI-FLOOD (5 opérations / seconde max)
    // ===========================================================
    private isFlooding(player: PlayerState): boolean {
        const now = Date.now();
        const last = this.lastOpTimestamp.get(player.sessionId) || 0;
        const count = this.opCountWindow.get(player.sessionId) || 0;

        // Reset la fenêtre après 1 seconde
        if (now - last > 1000) {
            this.lastOpTimestamp.set(player.sessionId, now);
            this.opCountWindow.set(player.sessionId, 1);
            return false;
        }

        this.opCountWindow.set(player.sessionId, count + 1);

        if (count + 1 > 5) {
            console.warn("⚠️ FLOOD DETECTED:", {
                player: player.playerId,
                operations: count + 1,
            });
            return true;
        }

        return false;
    }

    // ===========================================================
    // 🔥 ENVOI D’UNE UPDATE AU CLIENT
    // ===========================================================
    private sendUpdate(client: Client, type: string, amount: number) {
        client.send("currency_update", { type, amount });
    }

    // ===========================================================
    // 📥 ADD CURRENCY
    // ===========================================================
    add(player: PlayerState, client: Client, type: string, amount: number) {

        if (amount <= 0) return;

        // Anti cheat : trop élevé
        if (amount > CurrencyManager.MAX_DELTA) {
            console.warn("⚠️ CHEAT DETECTED (ADD TOO HIGH)", {
                player: player.playerId,
                amount
            });
            return;
        }

        const current = player.currencies.values.get(type) || 0;
        const newAmount = current + amount;

        player.currencies.values.set(type, newAmount);
        this.sendUpdate(client, type, newAmount);
    }

    // ===========================================================
    // 📤 REMOVE CURRENCY
    // ===========================================================
    remove(player: PlayerState, client: Client, type: string, amount: number): boolean {
        const current = player.currencies.values.get(type) || 0;

        if (amount <= 0) return false;

        // Anti cheat : trop élevé
        if (amount > CurrencyManager.MAX_DELTA) {
            console.warn("⚠️ CHEAT DETECTED (REMOVE TOO HIGH)", {
                player: player.playerId,
                amount
            });
            return false;
        }

        if (current < amount) {
            client.send("currency_error", {
                type,
                error: "not_enough_currency"
            });
            return false;
        }

        const newAmount = current - amount;
        player.currencies.values.set(type, newAmount);
        this.sendUpdate(client, type, newAmount);

        return true;
    }

    // ===========================================================
    // ⛔ SET CURRENCY (INTERDIT AU CLIENT)
    // ===========================================================
    set(player: PlayerState, client: Client, type: string, amount: number) {
        console.warn("⚠️ CHEAT ATTEMPT: client tried to use 'set'!", {
            player: player.playerId,
            type,
            amount
        });
        return;
    }

    // ===========================================================
    // 📦 GET CURRENCY
    // ===========================================================
    get(player: PlayerState, type: string): number {
        return player.currencies.values.get(type) || 0;
    }

    // ===========================================================
    // 🔥 MESSAGE ROUTER (MAIN ENTRY)
    // ===========================================================
    handleMessage(type: string, client: Client, player: PlayerState, data: any): boolean {

        if (type !== "currency") return false;

        const action = data.action;
        const currencyType = data.type;
        const amount = Number(data.amount) || 0;

        // 🔐 Type invalide → CHEAT
        if (!CurrencyManager.VALID_TYPES.includes(currencyType)) {
            console.warn("⚠️ CHEAT: invalid currency type", {
                player: player.playerId,
                type: currencyType
            });
            return true;
        }

        // 🔐 Anti flood
        if (this.isFlooding(player)) {
            console.warn("⚠️ CHEAT FLOOD:", {
                player: player.playerId,
                action
            });
            return true;
        }

        // Routing sécurisé
        switch (action) {
            case "add":
                this.add(player, client, currencyType, amount);
                return true;

            case "remove":
                this.remove(player, client, currencyType, amount);
                return true;

            case "set": // INTERDIT
                this.set(player, client, currencyType, amount);
                return true;

            default:
                console.warn("⚠️ CHEAT: Invalid currency action", {
                    player: player.playerId,
                    action
                });
                return true;
        }
    }
}
