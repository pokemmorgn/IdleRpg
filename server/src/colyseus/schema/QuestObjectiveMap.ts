import { Schema, type, MapSchema } from "@colyseus/schema";

export class QuestObjectiveMap extends Schema {
  @type({ map: "number" })
  objectives = new MapSchema<number>();
}
