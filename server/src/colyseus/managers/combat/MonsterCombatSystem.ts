import { GameState } from "../../schema/GameState";
import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";
import { CombatEventCallbacks } from "./CombatEventCallbacks";
import { CombatUtils } from "./CombatUtils";

export class MonsterCombatSystem {

    private readonly MONSTER_ATTACK_COOLDOWN = 2000;
    private readonly AGGRO_RANGE = 25;

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

        // Aucun target ? → chercher un joueur
        if (!monster.targetPlayerId) {
            const nearest = this.findNearestPlayer(monster, this.AGGRO_RANGE);
            if (nearest) {
                monster.targetPlayerId = nearest.sessionId;

                // Event AGGRO
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
        if (dist > monster.attackRange) return;

        // ======================================================
        // ⏳ 3) CD ATTAQUE
        // ======================================================
        if (monster.attackTimer < this.MONSTER_ATTACK_COOLDOWN) return;

        monster.attackTimer = 0;

        // ======================================================
        // 🧮 4) CALCUL HIT / MISS / DODGE / CRIT / BLOCK
        // ======================================================

        // → Mécaniques légères, juste hooks
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
        let isCrit = false;

        if (roll > 0.92) { // 8% crit
            dmg *= 1.5;
            isCrit = true;
            this.cb.onCrit?.(monster, target, dmg);
        }

        // ======================================================
        // 💥 5) APPLY DAMAGE
        // ======================================================
        target.hp = Math.max(0, target.hp - dmg);
        target.lastAttackerId = monster.monsterId;

        // MONSTER → PLAYER EVENT
        this.cb.onMonsterHit(monster, target, dmg);

        this.cb.onThreatUpdate?.(monster, target, dmg);

        // HP UPDATE
        this.cb.onPlayerHeal?.(target, 0, ""); // facultatif, on peut créer une méthode : onHpChanged

        // ======================================================
        // 💀 6) PLAYER DEATH
        // ======================================================
        if (target.hp <= 0 && !target.isDead) {
            target.isDead = true;
            target.hp = 0;

            this.cb.onPlayerDeath(target, monster);

            // perte d'aggro
            this.cb.onThreatLost?.(monster);

            monster.targetPlayerId = "";
        }
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
