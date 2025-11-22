// server/src/colyseus/managers/MonsterManager.ts
import { GameState } from "../schema/GameState";
import { MonsterState } from "../schema/MonsterState";
import Monster from "../../models/Monster";

export class MonsterManager {
  private serverId: string;
  private gameState: GameState;

  constructor(serverId: string, gameState: GameState) {
    this.serverId = serverId;
    this.gameState = gameState;
  }

  async loadMonsters(zoneId?: string): Promise<void> {
    try {
      console.log(`📂 [MonsterManager] Chargement des monsters pour ${this.serverId}...`);

      const filter: any = { 
        serverId: this.serverId, 
        isActive: true 
      };
      
      if (zoneId) {
        filter.zoneId = zoneId;
        console.log(`🗺️  [MonsterManager] Filtrage par zone: ${zoneId}`);
      }

      const monsters = await Monster.find(filter);

      console.log(`✅ [MonsterManager] ${monsters.length} monster(s) trouvé(s) pour ${this.serverId}`);

      for (const monster of monsters) {
        const monsterState = new MonsterState(
          monster.monsterId,
          monster.name,
          monster.type,
          monster.level,
          monster.stats.hp,
          monster.stats.maxHp,
          monster.stats.attack,
          monster.stats.defense,
          monster.stats.speed,
          monster.zoneId || "",
          monster.spawnPosition.x,
          monster.spawnPosition.y,
          monster.spawnPosition.z,
          monster.spawnRotation.x,
          monster.spawnRotation.y,
          monster.spawnRotation.z,
          monster.behavior.type,
          monster.behavior.aggroRange,
          monster.behavior.leashRange,
          monster.behavior.attackRange,
          monster.xpReward,
          monster.respawnTime,
          monster.respawnOnDeath,
          monster.type,             // Le type ("normal", "elite", "boss") est utilisé comme "rarity"
          monster.type === "boss",  // On déduit si c'est un boss en comparant le type
          monster.modelId,
          monster.isActive
        );

        this.gameState.addMonster(monsterState);
      }

      console.log(`👹 [MonsterManager] ${monsters.length} monster(s) chargé(s) dans le GameState`);

    } catch (err: any) {
      console.error(`❌ [MonsterManager] Erreur lors du chargement des monsters:`, err.message);
    }
  }

  async reloadMonsters(zoneId?: string): Promise<void> {
    try {
      console.log(`🔄 [MonsterManager] Rechargement des monsters pour ${this.serverId}...`);

      const currentMonsterIds = Array.from(this.gameState.monsters.keys());
      for (const monsterId of currentMonsterIds) {
        this.gameState.removeMonster(monsterId);
      }

      await this.loadMonsters(zoneId);

      console.log(`✅ [MonsterManager] Monsters rechargés`);

    } catch (err: any) {
      console.error(`❌ [MonsterManager] Erreur lors du rechargement des monsters:`, err.message);
    }
  }

  getMonster(monsterId: string): MonsterState | undefined {
    return this.gameState.monsters.get(monsterId);
  }

  getMonstersByType(type: string): MonsterState[] {
    const monsters: MonsterState[] = [];
    
    this.gameState.monsters.forEach((monster) => {
      if (monster.type === type) {
        monsters.push(monster);
      }
    });
    
    return monsters;
  }

  getMonstersByZone(zoneId: string): MonsterState[] {
    const monsters: MonsterState[] = [];
    
    this.gameState.monsters.forEach((monster) => {
      if (monster.zoneId === zoneId) {
        monsters.push(monster);
      }
    });
    
    return monsters;
  }

  getMonsterCount(): number {
    return this.gameState.monsters.size;
  }

  getMonsterCountByZone(zoneId: string): number {
    let count = 0;
    
    this.gameState.monsters.forEach((monster) => {
      if (monster.zoneId === zoneId) {
        count++;
      }
    });
    
    return count;
  }
}
