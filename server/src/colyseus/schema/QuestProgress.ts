// server/src/colyseus/schema/QuestProgress.ts
import { Schema, type, MapSchema } from "@colyseus/schema"; // AJOUT DE MapSchema

export class QuestProgress extends Schema {
  @type("number") step: number = 0;
  @type("number") startedAt: number = 0;

  // MODIFIÉ: On utilise une MapSchema pour la compatibilité
  @type({ map: "number" })
  progress = new MapSchema<number>(); // MODIFIÉ: new MapSchema<number>()
}
