import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";
import { GameState } from "../../schema/GameState";
import { CombatUtils } from "./CombatUtils";
import { TargetSelector } from "./TargetSelector";
import { SkillRotation } from "./SkillRotation";
import { SkillExecutor } from "./SkillExecutor";
import { AutoAttackController } from "./AutoAttackController";
import { CombatEventCallbacks } from "./CombatEventCallbacks";

export class OnlineCombatSystem {

    private readonly DETECTION_RANGE = 40;
    private readonly ATTACK_RANGE = 3;

    constructor(
        private readonly gameState: GameState,
        private readonly cb: CombatEventCallbacks
    ) {}

    // ---------------------------------------
    // CIBLAGE
    // ---------------------------------------
    private acquireTarget(player: PlayerState): MonsterState | null {
        let target: MonsterState | null = null;

        // 1) Riposte si on vient d’être attaqué
        if (player.lastAttackerId) {
            const attacker = this.gameState.monsters.get(player.lastAttackerId);
            if (attacker && attacker.isAlive) target = attacker;
            player.lastAttackerId = "";
        }

        // 2) Cible manuelle
        if (!target && player.targetMonsterId) {
            const manual = this.gameState.monsters.get(player.targetMonsterId);
            if (manual && manual.isAlive) target = manual;
        }

        // 3) Auto-target
        if (!target) {
            target = TargetSelector.getNearestInRange(
                player,
                this.gameState.monsters,
                this.DETECTION_RANGE
            );
        }

        if (target) {
            player.inCombat = true;
            player.targetMonsterId = target.monsterId;
        } else {
            player.inCombat = false;
            player.targetMonsterId = "";
        }

        return target;
    }

    // ---------------------------------------
    // UPDATE PRINCIPAL
    // ---------------------------------------
    update(player: PlayerState, dt: number) {

        const isMoving = (Date.now() - player.lastMovementTime) < 150;

        // Cast annulé par le mouvement
        if (isMoving && CombatUtils.shouldCancelOnMovement(player)) {
            player.castLockRemaining = 0;
            player.currentCastingSkillId = "";
            player.animationLockRemaining = 0;
            player.currentAnimationLockType = "none";

            this.cb.onCastCancel(player, "movement");
        }

        if (player.isDead || player.isAFK) return;

        let monster = this.gameState.monsters.get(player.targetMonsterId) || null;

        // Recalcul ciblage
        if (!player.inCombat || !monster || !monster.isAlive) {
            if (isMoving) {
                player.inCombat = false;
                player.targetMonsterId = "";
                return;
            }

            monster = this.acquireTarget(player);
            if (!monster) return;
        }

        if (isMoving) return;

        // ====================
        // 1) QUEUED SKILL
        // ====================
        if (player.queuedSkill) {
            const result = SkillExecutor.tryExecuteQueuedSkill(
                player, monster, this.gameState, this.cb
            );
            if (result) return;
        }

        // ====================
        // 2) ROTATION BASIQUE
        // ====================
        const nextSkill = SkillRotation.getNextSkill(player, monster);

        if (nextSkill) {
            SkillExecutor.tryExecute(
                player,
                monster,
                this.gameState,
                this.cb
            );

            return; // 💡 SkillExecutor déclenche déjà les logs → pas besoin de onPlayerHit
        }

        // ====================
        // 3) AUTO-ATTAQUE
        // ====================
        if (this.getDistance(player, monster) <= this.ATTACK_RANGE) {
            if (AutoAttackController.shouldTrigger(player)) {

                const damage = AutoAttackController.trigger(player, monster, this.cb);

                // Mort du monstre ?
                if (monster.hp <= 0 && monster.isAlive) {
                    monster.isAlive = false;

                    this.cb.onMonsterDeath(monster, player);

                    player.inCombat = false;
                    player.targetMonsterId = "";
                }
            }
        }
    }

    private getDistance(a: PlayerState, b: MonsterState): number {
        const dx = a.posX - b.posX;
        const dy = a.posY - b.posY;
        const dz = a.posZ - b.posZ;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}
