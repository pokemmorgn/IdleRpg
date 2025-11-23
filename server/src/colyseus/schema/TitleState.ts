// server/src/colyseus/schema/TitleState.ts

import { Schema, type, MapSchema } from "@colyseus/schema";

/**
 * TitleState
 * ----------
 * - titres débloqués (juste un bool)
 * - titre actuellement équipé (effet visuel)
 */
export class TitleState extends Schema {

  // Map des titres débloqués : <titleId, true>
  @type({ map: "boolean" })
  unlockedTitles = new MapSchema<boolean>();

  // Titre actuellement équipé (visuel uniquement)
  @type("string")
  equippedTitleId: string = "";
}
