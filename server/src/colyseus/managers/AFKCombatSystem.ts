import { PlayerState } from "../schema/PlayerState";
import { MonsterState } from "../schema/MonsterState";
import { GameState } from "../schema/GameState";
import { AFKManager } from "./AFKManager";
import { AFKBehaviorManager } from "./AFKBehaviorManager";

export class AFKCombatSystem {

    private readonly MELEE_RANGE = 2.2;
    private readonly MONSTER_MOVE_SPEED = 5;   // m/s (modéré, car AFK)
    private readonly DETECTION_RANGE = 40;     // comme online

    constructor(
        private gameState: GameState,
        private afkManager: AFKManager,
        private afkBehavior: AFKBehaviorManager,
        private broadcast: (sessionId: string, type: string, data: any) => void
    ) {}

    /**
     * Tick principal du mode AFK
     */
    update(player: PlayerState, deltaTime: number) {
        if (!player.isAFK || player.isDead) return;

        // Forcer position statique
        this.afkBehavior.enforceStaticPosition(player, player.afkReferencePosition);

        if (!player.inCombat) {
            this.detectAFKCombat(player);
            return;
        }

        const monster = this.gameState.monsters.get(player.targetMonsterId);

        if (!monster || monster.isDead || !monster.isAlive) {
            this.stopAFKCombat(player);
            return;
        }

        this.updateAFKCombat(player, monster, deltaTime);
    }

    /**
     * Détection automatique AFK
     */
    private detectAFKCombat(player: PlayerState) {
        const refPos = player.afkReferencePosition;

        let nearest: MonsterState | null = null;
        let minDist = this.DETECTION_RANGE;

        this.gameState.monsters.forEach(monster => {
            if (!monster.isAlive || monster.isDead) return;

            const d = this.distanceXYZ(
                refPos.x, refPos.y, refPos.z,
                monster.posX, monster.posY, monster.posZ
            );

            if (d < minDist) {
                nearest = monster;
                minDist = d;
            }
        });

        if (nearest) {
            this.startAFKCombat(player, nearest);
        }
    }

    /**
     * Commencer un combat AFK
     */
    private startAFKCombat(player: PlayerState, monster: MonsterState) {
        player.inCombat = true;
        player.attackTimer = 0;
        player.targetMonsterId = monster.monsterId;

        monster.targetPlayerId = player.sessionId;
        monster.attackTimer = 0;

        this.broadcast(player.sessionId, "combat_start", {
            monsterId: monster.monsterId,
            playerHP: player.hp,
            monsterHP: monster.hp
        });

        console.log(`⚔️ [AFK] ${player.characterName} engage ${monster.name}`);
    }

    /**
     * Tick du combat AFK
     */
    private updateAFKCombat(
        player: PlayerState,
        monster: MonsterState,
        deltaTime: number
    ) {
        const ref = player.afkReferencePosition;

        const distance = this.distanceXYZ(
            ref.x, ref.y, ref.z,
            monster.posX, monster.posY, monster.posZ
        );

        // Monstre hors portée ?
        if (distance > this.DETECTION_RANGE) {
            this.stopAFKCombat(player);
            return;
        }

        // Pas a portée → le monstre avance
        if (distance > this.MELEE_RANGE) {
            this.moveMonsterToward(monster, ref, deltaTime);
            return;
        }

        // À portée → attaques
        this.handleAFKAttacks(player, monster, deltaTime);
    }

    /**
     * Attaques AFK (joueur & monstre)
     */
    private handleAFKAttacks(
        player: PlayerState,
        monster: MonsterState,
        deltaTime: number
    ) {
        // Attaque du joueur
        player.attackTimer += deltaTime;
        if (player.attackTimer >= player.attackSpeed * 1000) {
            this.afkHit(player, monster);
            player.attackTimer = 0;
        }

        // Attaque du monstre
        monster.attackTimer += deltaTime;
        const monsterAttackSpeed = 2.5 * (100 / monster.speed);

        if (monster.attackTimer >= monsterAttackSpeed * 1000) {
            this.afkHit(monster, player);
            monster.attackTimer = 0;
        }

        if (monster.hp <= 0) this.killMonsterAFK(player, monster);
        if (player.hp <= 0) this.killPlayerAFK(player);
    }

    /**
     * Calcul et application des dégâts AFK
     */
    private afkHit(attacker: PlayerState | MonsterState, defender: PlayerState | MonsterState) {

        const atk = attacker instanceof PlayerState
            ? attacker.attackPower
            : attacker.attack;

        const reduction = defender instanceof PlayerState
            ? defender.damageReduction
            : Math.min(75, defender.defense * 0.5);

        const dmg = Math.max(1, Math.floor(atk * (1 - reduction / 100)));

        defender.hp = Math.max(0, defender.hp - dmg);

        const attackerId = attacker instanceof PlayerState ? attacker.sessionId : attacker.monsterId;
        const defenderId = defender instanceof PlayerState ? defender.sessionId : defender.monsterId;

        // Broadcast
        this.broadcast(player.sessionId,
            "combat_damage",
            { attackerId, defenderId, damage: dmg, defenderHPLeft: defender.hp }
        );
    }

    /**
     * Mort d'un monstre (AFK → récap AFK)
     */
    private async killMonsterAFK(player: PlayerState, monster: MonsterState) {
        monster.isDead = true;
        monster.isAlive = false;

        const xp = monster.xpReward;
        const gold = this.rollGold(monster);

        console.log(`💀 [AFK] ${monster.name} tué → ${xp} XP, ${gold} or`);

        await this.afkManager.addMonsterKill(player.profileId, xp, gold);

        this.broadcast(player.sessionId, "combat_death", {
            entityId: monster.monsterId,
            isPlayer: false
        });

        this.stopAFKCombat(player);
    }

    /**
     * Mort du joueur en AFK
     */
    private async killPlayerAFK(player: PlayerState) {
        player.isDead = true;
        player.inCombat = false;
        player.hp = 0;

        this.broadcast(player.sessionId, "combat_death", {
            entityId: player.sessionId,
            isPlayer: true
        });

        await this.afkManager.addDeath(player.profileId);
    }

    /**
     * Fin de combat
     */
    private stopAFKCombat(player: PlayerState) {
        player.inCombat = false;
        player.targetMonsterId = "";
    }

    /**
     * Déplacement du monstre vers la pos AFK
     */
    private moveMonsterToward(
        monster: MonsterState,
        ref: { x: number; y: number; z: number },
        deltaTime: number
    ) {
        const dx = ref.x - monster.posX;
        const dy = ref.y - monster.posY;
        const dz = ref.z - monster.posZ;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 0.0001) return;

        const move = this.MONSTER_MOVE_SPEED * (deltaTime / 1000);

        monster.posX += (dx / dist) * move;
        monster.posY += (dy / dist) * move;
        monster.posZ += (dz / dist) * move;
    }

    /**
     * Drop d'or AFK
     */
    private rollGold(monster: MonsterState) {
        const min = monster.level * 5;
        const max = monster.level * 15;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private distanceXYZ(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) {
        return Math.sqrt(
            (x2 - x1) ** 2 +
            (y2 - y1) ** 2 +
            (z2 - z1) ** 2
        );
    }
}
