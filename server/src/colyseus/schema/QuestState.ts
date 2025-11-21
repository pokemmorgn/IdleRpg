// Dans QuestState.ts

import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class QuestState extends Schema {
  // Quêtes one-shot complétées
  @type([ "string" ])
  completed = new ArraySchema<string>();

  // Quête principale
  @type("string")
  activeMain: string = "";

  // Quête secondaire
  @type("string")
  activeSecondary: string = "";

  // Quêtes répétables actives
  @type([ "string" ])
  activeRepeatables = new ArraySchema<string>();

  // MODIFIÉ: On change le type pour débugger
  // Progression → questId → { step: number, startedAt: number, progress: { [objectiveId]: count } }
  @type({ map: "json" }) // Gardons "json" pour l'instant, mais si ça ne marche pas, on essaiera autre chose.
  progress = new MapSchema<any>();

  // Cooldowns
  @type({ map: "number" })
  dailyCooldown = new MapSchema<number>();

  @type({ map: "number" })
  weeklyCooldown = new MapSchema<number>();
}
