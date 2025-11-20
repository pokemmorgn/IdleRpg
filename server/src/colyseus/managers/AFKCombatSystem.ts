import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { MonsterState } from "../schema/MonsterState";
import { AFKManager } from "./AFKManager";
import { AFKBehaviorManager } from "./AFKBehaviorManager";

export class AFKCombatSystem {
  private readonly ATTACK_DISTANCE = 40; // AFK = attaque à distance (statique)
  private readonly MONSTER_RESET_DISTANCE = 60;

  constructor(
    private readonly gameState: GameState,
    private readonly afkManager: AFKManager,
    private readonly broadcastToClient: (
      sessionId: string,
      type: string,
      data: any
    ) => void,
    private readonly behavior = new AFKBehaviorManager()
  ) {}

  // ----------------------------------------------------
  // TICK PRINCIPAL AFK (appelé depuis CombatManager)
  // ----------------------------------------------------
  update(deltaTime: number): void {
    for (const player of this.gameState.players.values()) {
      if (player.isAFK && !player.isDead) {
        this.runAFKCombatForPlayer(player, deltaTime);
      }
    }
  }

  // ----------------------------------------------------
  // COMBAT AFK POUR UN JOUEUR
  // ----------------------------------------------------
  private runAFKCombatForPlayer(player: PlayerState, dt: number): void {
    const reference = { x: player.posX, y: player.posY, z: player.posZ };

    // 1. Le joueur NE BOUGE PAS en AFK
    this.behavior.enforceStaticPosition(player, reference);

    // 2. Trouver un monstre à portée
    const monster = this.findMonsterInRange(player, reference);
    if (!monster) return;

    // 3. Attaquer automatiquement
    this.handleAutoAttack(player, monster, dt);

    // 4. Vérifier si le monstre est mort
    if (monster.currentHp <= 0 && monster.isAlive) {
      this.handleMonsterDeath(player, monster);
    }

    // 5. Vérifier si le joueur est mort
    if (player.hp <= 0 && !player.isDead) {
      this.handlePlayerDeath(player);
    }
  }

  // ----------------------------------------------------
  // TROUVE LE PREMIER MONSTRE À PORTÉE
  // ----------------------------------------------------
  private findMonsterInRange(
    player: PlayerState,
    reference: { x: number; y: number; z: number }
  ): MonsterState | null {
    for (const monster of this.gameState.monsters.values()) {
      if (!monster.isActive || !monster.isAlive) continue;

      const dist = this.behavior.getDistanceFromReference(reference, {
        x: monster.posX,
        y: monster.posY,
        z: monster.posZ,
      });

      if (dist <= this.ATTACK_DISTANCE) {
        return monster;
      }
    }
    return null;
  }

  // ----------------------------------------------------
  // AUTO-ATTAQUE STATIQUE
  // ----------------------------------------------------
  private handleAutoAttack(
    player: PlayerState,
    monster: MonsterState,
    dt: number
  ): void {
    player.attackTimer -= dt;
    if (player.attackTimer > 0) return;

    player.attackTimer = player.attackSpeed * 1000;

    // calcul des dégâts
    const damage = Math.max(1, player.attackPower - monster.defense);
    monster.setHp(monster.hp - damage);

    // envoyer info au joueur
    this.broadcastToClient(player.sessionId, "afk_attack", {
      target: monster.monsterId,
      damage,
      hpLeft: Math.max(0, monster.currentHp),
    });
  }

  // ----------------------------------------------------
  // MORT DU MONSTRE (XP, GOLD, RESET)
  // ----------------------------------------------------
  private handleMonsterDeath(
    player: PlayerState,
    monster: MonsterState
  ): void {
    monster.isAlive = false;
    monster.isActive = false;
    const xp = monster.xpReward;
    const gold = this.getGoldFromMonster(monster);

    // récompenser le joueur via AFKManager
    this.afkManager.addKill(player.profileId, xp, gold);

    this.broadcastToClient(player.sessionId, "afk_monster_killed", {
      monster: monster.monsterId,
      xp,
      gold,
    });

    console.log(
      `🪓 [AFK] ${player.characterName} tue ${monster.name} (+${xp} XP, +${gold} or)`
    );

    // respawn du monstre
    monster.setHp(monster.maxHp);
    monster.isAlive = true;
    monster.isActive = true;
  }

  // ----------------------------------------------------
  // MORT DU JOUEUR EN AFK
  // ----------------------------------------------------
  private handlePlayerDeath(player: PlayerState): void {
    player.isDead = true;
    this.afkManager.addDeath(player.profileId);

    this.broadcastToClient(player.sessionId, "afk_player_dead", {
      message: "You died during AFK combat.",
    });

    console.log(`💀 [AFK] ${player.characterName} est mort en AFK`);

    // Respawn immédiat (option configurable)
    player.hp = player.maxHp;
    player.isDead = false;
  }

  // ----------------------------------------------------
  // CALCUL OR DROPPÉ PAR LE MONSTRE
  // ----------------------------------------------------
  private getGoldFromMonster(monster: MonsterState): number {
    return Math.floor(monster.level * 2 + Math.random() * 4);
  }
}
