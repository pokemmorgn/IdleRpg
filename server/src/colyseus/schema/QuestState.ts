// server/src/colyseus/schema/QuestState.ts
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { QuestObjectiveMap } from "./QuestObjectiveMap";

/**
 * QuestState
 * ----------
 * Structure correcte :
 *
 * questStep:        MapSchema<number>
 * questStartedAt:   MapSchema<number>
 *
 * questObjectives:  MapSchema<QuestObjectiveMap>
 *                   ↳ questId -> (objectiveId -> count)
 */
export class QuestState extends Schema {

  /** Quêtes terminées (one-shot) */
  @type(["string"])
  completed = new ArraySchema<string>();

  /** Quête principale active */
  @type("string")
  activeMain: string = "";

  /** Quête secondaire active */
  @type("string")
  activeSecondary: string = "";

  /** Quêtes répétables actives */
  @type(["string"])
  activeRepeatables = new ArraySchema<string>();

  /** questId -> step */
  @type({ map: "number" })
  questStep = new MapSchema<number>();

  /** questId -> timestamp */
  @type({ map: "number" })
  questStartedAt = new MapSchema<number>();

  /**
   * questId -> (objectiveId -> count)
   * MapSchema<QuestObjectiveMap>
   */
  @type({ map: QuestObjectiveMap })
  questObjectives = new MapSchema<QuestObjectiveMap>();

  /** Cooldowns journaliers */
  @type({ map: "number" })
  dailyCooldown = new MapSchema<number>();

  /** Cooldowns hebdomadaires */
  @type({ map: "number" })
  weeklyCooldown = new MapSchema<number>();
}
