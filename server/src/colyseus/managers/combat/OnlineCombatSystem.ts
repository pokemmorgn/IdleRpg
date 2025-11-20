import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";
import { GameState } from "../../schema/GameState";

import { TargetSelector } from "./TargetSelector";
import { SkillRotation } from "./SkillRotation";
import { SkillExecutor } from "./SkillExecutor";
import { AutoAttackController } from "./AutoAttackController";

export class OnlineCombatSystem {

    constructor(
        private gameState: GameState,
        private broadcast: (sessionId: string, type: string, data: any) => void
    ) {}

    /**
     * TICK PRINCIPAL DU COMBAT ONLINE
     */
    update(player: PlayerState, deltaTime: number) {
        if (player.isAFK || player.isDead) return;

        // Reset si le joueur bouge
        if (player.isMoving) {
            this.cancelSoftLocks(player);
            return;
        }

        // Détection de combat
        if (!player.inCombat) {
            this.tryStartCombat(player);
            return;
        }

        // Récupérer la cible
        const monster = this.gameState.monsters.get(player.targetMonsterId);
        if (!monster || monster.isDead || !monster.isAlive) {
            this.stopCombat(player);
            return;
        }

        // Update du combat
        this.updateCombat(player, monster, deltaTime);
    }


    // -------------------------------------------------------
    // DÉMARRAGE DU COMBAT ONLINE
    // -------------------------------------------------------

    private tryStartCombat(player: PlayerState) {
        const target = TargetSelector.getNearestInRange(player, this.gameState.monsters, player.detectionRange);

        if (!target) return;

        this.startCombat(player, target);
    }

    private startCombat(player: PlayerState, monster: MonsterState) {
        player.inCombat = true;
        player.targetMonsterId = monster.monsterId;
        player.gcdRemaining = 0;
        player.castLockRemaining = 0;
        player.animationLockRemaining = 0;
        player.queuedSkill = null;

        monster.targetPlayerId = player.sessionId;

        this.broadcast(player.sessionId, "combat_start", {
            monsterId: monster.monsterId,
            playerHP: player.hp,
            monsterHP: monster.hp,
        });

        console.log(`⚔️ [Online] ${player.characterName} engage ${monster.name}`);
    }


    // -------------------------------------------------------
    // UPDATE DU COMBAT
    // -------------------------------------------------------

    private updateCombat(player: PlayerState, monster: MonsterState, dt: number) {

        // 1. Vérifier distance
        const distance = this.dist(player, monster);
        if (distance > player.chaseRange) {
            this.stopCombat(player);
            return;
        }

        // 2. Gérer les timers
        this.updateTimers(player, dt);

        // 3. Déplacements du joueur si besoin
        if (this.shouldMoveCloser(player, monster)) {
            this.moveToward(player, monster, dt);
            return;
        }

        // 4. Cast en cours ?
        if (player.castLockRemaining > 0) {
            // Si la cible sort de portée pendant le casting → annuler
            if (!SkillExecutor.targetInCastRange(player, monster)) {
                this.cancelCast(player);
            }
            return; // impossible de lancer autre chose
        }

        // 5. Animation lock ?
        if (player.animationLockRemaining > 0) {
            return; // on attend la fin du lock
        }

        // 6. Priorité auto-attack ?
        if (AutoAttackController.shouldTrigger(player)) {
            AutoAttackController.perform(player, monster, this.broadcast);
            return;
        }

        // 7. Choisir un skill via la rotation
        const bestSkill = SkillRotation.chooseSkill(player, monster);

        if (!bestSkill) return;

        // 8. Vérifier portée du skill
        if (!SkillExecutor.isInRange(player, monster, bestSkill)) return;

        // 9. Lancer le skill
        SkillExecutor.cast(player, monster, bestSkill, this.broadcast);
    }


    // -------------------------------------------------------
    // GESTION DES TIMERS
    // -------------------------------------------------------

    private updateTimers(player: PlayerState, dt: number) {
        if (player.gcdRemaining > 0)
            player.gcdRemaining = Math.max(0, player.gcdRemaining - dt);

        if (player.castLockRemaining > 0)
            player.castLockRemaining = Math.max(0, player.castLockRemaining - dt);

        if (player.animationLockRemaining > 0)
            player.animationLockRemaining = Math.max(0, player.animationLockRemaining - dt);

        AutoAttackController.updateTimer(player, dt);
    }


    // -------------------------------------------------------
    // CONDITIONS DE DÉPLACEMENT
    // -------------------------------------------------------

    private shouldMoveCloser(player: PlayerState, monster: MonsterState): boolean {
        const dist = this.dist(player, monster);

        const nextSkill = SkillRotation.peekNextSkill(player, monster);
        if (!nextSkill) return dist > player.weaponRange; // fallback to auto-attack range

        return dist > nextSkill.range;
    }

    private moveToward(player: PlayerState, monster: MonsterState, dt: number) {
        const dx = monster.posX - player.posX;
        const dy = monster.posY - player.posY;
        const dz = monster.posZ - player.posZ;

        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist === 0) return;

        const speed = player.moveSpeed * (dt / 1000);

        player.posX += (dx / dist) * speed;
        player.posY += (dy / dist) * speed;
        player.posZ += (dz / dist) * speed;
    }


    // -------------------------------------------------------
    // ANNULATIONS
    // -------------------------------------------------------

    private cancelSoftLocks(player: PlayerState) {
        if (player.castLockRemaining > 0 && player.currentAnimationLockType === "soft") {
            this.cancelCast(player);
        }
    }

    private cancelCast(player: PlayerState) {
        player.castLockRemaining = 0;
        player.animationLockRemaining = 0;
        player.currentCastingSkillId = "";
        this.broadcast(player.sessionId, "cast_cancelled", {});
    }


    // -------------------------------------------------------
    // FIN DE COMBAT
    // -------------------------------------------------------

    private stopCombat(player: PlayerState) {
        player.inCombat = false;
        player.targetMonsterId = "";
        player.castLockRemaining = 0;
        player.animationLockRemaining = 0;
        player.gcdRemaining = 0;
        player.queuedSkill = null;

        this.broadcast(player.sessionId, "combat_stop", {});
    }


    // -------------------------------------------------------
    // UTILS
    // -------------------------------------------------------

    private dist(a: PlayerState, b: MonsterState) {
        return Math.sqrt(
            (a.posX - b.posX)**2 +
            (a.posY - b.posY)**2 +
            (a.posZ - b.posZ)**2
        );
    }
}
