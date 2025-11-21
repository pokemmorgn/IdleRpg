import { Schema, type } from "@colyseus/schema";
import { QuestState } from "./QuestState";
import { CombatState } from "./CombatState";
import { PositionState } from "./PositionState";

/**
 * Schema principal : PlayerState
 * Réduit → sous-schemas obligatoires pour éviter la limite de 64 champs
 */
export class PlayerState extends Schema {

  // ===== IDENTIFIANTS =====
  @type("string") sessionId: string = "";
  @type("string") playerId: string = "";
  @type("string") profileId: string = "";
  @type("number") characterSlot: number = 1;

  // ===== INFOS PERSO =====
  @type("string") characterName: string = "";
  @type("number") level: number = 1;
  @type("string") class: string = "";
  @type("string") race: string = "";

  // ===== TIMERS / ÉTAT =====
  @type("number") connectedAt: number = 0;
  @type("number") lastActivity: number = 0;

  // ===== SOUS SCHÉMAS =====
  @type(CombatState) combat: CombatState = new CombatState();
  @type(PositionState) position: PositionState = new PositionState();
  @type(QuestState) quests: QuestState = new QuestState();

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
