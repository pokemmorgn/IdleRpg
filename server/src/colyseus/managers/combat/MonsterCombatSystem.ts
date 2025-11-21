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
            if (!monster.isAlive) return;
            this.updateMonster(monster, dt);
        });
    }

    private updateMonster(monster: MonsterState, dt: number) {

        monster.attackTimer += dt;

        // ======================================================
        // 🎯 1) ACQUISITION / VALIDATION DE LA CIBLE
        // ======================================================

        if (!monster.targetPlayerId) {
            const nearest = this.findNearestPlayer(monster, monster.aggroRange);
            if (nearest) {
                monster.targetPlayerId = nearest.sessionId;
                this.cb.onAggro?.(monster, nearest);
            }
        }

        const target = monster.targetPlayerId
            ? this.gameState.players.get(monster.targetPlayerId)
            : null;

        if (!target || !CombatUtils.isValidTarget(target)) {
            monster.targetPlayerId = "";
            return;
        }

        // ======================================================
        // 📏 2) DISTANCE
        // ======================================================
        const dist = this.getDistance(monster, target);

        // Trop loin → LOSE AGGRO
        if (dist > monster.leashRange) {
            monster.targetPlayerId = "";
            this.cb.onThreatLost?.(monster);
            return;
        }

        // ======================================================
        // 🏃‍♂️ 3) CHASE si pas dans l’attackRange
        // ======================================================
        if (dist > monster.attackRange) {
            this.chase(monster, target, dt);
            return;
        }

        // ======================================================
        // 🗡 4) ATTACK si à portée
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
    // 🏃‍♂️ POURSUTE + ROTATION
    // ======================================================
    private chase(monster: MonsterState, target: PlayerState, dt: number) {

        // ta propriété réelle = speed
        const moveSpeed = monster.speed * 0.01; // Ajustable selon ton gameplay
        const step = moveSpeed * (dt / 16);    // dt normalisé pour 60 FPS

        const dx = target.posX - monster.posX;
        const dz = target.posZ - monster.posZ;

        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.001) return;

        const nx = dx / len;
        const nz = dz / len;

        // Déplacement
        monster.posX += nx * step;
        monster.posZ += nz * step;

        // Rotation (Y uniquement)
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

    // ======================================================
    // 📏 DISTANCE
    // ======================================================
    private getDistance(a: MonsterState, b: PlayerState): number {
        const dx = a.posX - b.posX;
        const dy = a.posY - b.posY;
        const dz = a.posZ - b.posZ;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}
