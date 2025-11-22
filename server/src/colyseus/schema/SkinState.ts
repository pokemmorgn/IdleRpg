// server/src/colyseus/schema/SkinState.ts

import { Schema, type, MapSchema } from "@colyseus/schema";

/**
 * SkinProgressState
 * -----------------
 * Représente un skin débloqué par le joueur
 * Avec son niveau actuel (de 1 à maxLevel)
 */
export class SkinProgressState extends Schema {
  @type("string") skinId: string = "";
  @type("number") level: number = 1;
}

/**
 * SkinState
 * ---------
 * Stockage complet des skins d'un joueur :
 * - skins débloqués (map <skinId, SkinProgressState>)
 * - skin actuellement équipé
 */
export class SkinState extends Schema {

  // Skins que le joueur possède et leur progression
  @type({ map: SkinProgressState })
  unlockedSkins = new MapSchema<SkinProgressState>();

  // Skin actuellement équipé (client récupère ce skinId pour l'affichage)
  @type("string")
  equippedSkinId: string = "";
}
