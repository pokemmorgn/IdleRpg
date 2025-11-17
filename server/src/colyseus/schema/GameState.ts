import { Schema, MapSchema, type } from "@colyseus/schema";

/**
 * Représente un joueur connecté dans la GameRoom
 */
export class Player extends Schema {
  @type("string") sessionId: string = "";
  @type("string") playerId: string = "";
  @type("string") characterName: string = "";
  @type("string") class: string = "warrior";
  @type("number") level: number = 1;
  @type("number") xp: number = 0;
  @type("number") gold: number = 0;
  
  // Position (pour futur système de monde)
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  
  // Status
  @type("boolean") isOnline: boolean = true;
  @type("number") lastUpdate: number = Date.now();
}

/**
 * State principal de la GameRoom
 * Synchronisé automatiquement avec tous les clients
 */
export class GameState extends Schema {
  @type("string") serverId: string = "";
  @type({ map: Player }) players = new MapSchema<Player>();
  
  // Stats du serveur
  @type("number") serverTime: number = Date.now();
  @type("number") playersCount: number = 0;
}
