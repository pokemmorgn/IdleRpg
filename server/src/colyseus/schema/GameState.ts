import { Schema, MapSchema, type } from "@colyseus/schema";
import { PlayerState } from "./PlayerState";

/**
 * État global du monde partagé pour un serveur logique
 * Contient la liste des joueurs connectés (présence en ligne)
 * Le gameplay détaillé de chaque joueur est géré côté serveur uniquement
 */
export class GameState extends Schema {
  @type("string") serverId: string = "";              // "s1", "s2", etc.
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type("number") worldTime: number = 0;              // Timestamp du serveur (pour sync)
  @type("number") onlineCount: number = 0;            // Nombre de joueurs en ligne
  
  constructor(serverId: string) {
    super();
    this.serverId = serverId;
    this.worldTime = Date.now();
    this.onlineCount = 0;
  }

  /**
   * Ajoute un joueur à la liste des connectés
   */
  addPlayer(playerState: PlayerState): void {
    this.players.set(playerState.sessionId, playerState);
    this.onlineCount = this.players.size;
    console.log(`👤 ${playerState.characterName} connecté sur ${this.serverId} (${this.onlineCount} en ligne)`);
  }

  /**
   * Retire un joueur de la liste des connectés
   */
  removePlayer(sessionId: string): void {
    const player = this.players.get(sessionId);
    if (player) {
      console.log(`👋 ${player.characterName} déconnecté de ${this.serverId}`);
      this.players.delete(sessionId);
      this.onlineCount = this.players.size;
    }
  }

  /**
   * Met à jour le temps du monde (appelé dans le tick)
   */
  updateWorldTime(): void {
    this.worldTime = Date.now();
  }
}
