import { Schema, type, MapSchema } from "@colyseus/schema";

/**
 * États des quêtes pour un joueur.
 * Version ULTRA optimisée (< 10 champs).
 */
export class QuestState extends Schema {
  
  // Quête principale
  @type("string") activeMain: string = "";

  // Quête secondaire
  @type("string") activeSecondary: string = "";

  // Quêtes répétables/daily/weekly actives
  @type({ map: "string" })
  activeRepeatables = new MapSchema<string>(); 

  // Quêtes complétées
  @type({ map: "number" })
  completed = new MapSchema<number>();  // questId → timestamp

  // Progression (questId → JSON)
  @type({ map: "json" })
  progress = new MapSchema<any>();

  // Cooldowns
  @type({ map: "number" })
  dailyCooldown = new MapSchema<number>();

  @type({ map: "number" })
  weeklyCooldown = new MapSchema<number>();

  @type({ map: "number" })
  repeatableCooldown = new MapSchema<number>();
}
