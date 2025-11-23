import { Client } from "colyseus";
import { PlayerState } from "../schema/PlayerState";

export class CurrencyManager {

    private static VALID_TYPES = ["gold", "diamonds", "diamonds_bound"];

    constructor() {
        console.log("💰 CurrencyManager chargé.");
    }

    // ===========================================================
    // 🔥 ENVOI D'UNE UPDATE CLIENT
    // ===========================================================
    private sendUpdate(client: Client, type: string, amount: number) {
        client.send("currency_update", {
            type,
            amount
        });
    }

    // ===========================================================
    // 📥 ADD CURRENCY
    // ===========================================================
    add(player: PlayerState, client: Client, type: string, amount: number) {
        if (amount <= 0) return;

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
    // ✏️ SET CURRENCY
    // ===========================================================
    set(player: PlayerState, client: Client, type: string, amount: number) {
        player.currencies.values.set(type, amount);
        this.sendUpdate(client, type, amount);
    }

    // ===========================================================
    // 📦 GET
    // ===========================================================
    get(player: PlayerState, type: string): number {
        return player.currencies.values.get(type) || 0;
    }

    // ===========================================================
    // 🔥 MESSAGE ROUTER
    // ===========================================================
    handleMessage(type: string, client: Client, player: PlayerState, data: any): boolean {

        if (type !== "currency")
            return false;

        const action = data.action;
        const currencyType = data.type;
        const amount = Number(data.amount) || 0;

        // -------------------------
        // 🔐 Sécurité anti-hack
        // -------------------------
        if (!CurrencyManager.VALID_TYPES.includes(currencyType))
            return false;

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
