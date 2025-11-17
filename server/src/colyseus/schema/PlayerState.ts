import { Schema, type } from "@colyseus/schema";

/**
 * État d'un joueur connecté (visible par tous dans le serveur)
 * Représente la PRÉSENCE en ligne, pas le gameplay détaillé
 */
export class PlayerState extends Schema {
  @type("string") sessionId: string = "";       // ID de session Colyseus
  @type("string") playerId: string = "";        // MongoDB Player._id
  @type("string") profileId: string = "";       // MongoDB ServerProfile._id
  @type("number") characterSlot: number = 1;    // Slot du personnage (1-5)
  
  // Informations du personnage
  @type("string") characterName: string = "";
  @type("number") level: number = 1;
  @type("string") class: string = "";           // "warrior", "mage", etc.
  @type("string") race: string = "";            // "human_elion", etc.
  
  // État de connexion
  @type("number") connectedAt: number = 0;      // Timestamp de connexion
  @type("number") lastActivity: number = 0;     // Dernier heartbeat
  
  constructor(
    sessionId: string,
    playerId: string,
    profileId: string,
    characterSlot: number,
    characterName: string,
    level: number,
    characterClass: string,
    characterRace: string
  ) {
    super();
    this.sessionId = sessionId;
    this.playerId = playerId;
    this.profileId = profileId;
    this.characterSlot = characterSlot;
    this.characterName = characterName;
    this.level = level;
    this.class = characterClass;
    this.race = characterRace;
    this.connectedAt = Date.now();
    this.lastActivity = Date.now();
  }
}
