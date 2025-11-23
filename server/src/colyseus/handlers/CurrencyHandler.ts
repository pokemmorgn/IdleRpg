import { CurrencyManager } from "../managers/CurrencyManager";
import { Client } from "colyseus";
import { PlayerState } from "../schema/PlayerState";

export class CurrencyHandler {

    constructor(
        private currencyManager: CurrencyManager
    ) {}

    handle(type: string, client: Client, player: PlayerState, data: any): boolean {

        // Transfert au manager
        return this.currencyManager.handleMessage(type, client, player, data);
    }
}
