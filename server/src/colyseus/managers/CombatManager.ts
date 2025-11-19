import { Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { MonsterState } from "../schema/MonsterState";
import { AFKManager } from "./AFKManager";
import { ConsumableManager } from "./ConsumableManager";
import { AFKBehaviorManager } from "./AFKBehaviorManager";

export class CombatManager {

  private serverId: string;
  private gameState: GameState;

  private afkManager: AFKManager;
  private afkBehavior: AFKBehaviorManager;

  private consumableManager: ConsumableManager;
  private clients: Map<string, Client> = new Map();

  private attackTimers: Map<string, number> = new Map();
  private monsterAttackTimers: Map<string, number> = new Map();
  private respawnTimers: Map<string, number> = new Map();

  // CONFIG
  private readonly MELEE_RANGE = 2;         // portée réelle d'attaque
  private readonly DETECTION_RANGE = 40;    // trouve un monstre
  private readonly IDLE_THRESHOLD = 1000;   // joueur immobile

  constructor(serverId: string, gameState: GameState, afkManager: AFKManager) {
    this.serverId = serverId;
    this.gameState = gameState;
    this.afkManager = afkManager;
    this.afkBehavior = new AFKBehaviorManager();
    this.consumableManager = new ConsumableManager();
  }

  registerClient(sessionId: string, client: Client) {
    this.clients.set(sessionId, client);
  }

  unregisterClient(sessionId: string) {
    this.clients.delete(sessionId);
  }

  // ============================================================
  // 🔥 TICK PRINCIPAL
  // ============================================================
  update(deltaTime: number): void {

    // 1. Respawn des monstres
    this.updateRespawnTimers(deltaTime);

    // 2. IA de chaque monstre
    this.handleMonsterAggro(deltaTime);

    // 3. Gestion de chaque joueur
    this.gameState.players.forEach((player) => {

      // s’assurer que le joueur AFK reste statique
      if (player.isAFK && player.afkReferencePosition) {
        this.afkBehavior.enforceStaticPosition(player, player.afkReferencePosition);
      }

      if (player.isDead) {
        this.handlePlayerDeathTimer(player, deltaTime);
        return;
      }

      // Combat actif ?  
      if (player.inCombat) {
        this.handleActiveCombat(player, deltaTime);
        return;
      }

      // Sinon → détecter une opportunité de combat
      this.detectCombatOpportunity(player);
    });
  }

  // ============================================================
  // 🔥 DÉTECTION D'UN COMBAT
  // ============================================================
  private detectCombatOpportunity(player: PlayerState): void {

    const now = Date.now();

    if (now - player.lastAFKCombatCheck < 1000) return;
    player.lastAFKCombatCheck = now;

    const isIdle = now - player.lastMovementTime >= this.IDLE_THRESHOLD;

    if (!isIdle && !player.isAFK) return;

    const monster = this.findNearestMonster(player);
    if (!monster) return;

    this.startCombat(player, monster);
  }

  private findNearestMonster(player: PlayerState): MonsterState | null {

    let nearest: MonsterState | null = null;
    let minDist = this.DETECTION_RANGE;

    this.gameState.monsters.forEach((monster) => {

      if (!monster.isAlive || monster.isDead) return;

      const d = this.dist(player, monster);

      if (d < minDist) {
        nearest = monster;
        minDist = d;
      }
    });

    return nearest;
  }

  // ============================================================
  // 🔥 DÉMARRER UN COMBAT
  // ============================================================
  private startCombat(player: PlayerState, monster: MonsterState): void {

    player.inCombat = true;
    player.targetMonsterId = monster.monsterId;
    player.attackTimer = 0;

    monster.targetPlayerId = player.sessionId;
    this.monsterAttackTimers.set(monster.monsterId, 0);

    this.msgTo(player.sessionId, "combat_start", {
      monsterId: monster.monsterId,
      playerHP: player.hp,
      monsterHP: monster.hp
    });
  }

  // ============================================================
  // 🔥 COMBAT ACTIF (ONLINE + AFK)
  // ============================================================
  private handleActiveCombat(player: PlayerState, deltaTime: number): void {

    const monster = this.gameState.monsters.get(player.targetMonsterId);
    if (!monster || monster.isDead || !monster.isAlive) {
      this.stopCombat(player);
      return;
    }

    const d = this.dist(player, monster);

    // LEASH : le monstre repart
    if (d > monster.leashRange) {
      monster.targetPlayerId = "";
      this.stopCombat(player);
      return;
    }

    // ============================
    // 🔥 MODE AFK
    // ============================
    if (player.isAFK) {

      // Le monstre doit avancer vers le joueur
      if (d > monster.attackRange) {
        this.moveMonsterTowardsPlayer(monster, player, deltaTime);
        return;
      }

      // À portée → combat
      this.handleCombatAttacks(player, monster, deltaTime);
      return;
    }

    // ============================
    // 🔥 MODE ONLINE
    // ============================
    if (d > this.MELEE_RANGE) {
      this.movePlayerTowardsMonster(player, monster, deltaTime);
      return;
    }

    this.handleCombatAttacks(player, monster, deltaTime);
  }

  // ============================================================
  // 🔥 DÉPLACEMENT IA
  // ============================================================
  private moveMonsterTowardsPlayer(monster: MonsterState, player: PlayerState, dt: number) {

    const dx = player.posX - monster.posX;
    const dy = player.posY - monster.posY;
    const dz = player.posZ - monster.posZ;

    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if (dist === 0) return;

    const dirX = dx/dist;
    const dirY = dy/dist;
    const dirZ = dz/dist;

    const move = monster.speed * (dt/1000);

    monster.posX += dirX * move;
    monster.posY += dirY * move;
    monster.posZ += dirZ * move;
  }

  private movePlayerTowardsMonster(player: PlayerState, monster: MonsterState, dt: number) {

    const dx = monster.posX - player.posX;
    const dy = monster.posY - player.posY;
    const dz = monster.posZ - player.posZ;

    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if (dist === 0) return;

    const dirX = dx/dist;
    const dirY = dy/dist;
    const dirZ = dz/dist;

    const move = player.moveSpeed * (dt / 1000);

    player.posX += dirX * move;
    player.posY += dirY * move;
    player.posZ += dirZ * move;

    this.msgTo(player.sessionId, "player_position_update", { 
      x: player.posX, y: player.posY, z: player.posZ 
    });
  }


  // ============================================================
  // 🔥 ATTAQUES + DÉGÂTS
  // ============================================================
  private handleCombatAttacks(player: PlayerState, monster: MonsterState, dt: number) {

    // PLAYER ATTAQUE
    player.attackTimer += dt;

    if (player.attackTimer >= player.attackSpeed * 1000) {
      this.performDamage(player, monster);
      player.attackTimer = 0;
    }

    // MONSTRE ATTAQUE
    const t = (this.monsterAttackTimers.get(monster.monsterId) || 0) + dt;
    const atkSpeed = 2.5 * (100 / monster.speed);

    if (t >= atkSpeed * 1000) {
      this.performDamage(monster, player);
      this.monsterAttackTimers.set(monster.monsterId, 0);
    } else {
      this.monsterAttackTimers.set(monster.monsterId, t);
    }
  }

  private performDamage(attacker: any, defender: any) {

    let dmg = 0;

    if (attacker instanceof PlayerState) {
      dmg = attacker.attackPower;
    } else {
      dmg = attacker.attack;
    }

    if (defender instanceof PlayerState) {
      defender.hp = Math.max(0, defender.hp - dmg);
    } else {
      defender.hp = Math.max(0, defender.hp - dmg);
    }

    this.broadcast("combat_damage", {
      attackerId: attacker.sessionId || attacker.monsterId,
      defenderId: defender.sessionId || defender.monsterId,
      damage: dmg,
      defenderHPLeft: defender.hp
    });

    if (defender.hp <= 0) {
      this.handleDeath(attacker, defender);
    }
  }

  // ============================================================
  // 🔥 MORTS
  // ============================================================
  private handleDeath(killer: any, victim: any) {

    if (victim instanceof MonsterState) {
      this.handleMonsterDeath(killer, victim);
    } 
    else {
      this.handlePlayerDeath(killer, victim);
    }
  }

  private async handleMonsterDeath(player: PlayerState, monster: MonsterState) {

    monster.isDead = true;
    monster.isAlive = false;

    const xp = monster.xpReward;
    const gold = monster.level * 10;

    if (player.isAFK) {
      await this.afkManager.addMonsterKill(player.profileId, xp, gold);
    } else {
      this.msgTo(player.sessionId, "xp_gained", { amount: xp });
      this.msgTo(player.sessionId, "loot_dropped", { gold });
    }

    this.msgTo(player.sessionId, "combat_death", { isPlayer: false });

    this.scheduleRespawn(monster);
    this.stopCombat(player);
  }

  private handlePlayerDeath(killer: MonsterState, player: PlayerState) {

    player.hp = 0;
    player.isDead = true;
    player.deathTimer = 30000;

    player.inCombat = false;
    this.msgTo(player.sessionId, "combat_death", { isPlayer: true });

    if (player.isAFK) this.afkManager.addDeath(player.profileId);
  }

  private handlePlayerDeathTimer(player: PlayerState, dt: number) {

    player.deathTimer -= dt;

    if (player.deathTimer <= 0) {
      player.isDead = false;
      player.hp = player.maxHp;
      this.msgTo(player.sessionId, "player_resurrected", { hp: player.hp });
    }
  }

  // ============================================================
  // 🔥 FIN DE COMBAT + RESET PROPRE
  // ============================================================
  private stopCombat(player: PlayerState): void {

    if (!player.inCombat) return;

    const monster = this.gameState.monsters.get(player.targetMonsterId);

    player.inCombat = false;
    player.targetMonsterId = "";

    if (monster) {
      monster.targetPlayerId = "";
    }

    this.attackTimers.delete(player.sessionId);
  }

  // ============================================================
  // 🔥 IA MONSTRES (AGGRO + WANDER)
  // ============================================================
  private handleMonsterAggro(dt: number): void {

    this.gameState.monsters.forEach((monster) => {

      if (!monster.isAlive || monster.isDead) return;

      // A déjà une cible ?
      if (monster.targetPlayerId) {

        const player = this.gameState.players.get(monster.targetPlayerId);
        if (!player || player.isDead) {
          monster.targetPlayerId = "";
          return;
        }

        const d = this.dist(player, monster);

        if (d > monster.leashRange) {
          monster.targetPlayerId = "";
          return;
        }

        if (d > monster.attackRange) {
          this.moveMonsterTowardsPlayer(monster, player, dt);
        }

        return;
      }

      // Chercher une nouvelle cible
      if (monster.behaviorType === "aggressive") {

        this.gameState.players.forEach((player) => {

          if (player.isDead) return;

          const dist = this.dist(player, monster);

          if (dist <= monster.aggroRange) {
            monster.targetPlayerId = player.sessionId;
          }
        });
      }
    });
  }

  // ============================================================
  // 🔥 RESPAWN MONSTRES
  // ============================================================
  private scheduleRespawn(monster: MonsterState): void {
    this.respawnTimers.set(monster.monsterId, monster.respawnTime * 1000);
  }

  private updateRespawnTimers(dt: number): void {
    this.respawnTimers.forEach((t, id) => {
      t -= dt;
      if (t <= 0) {
        const m = this.gameState.monsters.get(id);
        if (m) this.respawnMonster(m);
        this.respawnTimers.delete(id);
      } else {
        this.respawnTimers.set(id, t);
      }
    });
  }

  private respawnMonster(monster: MonsterState) {

    monster.isDead = false;
    monster.isAlive = true;
    monster.hp = monster.maxHp;
    monster.currentHp = monster.maxHp;
    monster.targetPlayerId = "";

    this.broadcast("monster_respawn", { monsterId: monster.monsterId });
  }

  // ============================================================
  // 🔧 UTILS
  // ============================================================
  private dist(a: PlayerState | MonsterState, b: PlayerState | MonsterState): number {
    const dx = b.posX - a.posX;
    const dy = b.posY - a.posY;
    const dz = b.posZ - a.posZ;
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
  }

  private msgTo(sessionId: string, type: string, data: any) {
    const c = this.clients.get(sessionId);
    if (c) c.send(type, data);
  }

  private broadcast(type: string, data: any) {
    this.clients.forEach(c => c.send(type, data));
  }
}
