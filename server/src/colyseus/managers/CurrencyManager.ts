// server/src/colyseus/managers/CurrencyManager.ts

import { Client } from "colyseus";
import { PlayerState } from "../schema/PlayerState";

export class CurrencyManager {

  add(player: PlayerState, type: string, amount: number) {
    const cur = player.currencies.values;

    cur[type] = (cur[type] || 0) + amount;

    player.triggerCurrencyUpdate(type);
  }

  remove(player: PlayerState, type: string, amount: number): boolean {
    const cur = player.currencies.values;

    if ((cur[type] || 0) < amount) return false;

    cur[type] = (cur[type] || 0) - amount;

    player.triggerCurrencyUpdate(type);
    return true;
  }

  set(player: PlayerState, type: string, amount: number) {
    const cur = player.currencies.values;
    cur[type] = amount;
    player.triggerCurrencyUpdate(type);
  }

  get(player: PlayerState, type: string): number {
    return player.currencies.values[type] || 0;
  }

  handleMessage(type: string, client: Client, player: PlayerState, msg: any): boolean {
    if (type === "currency_add") {
      this.add(player, msg.currency, msg.amount);
      return true;
    }

    if (type === "currency_remove") {
      const ok = this.remove(player, msg.currency, msg.amount);
      client.send("currency_result", {
        ok,
        currency: msg.currency,
        amount: msg.amount
      });
      return true;
    }

    return false;
  }
}
