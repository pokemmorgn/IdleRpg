// server/src/colyseus/schema/QuestState.ts
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class QuestState extends Schema {

  @type(["string"])
  completed = new ArraySchema<string>();

  @type("string")
  activeMain: string = "";

  @type("string")
  activeSecondary: string = "";

  @type(["string"])
  activeRepeatables = new ArraySchema<string>();

  @type({ map: "number" })
  questStep = new MapSchema<number>();

  @type({ map: "number" })
  questStartedAt = new MapSchema<number>();

  // FIX ICI 👇 : map<questId, map<objectiveId, number>>
  @type({ map: { map: "number" } })
  questObjectives = new MapSchema<MapSchema<number>>();

  @type({ map: "number" })
  dailyCooldown = new MapSchema<number>();

  @type({ map: "number" })
  weeklyCooldown = new MapSchema<number>();
}
