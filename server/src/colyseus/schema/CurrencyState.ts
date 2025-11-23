import { Schema, type, MapSchema } from "@colyseus/schema";

/**
 * CurrencyState
 * -------------
 * Contient toutes les monnaies du joueur dans une MapSchema dynamique.
 *
 * Exemple:
 *  - values["gold"] = 1500
 *  - values["diamonds_bound"] = 120
 *  - values["diamonds"] = 15
 */
export class CurrencyState extends Schema {

  @type({ map: "number" })
  values = new MapSchema<number>();

  getGold() {
    return this.values.get("gold") || 0;
  }

  getPremiumDiamonds() {
    return this.values.get("diamonds") || 0;
  }

  getBoundDiamonds() {
    return this.values.get("diamonds_bound") || 0;
  }
}

