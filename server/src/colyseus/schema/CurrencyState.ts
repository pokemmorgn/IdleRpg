// server/src/colyseus/schema/CurrencyState.ts
import { Schema, type } from "@colyseus/schema";

export class CurrencyState extends Schema {

  @type("int32")
  gold: number = 0;

  @type("int32")
  diamondBound: number = 0;

  @type("int32")
  diamondUnbound: number = 0;
}
