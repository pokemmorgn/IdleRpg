import { Client } from "colyseus";
import { PlayerState } from "../schema/PlayerState";

export class CurrencyManager {

    // ========================================================================
    // ROUTEUR DE MESSAGES
    // ========================================================================
    handleMessage(
        type: string,
        client: Client,
        player: PlayerState,
        data: any
    ): boolean {

        try {
            switch (type) {

                case "currency_add":
                    this.addCurrency(player, client, data);
                    return true;

                case "currency_spend":
                    this.spendCurrency(player, client, data);
                    return true;
            }

        } catch (err) {
            console.error("❌ CurrencyManager.handleMessage:", err);
        }

        return false; // laisses les autres managers tester
    }

    // ========================================================================
    // AJOUT DE MONNAIE
    // ========================================================================
    private addCurrency(
        player: PlayerState,
        client: Client,
        data: { type: string; amount: number }
    ) {
        const { type, amount } = data;

        if (!this.isValidCurrency(type)) {
            client.send("currency_error", {
                error: "invalid_currency",
                type
            });
            return;
        }

        if (amount <= 0) {
            client.send("currency_error", {
                error: "invalid_amount",
                amount
            });
            return;
        }

        player.currencies[type] += amount;

        client.send("currency_update", {
            type,
            amount: player.currencies[type]
        });
    }

    // ========================================================================
    // DÉPENSER DE LA MONNAIE
    // ========================================================================
    private spendCurrency(
        player: PlayerState,
        client: Client,
        data: { type: string; amount: number }
    ) {
        const { type, amount } = data;

        if (!this.isValidCurrency(type)) {
            client.send("currency_error", {
                error: "invalid_currency",
                type
            });
            return;
        }

        if (amount <= 0) {
            client.send("currency_error", {
                error: "invalid_amount",
                amount
            });
            return;
        }

        if (player.currencies[type] < amount) {
            client.send("currency_error", {
                error: "not_enough_currency",
                type,
                amountRequired: amount,
                owned: player.currencies[type]
            });
            return;
        }

        player.currencies[type] -= amount;

        client.send("currency_update", {
            type,
            amount: player.currencies[type]
        });
    }

    // ========================================================================
    // VALIDATION
    // ========================================================================
    private isValidCurrency(type: string): type is keyof PlayerState["currencies"] {
        return (
            type === "gold" ||
            type === "diamondBound" ||
            type === "diamondUnbound"
        );
    }
}
