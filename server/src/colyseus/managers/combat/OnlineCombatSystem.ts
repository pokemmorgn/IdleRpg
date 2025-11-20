import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";
import { GameState } from "../../schema/GameState";

import { TargetSelector } from "./TargetSelector";
import { SkillRotation } from "./SkillRotation";
import { SkillExecutor } from "./SkillExecutor";
import { AutoAttackController } from "./AutoAttackController";

export class OnlineCombatSystem {

    private readonly DETECTION_RANGE = 40;
    // La spécification dit "poursuite sans limite", donc CHASE_RANGE n'est plus utilisé pour le leash.
    private readonly ATTACK_RANGE = 3; // fallback melee range

    constructor(
        private readonly gameState: GameState,
        private readonly broadcast: (sessionId: string, type: string, data: any) => void
    ) {}

    /**
     * Trouve et assigne la meilleure cible pour le joueur.
     * Priorité : 1. Dernier attaquant, 2. Cible manuelle si valide, 3. Monstre le plus proche.
     * @param player Le joueur qui a besoin d'une cible.
     * @returns Le monstre ciblé, ou null si aucune cible n'est trouvée.
     */
    private acquireTarget(player: PlayerState): MonsterState | null {
        let target: MonsterState | null = null;

        // 1. Priorité la plus haute : contre-attaquer le dernier agresseur
        if (player.lastAttackerId) {
            const attacker = this.gameState.monsters.get(player.lastAttackerId);
            if (attacker && attacker.isAlive) {
                target = attacker;
                // On efface l'agresseur une fois qu'on a répondu
                player.lastAttackerId = "";
            }
        }

        // 2. Si pas de contre-attaque, vérifier la cible manuelle existante
        if (!target && player.targetMonsterId) {
            const manualTarget = this.gameState.monsters.get(player.targetMonsterId);
            if (manualTarget && manualTarget.isAlive) {
                target = manualTarget;
            }
        }
        
        // 3. Sinon, cibler automatiquement le monstre le plus proche
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
            // Si aucune cible trouvée, on sort du combat
            player.inCombat = false;
            player.targetMonsterId = "";
        }

        return target;
    }

    update(player: PlayerState, dt: number) {

        // anti-mouvement (soft replace isMoving)
        const isMoving = (Date.now() - player.lastMovementTime) < 150;

        // Annuler les soft-locks si le joueur bouge
        if (isMoving && player.currentAnimationLockType === "soft") {
            player.castLockRemaining = 0;
            player.currentCastingSkillId = "";
            player.animationLockRemaining = 0;
            player.currentAnimationLockType = "none";
            
            this.broadcast(player.sessionId, "cast_cancelled", {
                reason: "movement"
            });
        }

        if (player.isDead || player.isAFK) return;

        // Logique de ciblage et d'entrée en combat
        let monster = this.gameState.monsters.get(player.targetMonsterId);

        // Si pas en combat, ou si la cible actuelle est invalide, on essaie d'en trouver une nouvelle.
        if (!player.inCombat || !monster || !monster.isAlive) {
            if (isMoving) {
                // Si on bouge et qu'on a pas de cible, on ne fait rien.
                player.inCombat = false;
                player.targetMonsterId = "";
                return;
            }
            // Tenter d'acquérir une nouvelle cible
            monster = this.acquireTarget(player);
            if (!monster) {
                return; // Pas de cible trouvée, on ne fait rien
            }
        }
        
        // À ce stade, on a une cible valide (`monster`)
        
        // Le leash est retiré selon la spec "poursuite sans limite"
        // La distance ne sert que pour l'attaque

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
        if (this.getDistance(player, monster) <= this.ATTACK_RANGE) {
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
