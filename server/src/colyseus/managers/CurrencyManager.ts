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
        console.log("💰 CurrencyManager (secure mode) chargé.");
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
            console.warn("⚠️ CHEAT (ADD TOO HIGH)", { player: player.playerId, amount });
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
            console.warn("⚠️ CHEAT (REMOVE TOO HIGH)", { player: player.playerId, amount });
            return false;
        }

        const current = player.currencies.values.get(type) || 0;

        if (current < amount) {
            client.send("currency_error", { type, error: "not_enough_currency" });
            return false;
        }

        const newAmount = current - amount;
        player.currencies.values.set(type, newAmount);
        this.sendUpdate(client, type, newAmount);

        return true;
    }

    // =======================================================
    // SET  →  FORBIDDEN FROM CLIENT
    // =======================================================
    set(player: PlayerState, client: Client, type: string, amount: number) {
        console.warn("⚠️ CHEAT ATTEMPT: SET USED BY CLIENT", {
            player: player.playerId,
            type,
            amount
        });
    }

    // =======================================================
    // 🔥 HANDLE MESSAGE (SECURED)
    // =======================================================
    handleMessage(type: string, client: Client, player: PlayerState, payload: any): boolean {

        if (type !== "currency")
            return false;

        // 1) Global security signature check
        if (!SecurityVerifier.verify(payload)) {
            console.warn("⛔ SECURITY: INVALID SIGNATURE", {
                player: player.playerId
            });
            return true;
        }

        // 2) Extract safe data
        const data = payload.data || {};
        const action = data.action;
        const currencyType = data.type;

        const amount = Number(data.amount) || 0; // FULLY SAFE

        // 3) Validate type
        if (!CurrencyManager.VALID_TYPES.includes(currencyType)) {
            console.warn("⚠️ CHEAT: invalid currency type", currencyType);
            return true;
        }

        // 4) Anti-flood protection
        if (this.isFlooding(player)) {
            console.warn("⚠️ FLOOD DETECTED", player.playerId);
            return true;
        }

        // 5) Route action
        switch (action) {
            case "add":
                this.add(player, client, currencyType, amount);
                return true;

            case "remove":
                this.remove(player, client, currencyType, amount);
                return true;

            case "set": // forbidden
                this.set(player, client, currencyType, amount);
                return true;
        }

        return false;
    }
}
