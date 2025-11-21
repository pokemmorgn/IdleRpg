import { Schema, type } from "@colyseus/schema";

/**
 * Progression d'une quête pour un joueur :
 * - step : index de l'objectif en cours
 * - startedAt : timestamp
 * - progress : Map objectiveId → valeur (ex: kills, items collectés)
 */
export class QuestProgress extends Schema {
  @type("number") step: number = 0;
  @type("number") startedAt: number = 0;

  // Ex: { "obj1": 3, "obj2": 1 }
  @type({ map: "number" })
  progress = new Map<string, number>();
}
