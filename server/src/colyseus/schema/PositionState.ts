import { Schema, type } from "@colyseus/schema";

export class PositionState extends Schema {
  @type("string") zoneId: string = "default";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
}
