// server/src/colyseus/handlers/CurrencyHandler.ts

import { CurrencyManager } from "../managers/CurrencyManager";
import { Client } from "colyseus";
import { PlayerState } from "../schema/PlayerState";

export class CurrencyHandler {

    constructor(
        private currencyManager: CurrencyManager
    ) {}

    /**
     * Retourne TRUE si le message concerne la monnaie
     * (et ne doit pas être transmis aux autres handlers)
     */
    handle(type: string, client: Client, player: PlayerState, payload: any): boolean {
        
        // On traite uniquement les messages de type "currency"
        if (type !== "currency")
            return false;

        // On délègue au CurrencyManager qui contient toute la sécurité
        this.currencyManager.handleMessage(type, client, player, payload);

        return true;
    }
}
