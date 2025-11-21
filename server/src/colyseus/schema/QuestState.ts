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

  // --- AJOUT: Propriétés pour la progression "aplatie" ---
  // questId -> step
  @type({ map: "number" })
  questStep = new MapSchema<number>();

  // questId -> timestamp
  @type({ map: "number" })
  questStartedAt = new MapSchema<number>();

  // questId -> { objectiveId: count }
  @type({ map: "number" })
  questObjectives = new MapSchema<number>();
  // --- FIN DES AJOUTS ---

  // Cooldowns
  @type({ map: "number" })
  dailyCooldown = new MapSchema<number>();

  @type({ map: "number" })
  weeklyCooldown = new MapSchema<number>();
}
