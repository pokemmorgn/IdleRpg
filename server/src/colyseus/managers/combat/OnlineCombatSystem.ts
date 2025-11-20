import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";
import { GameState } from "../../schema/GameState";

import { TargetSelector } from "./TargetSelector";
import { SkillRotation } from "./SkillRotation";
import { SkillExecutor } from "./SkillExecutor";
import { AutoAttackController } from "./AutoAttackController";

export class OnlineCombatSystem {

    private readonly DETECTION_RANGE = 40;
    private readonly CHASE_RANGE = 25;
    private readonly ATTACK_RANGE = 3; // fallback melee range

    constructor(
        private readonly gameState: GameState,
        private readonly broadcast: (sessionId: string, type: string, data: any) => void
    ) {}

    update(player: PlayerState, dt: number) {

        // anti-mouvement (soft replace isMoving)
        const isMoving = (Date.now() - player.lastMovementTime) < 150;

        // Nouvelle fonctionnalité : annuler les soft-locks si le joueur bouge
        if (isMoving && player.currentAnimationLockType === "soft") {
            player.castLockRemaining = 0;
            player.currentCastingSkillId = "";
            player.animationLockRemaining = 0;
            player.currentAnimationLockType = "none";
            
            // Notifier le client que le cast a été annulé
            this.broadcast(player.sessionId, "cast_cancelled", {
                reason: "movement"
            });
        }

        if (player.isDead || player.isAFK) return;

        // Première détection combat
        if (!player.inCombat) {
            if (!isMoving) {
                const target = TargetSelector.getNearestInRange(
                    player,
                    this.gameState.monsters,
                    this.DETECTION_RANGE
                );

                if (target) {
                    player.inCombat = true;
                    player.targetMonsterId = target.monsterId;
                }
            }
            return;
        }

        // Combat actif
        const monster = this.gameState.monsters.get(player.targetMonsterId);

        if (!monster || !monster.isAlive) {
            player.inCombat = false;
            player.targetMonsterId = "";
            return;
        }

        const dist = this.getDistance(player, monster);

        // Leash
        if (dist > this.CHASE_RANGE) {
            player.inCombat = false;
            player.targetMonsterId = "";
            return;
        }

        // Si le joueur est en mouvement, ne pas lancer de nouvelles compétences
        if (isMoving) {
            return;
        }

        // Rotation des skills
        const nextSkill = SkillRotation.getNextSkill(player, monster);

        if (nextSkill) {
            SkillExecutor.tryExecute(player, monster, this.gameState, this.broadcast);
            return;
        }

        // Auto-attaque si aucun skill
        if (dist <= this.ATTACK_RANGE) {
            if (AutoAttackController.shouldTrigger(player)) {
                AutoAttackController.trigger(player, monster);
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
