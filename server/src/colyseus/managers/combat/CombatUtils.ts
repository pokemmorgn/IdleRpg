import { PlayerState } from "../../schema/PlayerState";

export class CombatUtils {

    // =======================================================
    // 🔒 LOCKS & ACTION PERMISSIONS
    // =======================================================

    /**
     * Le joueur est totalement bloqué :
     * - en plein cast
     * - ou sous un lock "full" d'animation
     */
    static isFullyLocked(player: PlayerState): boolean {
        if (player.castLockRemaining > 0) return true;
        return player.currentAnimationLockType === "full";
    }

    /**
     * Le joueur est bloqué pour lancer une compétence,
     * mais peut encore faire des actions simples
     * (AA si non "full", déplacement, cancel).
     */
    static isLockedForActions(player: PlayerState): boolean {
        return (
            player.castLockRemaining > 0 ||
            player.animationLockRemaining > 0
        );
    }

    /**
     * Le joueur peut-il attaquer automatique ?
     * - pas mort
     * - pas AFK
     * - pas full-lock
     */
    static canAutoAttack(player: PlayerState): boolean {
        if (player.isDead) return false;
        if (player.isAFK) return false;
        if (this.isFullyLocked(player)) return false;
        return true;
    }

    /**
     * Le joueur peut-il lancer un sort ?
     * (ne peut pas s'il cast déjà OU sous full lock)
     */
    static canCast(player: PlayerState): boolean {
        if (player.castLockRemaining > 0) return false;
        if (player.currentAnimationLockType === "full") return false;
        return true;
    }

    /**
     * Le joueur peut-il se déplacer ?
     * (Interdit uniquement en FULL lock)
     */
    static canMove(player: PlayerState): boolean {
        return !this.isFullyLocked(player);
    }

    // =======================================================
    // 🚶 MOVEMENT CANCEL
    // =======================================================

    /**
     * Vérifie si le mouvement du joueur doit annuler
     * cast / skill / animation.
     * 
     * En général :
     * - "soft" = cancel possible sur mouvement
     * - "full" = movement bloqué, donc pas de cancel
     */
    static shouldCancelOnMovement(player: PlayerState): boolean {
        return player.currentAnimationLockType === "soft";
    }

    // =======================================================
    // 👁️ TARGET & VALIDATION
    // =======================================================

    /**
     * Vérifie si le joueur peut être visé par un monstre.
     */
    static isValidTarget(player: PlayerState): boolean {
        if (player.isDead) return false;
        if (player.isAFK) return false;
        return true;
    }

    /**
     * Vérifie si la cible est dans un état qui empêche la prise d'aggro.
     */
    static isUntargetable(player: PlayerState): boolean {
        // Utilisable plus tard pour des skills type "bénédiction", invincible, vanish...
        return false;
    }

    // =======================================================
    // 🔥 CROWD CONTROL HELPERS
    // =======================================================

    /**
     * Le joueur est-il sous un effet de contrôle ?
     */
    static isCC(player: PlayerState): boolean {
        // Placeholder : selon ton système de buffs/debuffs
        // Par exemple : player.activeCCs.size > 0
        return false;
    }

    /**
     * Si le joueur est CC, annule toutes les actions actuelles.
     */
    static cancelOnCC(player: PlayerState) {
        if (!this.isCC(player)) return;

        player.castLockRemaining = 0;
        player.animationLockRemaining = 0;
        player.currentCastingSkillId = "";
        player.currentAnimationLockType = "none";
    }

    // =======================================================
    // 🧮 UTILS
    // =======================================================

    static distance(a: PlayerState, b: { posX: number; posY: number; posZ: number }): number {
        const dx = a.posX - b.posX;
        const dy = a.posY - b.posY;
        const dz = a.posZ - b.posZ;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}
