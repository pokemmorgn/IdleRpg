import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";
import { QuestProgress } from "./QuestProgress";

/**
 * État des quêtes d’un joueur
 * (séparé de PlayerState pour réduire le nombre de champs)
 */
export class QuestState extends Schema {

  // === Quêtes actives ===
  @type("string") activeMainQuest: string = "";
  @type("string") activeSecondaryQuest: string = "";

  // === Quêtes répétables ===
  @type([ "string" ])
  activeRepeatableQuests = new ArraySchema<string>();

  // === Quêtes terminées ===
  @type([ "string" ])
  completedQuests = new ArraySchema<string>();

  // === Progression par quête ===
  @type({ map: QuestProgress })
  questProgress = new MapSchema<QuestProgress>();

  // === Cooldowns : timestamps ===
  @type({ map: "number" })
  lastDailyQuestCompletion = new MapSchema<number>();

  @type({ map: "number" })
  lastWeeklyQuestCompletion = new MapSchema<number>();

  @type({ map: "number" })
  lastRepeatableQuestCompletion = new MapSchema<number>();
}
