import { CurrencyManager } from "../managers/CurrencyManager";
import { Client } from "colyseus";
import { PlayerState } from "../schema/PlayerState";

export class CurrencyHandler {

    constructor(
        private currencyManager: CurrencyManager
    ) {}

    /**
     * Retourne TRUE si le message concerne la monnaie
     * (et donc ne doit pas être transmis aux autres managers)
     */
    handle(type: string, client: Client, player: PlayerState, data: any): boolean {
        
        // Le seul type géré ici :
        if (type !== "currency")
            return false;

        // On laisse le manager traiter l'opération (add/remove/set)
        this.currencyManager.handleMessage(type, client, player, data);
        return true;
    }
}
