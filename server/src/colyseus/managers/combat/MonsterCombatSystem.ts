import { GameState } from "../../schema/GameState";
import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";
import { CombatEventCallbacks } from "./CombatEventCallbacks";
import { CombatUtils } from "./CombatUtils";

export class MonsterCombatSystem {

    private readonly MONSTER_ATTACK_COOLDOWN = 2000;

    constructor(
        private readonly gameState: GameState,
        private readonly cb: CombatEventCallbacks
    ) {}

    update(dt: number) {
        this.gameState.monsters.forEach(monster => {
            if (monster.isDead) {
                this.updateRespawn(monster, dt);
                return;
            }
            this.updateMonster(monster, dt);
        });
    }

    // ======================================================
    // 🔄 RESPAWN HANDLER
    // ======================================================
    private updateRespawn(monster: MonsterState, dt: number) {

        if (!monster.respawnOnDeath) return;

        monster.respawnTimer += dt;

        if (monster.respawnTimer >= monster.respawnTime * 1000) {

            monster.respawnTimer = 0;

            // Reset vie
            monster.hp = monster.maxHp;
            monster.isAlive = true;
            monster.isDead = false;

            // Reset combat
            monster.targetPlayerId = "";

            // Retour au spawn
            monster.posX = monster.spawnX;
            monster.posZ = monster.spawnZ;

            this.cb.onMonsterRespawn?.(monster);
        }
    }

    // ======================================================
    // 🧠 IA PRINCIPALE
    // ======================================================
    private updateMonster(monster: MonsterState, dt: number) {

        monster.attackTimer += dt;

        // ======================================================
        // 1) ACQUISITION / VALIDATION DE LA CIBLE
        // ======================================================
        if (!monster.targetPlayerId) {
            const nearest = this.findNearestPlayer(monster, monster.aggroRange);
            if (nearest) {
                monster.targetPlayerId = nearest.sessionId;
                this.cb.onAggro?.(monster, nearest);
            }
        }

        let target = monster.targetPlayerId
            ? this.gameState.players.get(monster.targetPlayerId)
            : null;

        // Si la cible n'est plus valide → retour au spawn
        if (!target || !CombatUtils.isValidTarget(target)) {
            monster.targetPlayerId = "";
            this.returnToSpawn(monster, dt);
            return;
        }

        // ======================================================
        // 2) DISTANCE
        // ======================================================
        const dist = this.getDistance(monster, target);

        // Trop loin → LOSE AGGRO + retour au spawn
        if (dist > monster.leashRange) {
            monster.targetPlayerId = "";
            this.cb.onThreatLost?.(monster);
            this.returnToSpawn(monster, dt);
            return;
        }

        // ======================================================
        // 3) CHASE
        // ======================================================
        if (dist > monster.attackRange) {
            this.chase(monster, target, dt);
            return;
        }

        // ======================================================
        // 4) ATTACK
        // ======================================================
        if (monster.attackTimer >= this.MONSTER_ATTACK_COOLDOWN) {

            monster.attackTimer = 0;

            const roll = Math.random();

            if (roll < 0.05) {
                this.cb.onMiss?.(monster, target);
                return;
            }

            if (roll < 0.10) {
                this.cb.onDodge?.(monster, target);
                return;
            }

            let dmg = Math.max(1, monster.attack - target.armor);
            const isCrit = roll > 0.92;
            if (isCrit) dmg *= 1.5;

            target.hp = Math.max(0, target.hp - dmg);
            target.lastAttackerId = monster.monsterId;

            this.cb.onMonsterHit(monster, target, dmg);
            this.cb.onThreatUpdate?.(monster, target, dmg);

            if (target.hp <= 0 && !target.isDead) {
                target.isDead = true;
                target.hp = 0;

                this.cb.onPlayerDeath(target, monster);
                monster.targetPlayerId = "";
                this.cb.onThreatLost?.(monster);
            }
        }
    }

    // ======================================================
    // 🏃‍♂️ CHASE
    // ======================================================
    private chase(monster: MonsterState, target: PlayerState, dt: number) {

        const dx = target.posX - monster.posX;
        const dz = target.posZ - monster.posZ;

        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.001) return;

        const nx = dx / len;
        const nz = dz / len;

        const speed = monster.speed * 0.01;
        const step = speed * (dt / 16);

        monster.posX += nx * step;
        monster.posZ += nz * step;

        monster.rotY = Math.atan2(nz, nx);
    }

    // ======================================================
    // 🏞 RETOUR AU POINT DE SPAWN
    // ======================================================
    private returnToSpawn(monster: MonsterState, dt: number) {

        const dx = monster.spawnX - monster.posX;
        const dz = monster.spawnZ - monster.posZ;

        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.1) {
            // Arrivé
            monster.rotY = 0;
            return;
        }

        const nx = dx / dist;
        const nz = dz / dist;

        const speed = monster.speed * 0.008;
        const step = speed * (dt / 16);

        monster.posX += nx * step;
        monster.posZ += nz * step;

        monster.rotY = Math.atan2(nz, nx);
    }

    // ======================================================
    // 🔍 TROUVER JOUEUR LE PLUS PROCHE
    // ======================================================
    private findNearestPlayer(monster: MonsterState, range: number): PlayerState | null {
        let best: PlayerState | null = null;
        let bestDist = range;

        this.gameState.players.forEach(player => {
            if (!CombatUtils.isValidTarget(player)) return;

            const d = this.getDistance(monster, player);
            if (d < bestDist) {
                bestDist = d;
                best = player;
            }
        });

        return best;
    }

    private getDistance(a: MonsterState, b: PlayerState): number {
        const dx = a.posX - b.posX;
        const dy = a.posY - b.posY;
        const dz = a.posZ - b.posZ;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}
