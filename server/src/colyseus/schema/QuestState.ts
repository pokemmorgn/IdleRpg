// server/src/colyseus/schema/QuestState.ts
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

  // --- MODIFIÉ : NOUVELLE STRUCTURE DE PROGRESSION ---

  // questId -> step
  @type({ map: "number" })
  questStep = new MapSchema<number>();

  // questId -> startedAt
  @type({ map: "number" })
  questStartedAt = new MapSchema<number>();

  // questId -> objectiveId -> count
  @type({ map: "json" }) // On garde "json" pour la map interne
  questObjectives = new MapSchema<any>();

  // --- FIN DE LA MODIFICATION ---

  // Cooldowns
  @type({ map: "number" })
  dailyCooldown = new MapSchema<number>();

  @type({ map: "number" })
  weeklyCooldown = new MapSchema<number>();
}
