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

    // ======================================================
    // 🎯 Acquisition de cible
    // ======================================================
    private acquireTarget(player: PlayerState): MonsterState | null {

        let target: MonsterState | null = null;

        // 1) Riposte automatique
        if (player.lastAttackerId) {
            const attacker = this.gameState.monsters.get(player.lastAttackerId);
            if (attacker && attacker.isAlive) target = attacker;
            player.lastAttackerId = "";
        }

        // 2) Cible forcée par le joueur
        if (!target && player.targetMonsterId) {
            const manual = this.gameState.monsters.get(player.targetMonsterId);
            if (manual && manual.isAlive) target = manual;
        }

        // 3) Auto-target le plus proche
        if (!target) {
            target = TargetSelector.getNearestInRange(
                player,
                this.gameState.monsters,
                this.DETECTION_RANGE
            );
        }

        // === EVENT TARGET CHANGED ===
        const newTargetId = target ? target.monsterId : null;

        if (player.targetMonsterId !== newTargetId) {
            this.cb.onTargetChanged?.(player, target ?? null);
            player.targetMonsterId = newTargetId ?? "";
        }

        player.inCombat = !!target;
        return target;
    }

    // ======================================================
    // 🔄 MAIN UPDATE LOOP
    // ======================================================
    update(player: PlayerState, dt: number) {

        const isMoving = (Date.now() - player.lastMovementTime) < 150;

        // Annulation du cast si mouvement interdit
        if (isMoving && CombatUtils.shouldCancelOnMovement(player)) {
            if (player.currentCastingSkillId) {
                this.cb.onCastInterrupted?.(player, player.currentCastingSkillId, "movement");
            }

            player.currentCastingSkillId = "";
            player.castLockRemaining = 0;
            player.animationLockRemaining = 0;
            player.currentAnimationLockType = "none";
        }

        if (player.isDead || player.isAFK) return;

        let monster = this.gameState.monsters.get(player.targetMonsterId) || null;

        // ======================================================
        // 🎯 Ciblage ou reciblage
        // ======================================================
        if (!player.inCombat || !monster || !monster.isAlive) {

            if (isMoving) {
                player.inCombat = false;
                player.targetMonsterId = "";
                return;
            }

            monster = this.acquireTarget(player);
            if (!monster) return;

            // === COMBAT START ===
            this.cb.onCombatStart?.(player, monster);
        }

        if (isMoving) return;

        // ======================================================
        // 1) Exécution skill mis en file
        // ======================================================
        if (player.queuedSkill) {
            const done = SkillExecutor.tryExecuteQueuedSkill(
                player, monster, this.gameState, this.cb
            );
            if (done) return;
        }

        // ======================================================
        // 2) Rotation auto
        // ======================================================
        const nextSkill = SkillRotation.getNextSkill(player, monster);

        if (nextSkill) {
            SkillExecutor.tryExecute(
                player,
                monster,
                this.gameState,
                this.cb
            );
            return;
        }

        // ======================================================
        // 3) AUTO-ATTAQUE
        // ======================================================
        if (this.getDistance(player, monster) <= this.ATTACK_RANGE) {

            if (AutoAttackController.shouldTrigger(player)) {

                const damage = AutoAttackController.trigger(player, monster, this.cb);

                // Mort du monstre ?
                if (monster.hp <= 0 && monster.isAlive) {

                    // IMPORTANT : active la logique interne de MonsterState
                    monster.setHp(0);

                    this.cb.onMonsterDeath(monster, player);

                    player.inCombat = false;
                    player.targetMonsterId = "";

                    // === COMBAT END ===
                    this.cb.onCombatEnd?.(player);
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
