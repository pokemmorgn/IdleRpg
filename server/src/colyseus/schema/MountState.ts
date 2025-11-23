// server/src/colyseus/schema/MountState.ts

import { Schema, type, MapSchema } from "@colyseus/schema";

/**
 * MountState
 * ----------
 * - montures débloquées
 * - monture équipée (affichage)
 */
export class MountState extends Schema {

  // Map des montures débloquées : <mountId, true>
  @type({ map: "boolean" })
  unlockedMounts = new MapSchema<boolean>();

  // Monture affichée (client l'utilise pour afficher le modèle)
  @type("string")
  equippedMountId: string = "";
}
