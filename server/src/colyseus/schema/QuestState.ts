import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";
import { QuestProgress } from "./QuestProgress";

export class QuestState extends Schema {

  @type("string") activeMainQuest: string = "";
  @type("string") activeSecondaryQuest: string = "";

  @type([ "string" ]) activeRepeatableQuests = new ArraySchema<string>();
  @type([ "string" ]) completedQuests = new ArraySchema<string>();

  @type({ map: QuestProgress }) progress = new MapSchema<QuestProgress>();

  @type({ map: "number" }) lastDailyQuestCompletion = new MapSchema<number>();
  @type({ map: "number" }) lastWeeklyQuestCompletion = new MapSchema<number>();
  @type({ map: "number" }) lastRepeatableQuestCompletion = new MapSchema<number>();
}
