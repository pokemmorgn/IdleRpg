// server/src/colyseus/handlers/CurrencyHandler.ts

import { CurrencyManager } from "../managers/CurrencyManager";
import { Client } from "colyseus";
import { PlayerState } from "../schema/PlayerState";

export class CurrencyHandler {

    private static VALID_TYPES = ["gold", "diamondBound", "diamondUnbound"];

    constructor(
        private currencyManager: CurrencyManager
    ) {}

    /**
     * Retourne TRUE si le message concerne la monnaie
     * (et ne doit pas être transmis aux autres handlers)
     */
    handle(type: string, client: Client, player: PlayerState, payload: any): boolean {
        
        // On traite uniquement les messages "currency"
        if (type !== "currency") 
            return false;

        if (!payload || !payload.data) {
            console.warn("⚠️ CurrencyHandler: payload vide");
            return true;
        }

        const { type: currencyType } = payload.data;

        // Vérifie le type de monnaie demandé
        if (!CurrencyHandler.VALID_TYPES.includes(currencyType)) {
            console.warn("⛔ CurrencyHandler: invalid currency type:", currencyType);
            client.send("currency_error", { error: "invalid_currency_type" });
            return true;
        }

        // On délègue au Manager (anti-cheat + hash + taux + etc.)
        this.currencyManager.handleMessage(type, client, player, payload);

        return true;
    }
}
