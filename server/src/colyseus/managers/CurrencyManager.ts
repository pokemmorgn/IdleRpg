// server/src/colyseus/managers/CurrencyManager.ts

import { Client } from "colyseus";
import { PlayerState } from "../schema/PlayerState";
import { SecurityVerifier } from "../../security/SecurityVerifier";

export class CurrencyManager {

    private static VALID_TYPES = ["gold", "diamonds", "diamonds_bound"];
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
    private sendUpdate(client: Client, type: string, amount: number) {
        client.send("currency_update", { type, amount });
    }

    // =======================================================
    // ADD
    // =======================================================
    add(player: PlayerState, client: Client, type: string, amount: number) {

        if (amount <= 0) return;

        if (amount > CurrencyManager.MAX_DELTA) {
            console.warn("⚠️ CHEAT (ADD TOO HIGH)", {
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

    // =======================================================
    // REMOVE
    // =======================================================
    remove(player: PlayerState, client: Client, type: string, amount: number): boolean {

        if (amount <= 0) return false;

        if (amount > CurrencyManager.MAX_DELTA) {
            console.warn("⚠️ CHEAT (REMOVE TOO HIGH)", {
                player: player.playerId,
                amount
            });
            return false;
        }

        const current = player.currencies.values.get(type) || 0;

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

    // =======================================================
    // SET → FORBIDDEN FROM CLIENT
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

        // ---------------------------------------------------
        // 1) FULL SECURITY VERIFICATION
        // ---------------------------------------------------
        // ➜ Includes HMAC, timestamp, nonce, AND state hash verification
        if (!SecurityVerifier.verify(payload, player)) {
            console.warn("⛔ SECURITY: INVALID OR TAMPERED PAYLOAD BLOCKED", {
                player: player.playerId,
                payload
            });
            return true; // block silently
        }

        const { action, type: currencyType, amount } = payload.data;

        // ---------------------------------------------------
        // 2) Type validation
        // ---------------------------------------------------
        if (!CurrencyManager.VALID_TYPES.includes(currencyType)) {
            console.warn("⚠️ CHEAT: INVALID CURRENCY TYPE", currencyType);
            return true;
        }

        // ---------------------------------------------------
        // 3) Anti-flood
        // ---------------------------------------------------
        if (this.isFlooding(player)) {
            console.warn("⚠️ FLOOD DETECTED FROM PLAYER", player.playerId);
            return true;
        }

        // ---------------------------------------------------
        // 4) Execute action
        // ---------------------------------------------------
        switch (action) {
            case "add":
                this.add(player, client, currencyType, amount);
                return true;

            case "remove":
                this.remove(player, client, currencyType, amount);
                return true;

            case "set":
                this.set(player, client, currencyType, amount);
                return true;
        }

        return false;
    }
}
