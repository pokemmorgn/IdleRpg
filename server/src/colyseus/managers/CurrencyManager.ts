// server/src/colyseus/managers/CurrencyManager.ts

import { Client } from "colyseus";
import { PlayerState } from "../schema/PlayerState";
import { SecurityVerifier } from "../../security/SecurityVerifier";

// 🔒 Types stricts des monnaies
type CurrencyKey = "gold" | "diamondBound" | "diamondUnbound";

export class CurrencyManager {

    // Monnaies autorisées venant du client
    private static VALID_TYPES: CurrencyKey[] = [
        "gold",
        "diamondBound",
        "diamondUnbound"
    ];

    private static MAX_DELTA = 5000;

    private lastOpTimestamp: Map<string, number> = new Map();
    private opCountWindow: Map<string, number> = new Map();

    constructor() {
        console.log("💰 CurrencyManager (SECURE MODE) chargé.");
    }

    // =======================================================
    // 🔥 RATE LIMIT / ANTI-FLOOD
    // =======================================================
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
        return count + 1 > 5;
    }

    // =======================================================
    // 🔥 SEND UPDATE
    // =======================================================
    private sendUpdate(client: Client, type: CurrencyKey, amount: number) {
        client.send("currency_update", { type, amount });
    }

    // =======================================================
    // ADD
    // =======================================================
    add(player: PlayerState, client: Client, type: CurrencyKey, amount: number) {

        if (amount <= 0) return;

        if (amount > CurrencyManager.MAX_DELTA) {
            console.warn("⚠️ CHEAT (ADD TOO HIGH)", {
                player: player.playerId,
                amount
            });
            return;
        }

        const key = type;
        const current = player.sharedCurrencies[key] || 0;
        const newAmount = current + amount;

        player.sharedCurrencies[key] = newAmount;
        this.sendUpdate(client, key, newAmount);
    }

    // =======================================================
    // REMOVE
    // =======================================================
    remove(player: PlayerState, client: Client, type: CurrencyKey, amount: number): boolean {

        if (amount <= 0) return false;

        if (amount > CurrencyManager.MAX_DELTA) {
            console.warn("⚠️ CHEAT (REMOVE TOO HIGH)", {
                player: player.playerId,
                amount
            });
            return false;
        }

        const key = type;
        const current = player.sharedCurrencies[key] || 0;

        if (current < amount) {
            client.send("currency_error", {
                type,
                error: "not_enough_currency"
            });
            return false;
        }

        const newAmount = current - amount;

        player.sharedCurrencies[key] = newAmount;
        this.sendUpdate(client, key, newAmount);
        return true;
    }

    // =======================================================
    // SET → Interdit
    // =======================================================
    set(player: PlayerState, client: Client, type: string, amount: number) {
        console.warn("⚠️ CHEAT ATTEMPT: CLIENT TRIED TO USE SET()", {
            player: player.playerId,
            type,
            amount
        });
    }

    // =======================================================
    // 🔥 MESSAGE ROUTER WITH SIGNATURE + HASH VERIFICATION
    // =======================================================
    handleMessage(type: string, client: Client, player: PlayerState, payload: any): boolean {

        if (type !== "currency")
            return false;

        // Sécurité totale (HMAC / timestamp / nonce / state hash)
        if (!SecurityVerifier.verify(payload, player)) {
            console.warn("⛔ SECURITY: INVALID OR TAMPERED PAYLOAD BLOCKED", {
                player: player.playerId,
                payload
            });
            return true;
        }

        const { action, type: currencyType, amount } = payload.data;

        // Validation du type
        if (!CurrencyManager.VALID_TYPES.includes(currencyType as CurrencyKey)) {
            console.warn("⚠️ CHEAT: INVALID CURRENCY TYPE", currencyType);
            return true;
        }

        const key = currencyType as CurrencyKey;

        // Anti-flood
        if (this.isFlooding(player)) {
            console.warn("⚠️ FLOOD DETECTED FROM PLAYER", player.playerId);
            return true;
        }

        // Exécution
        switch (action) {
            case "add":
                this.add(player, client, key, amount);
                return true;

            case "remove":
                this.remove(player, client, key, amount);
                return true;

            case "set":
                this.set(player, client, key, amount);
                return true;
        }

        return false;
    }
}
