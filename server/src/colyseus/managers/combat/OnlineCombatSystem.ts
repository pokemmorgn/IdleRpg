import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";
import { GameState } from "../../schema/GameState";
import { CombatUtils } from "./CombatUtils";
import { TargetSelector } from "./TargetSelector";
import { SkillRotation } from "./SkillRotation";
import { SkillExecutor } from "./SkillExecutor";
import { AutoAttackController } from "./AutoAttackController";

export class OnlineCombatSystem {

    private readonly DETECTION_RANGE = 40;
    private readonly ATTACK_RANGE = 3;

    constructor(
        private readonly gameState: GameState,
        private readonly broadcast: (sessionId: string, type: string, data: any) => void
    ) {}

    private emit(player: PlayerState, type: string, data: any) {
        this.broadcast(player.sessionId, type, data);
    }

    private acquireTarget(player: PlayerState): MonsterState | null {
        let target: MonsterState | null = null;

        if (player.lastAttackerId) {
            const attacker = this.gameState.monsters.get(player.lastAttackerId);
            if (attacker && attacker.isAlive) {
                target = attacker;
            }
            player.lastAttackerId = "";
        }

        if (!target && player.targetMonsterId) {
            const manual = this.gameState.monsters.get(player.targetMonsterId);
            if (manual && manual.isAlive) target = manual;
        }

        if (!target) {
            target = TargetSelector.getNearestInRange(
                player,
                this.gameState.monsters,
                this.DETECTION_RANGE
            );
        }

        if (target) {
            player.targetMonsterId = target.monsterId;
            player.inCombat = true;
        } else {
            player.inCombat = false;
            player.targetMonsterId = "";
        }

        return target;
    }

    update(player: PlayerState, dt: number) {

        const isMoving = (Date.now() - player.lastMovementTime) < 150;

        if (isMoving && CombatUtils.shouldCancelOnMovement(player)) {
            player.castLockRemaining = 0;
            player.currentCastingSkillId = "";
            player.animationLockRemaining = 0;
            player.currentAnimationLockType = "none";

            this.emit(player, "cast_cancelled", { reason: "movement" });
        }

        if (player.isDead || player.isAFK) return;

        let monster = this.gameState.monsters.get(player.targetMonsterId) || null;

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

        // === SKILL FILE QUEUE ===
        if (player.queuedSkill) {
            if (SkillExecutor.tryExecuteQueuedSkill(player, monster, this.gameState, this.broadcast)) {
                return;
            }
        }

        // === SKILL ROTATION ===
        const nextSkill = SkillRotation.getNextSkill(player, monster);
        if (nextSkill) {
            const didCast = SkillExecutor.tryExecute(player, monster, this.gameState, this.broadcast);

            if (didCast) {
                // Log skill hit (higher priority than autoattack)
                this.emit(player, "playerHit", {
                    type: "skill",
                    skillId: nextSkill.skillId,
                    playerId: player.profileId,
                    monsterId: monster.monsterId,
                    remainingHp: monster.hp
                });
            }

            return;
        }

        // === AUTO ATTACK ===
        if (this.getDistance(player, monster) <= this.ATTACK_RANGE) {
            if (AutoAttackController.shouldTrigger(player)) {

                const damage = AutoAttackController.trigger(player, monster, this.broadcast);

                // AJOUT : émission d’un event pour ton HUD
                this.emit(player, "playerHit", {
                    type: "autoattack",
                    damage,
                    playerId: player.profileId,
                    monsterId: monster.monsterId,
                    remainingHp: monster.hp
                });

                // Mort du monstre ?
                if (monster.hp <= 0 && monster.isAlive) {
                    monster.isAlive = false;

                    this.emit(player, "monsterKilled", {
                        monsterId: monster.monsterId,
                        by: player.profileId
                    });

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
