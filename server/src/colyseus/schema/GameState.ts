import { Schema, MapSchema, type } from "@colyseus/schema";
import { PlayerState } from "./PlayerState";
import { NPCState } from "./NPCState";
import { MonsterState } from "./MonsterState";

export class GameState extends Schema {
  @type("string") serverId: string = "";
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: NPCState }) npcs = new MapSchema<NPCState>();
  @type({ map: MonsterState }) monsters = new MapSchema<MonsterState>();
  @type("number") worldTime: number = 0;
  @type("number") onlineCount: number = 0;
  
  constructor(serverId: string) {
    super();
    this.serverId = serverId;
    this.worldTime = Date.now();
    this.onlineCount = 0;
  }

  addPlayer(playerState: PlayerState): void {
    this.players.set(playerState.sessionId, playerState);
    this.onlineCount = this.players.size;
    console.log(`👤 ${playerState.characterName} connecté sur ${this.serverId} (${this.onlineCount} en ligne)`);
  }

  removePlayer(sessionId: string): void {
    const player = this.players.get(sessionId);
    if (player) {
      console.log(`👋 ${player.characterName} déconnecté de ${this.serverId}`);
      this.players.delete(sessionId);
      this.onlineCount = this.players.size;
    }
  }

  addNPC(npcState: NPCState): void {
    this.npcs.set(npcState.npcId, npcState);
    console.log(`🤖 NPC ajouté: ${npcState.name} (${npcState.npcId}) sur ${this.serverId}`);
  }

  removeNPC(npcId: string): void {
    const npc = this.npcs.get(npcId);
    if (npc) {
      console.log(`🗑️  NPC retiré: ${npc.name} (${npcId}) de ${this.serverId}`);
      this.npcs.delete(npcId);
    }
  }

  addMonster(monsterState: MonsterState): void {
    this.monsters.set(monsterState.monsterId, monsterState);
    console.log(`👹 Monster ajouté: ${monsterState.name} (${monsterState.monsterId}) sur ${this.serverId}`);
  }

  removeMonster(monsterId: string): void {
    const monster = this.monsters.get(monsterId);
    if (monster) {
      console.log(`🗑️  Monster retiré: ${monster.name} (${monsterId}) de ${this.serverId}`);
      this.monsters.delete(monsterId);
    }
  }

  updateWorldTime(): void {
    this.worldTime = Date.now();
  }
}
