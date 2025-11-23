// server/src/colyseus/managers/CurrencyManager.ts

import { Client } from "colyseus";
import { PlayerState } from "../schema/PlayerState";

export class CurrencyManager {

    private static VALID_TYPES = ["gold", "diamonds", "diamonds_bound"];

    // Maximum allowed per request
    private static MAX_DELTA = 5000;

    // Anti-spam tracker
    private lastOpTimestamp: Map<string, number> = new Map();
    private opCountWindow: Map<string, number> = new Map();

    constructor() {
        console.log("💰 CurrencyManager chargé (secure mode).");
    }

    // ===========================================================
    // 🔥 RATE LIMIT (anti flood)
    // ===========================================================
    private isFlooding(player: PlayerState): boolean {
        const now = Date.now();
        const last = this.lastOpTimestamp.get(player.sessionId) || 0;
        const count = this.opCountWindow.get(player.sessionId) || 0;

        if (now - last > 1000) {
            this.lastOpTimestamp.set(player.sessionId, now);
            this.opCountWindow.set(player.sessionId, 1);
            return false;
        }

        this.opCountWindow.set(player.sessionId, count + 1);

        if (count + 1 > 5) return true;

        return false;
    }

    // ===========================================================
    // 🔥 SEND UPDATE
    // ===========================================================
    private sendUpdate(client: Client, type: string, amount: number) {
        client.send("currency_update", { type, amount });
    }

    // ===========================================================
    // 📥 ADD
    // ===========================================================
    add(player: PlayerState, client: Client, type: string, amount: number) {

        if (amount <= 0) return;

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
    // 📤 REMOVE
    // ===========================================================
    remove(player: PlayerState, client: Client, type: string, amount: number): boolean {
        const current = player.currencies.values.get(type) || 0;

        if (amount <= 0) return false;

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
    // ⛔ SET: FORBIDDEN FROM CLIENT
    // ===========================================================
    set(player: PlayerState, client: Client, type: string, amount: number) {
        console.warn("⚠️ CHEAT ATTEMPT: client tried to use 'set'!", {
            player: player.playerId,
            type, amount
        });
        return;
    }

    // ===========================================================
    // 🔥 GET
    // ===========================================================
    get(player: PlayerState, type: string): number {
        return player.currencies.values.get(type) || 0;
    }

    // ===========================================================
    // 🔥 HANDLE MESSAGE
    // ===========================================================
    handleMessage(type: string, client: Client, player: PlayerState, data: any): boolean {

        if (type !== "currency") return false;

        const action = data.action;
        const currencyType = data.type;
        const amount = Number(data.amount) || 0;

        // 🔐 Validate type
        if (!CurrencyManager.VALID_TYPES.includes(currencyType)) {
            console.warn("⚠️ CHEAT: invalid currency type", currencyType);
            return true;
        }

        // ⛔ anti flood
        if (this.isFlooding(player)) {
            console.warn("⚠️ CHEAT FLOOD:", player.playerId);
            return true;
        }

        switch (action) {

            case "add":
                this.add(player, client, currencyType, amount);
                return true;

            case "remove":
                this.remove(player, client, currencyType, amount);
                return true;

            // ❌ Client forbidden to use SET
            case "set":
                this.set(player, client, currencyType, amount);
                return true;
        }

        return false;
    }
}
