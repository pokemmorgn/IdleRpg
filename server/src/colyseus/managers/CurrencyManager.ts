import { Client } from "colyseus";
import { PlayerState } from "../schema/PlayerState";
import { computeFullStats } from "./stats/PlayerStatsCalculator";

export class CurrencyManager {

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
        player.currencies.values.set(type, current + amount);

        this.sendUpdate(client, type, current + amount);
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

        player.currencies.values.set(type, current - amount);
        this.sendUpdate(client, type, current - amount);

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

    handleMessage(type: string, client: Client, player: PlayerState, data: any): boolean {
    const { currency, amount } = data || {};

    switch (type) {
        case "currency_add":
            this.add(player, client, currency, amount);
            return true;
        case "currency_remove":
            return this.remove(player, client, currency, amount);
        case "currency_set":
            this.set(player, client, currency, amount);
            return true;
    }
    return false;
}

}
