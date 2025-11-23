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
  
  /** 
   * Map dynamique "string → number".
   * On peut ajouter autant de monnaies qu’on veut.
   */
  @type({ map: "number" })
  values = new MapSchema<number>();
}
