import { GameState } from "../../schema/GameState";
import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";
import { CombatEventCallbacks } from "./CombatEventCallbacks";

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

        // === ACQUISITION DE CIBLE ===
        if (!monster.targetPlayerId) {
            const nearest = this.findNearestPlayer(monster, 25);
            if (nearest) {
                monster.targetPlayerId = nearest.sessionId;
            }
        }

        const target = monster.targetPlayerId
            ? this.gameState.players.get(monster.targetPlayerId)
            : null;

        if (!target || target.isDead) {
            monster.targetPlayerId = "";
            return;
        }

        // Distance check
        const dist = this.getDistance(monster, target);
        if (dist > monster.attackRange) return;

        // Pas prêt
        if (monster.attackTimer < this.MONSTER_ATTACK_COOLDOWN) return;

        // ============================
        //   MONSTER → PLAYER HIT
        // ============================
        const dmg = Math.max(1, monster.attack - target.armor);
        target.hp = Math.max(0, target.hp - dmg);

        // Marquer l’agresseur (pour contre-attaque)
        target.lastAttackerId = monster.monsterId;

        // **NOUVEL EVENT**
        this.cb.onMonsterHit(monster, target, dmg);

        monster.attackTimer = 0;

        // ============================
        //        PLAYER DEATH
        // ============================
        if (target.hp <= 0 && !target.isDead) {
            target.isDead = true;
            target.hp = 0;
            this.cb.onPlayerDeath(target, monster);

            monster.targetPlayerId = "";
        }
    }

    private findNearestPlayer(monster: MonsterState, range: number): PlayerState | null {
        let best: PlayerState | null = null;
        let bestDist = range;

        this.gameState.players.forEach(player => {
            if (player.isDead) return;
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
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }
}
