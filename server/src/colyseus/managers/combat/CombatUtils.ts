import { PlayerState } from "../../schema/PlayerState";

export class CombatUtils {
    /**
     * Vérifie si le joueur est dans un état qui empêche toute action (compétence, AA).
     * @param player 
     * @returns true si le joueur est en train de caster ou sous un animation lock.
     */
    static isLockedForActions(player: PlayerState): boolean {
        return player.castLockRemaining > 0 || player.animationLockRemaining > 0;
    }

    /**
     * Vérifie si le mouvement du joueur doit annuler son action actuelle.
     * @param player 
     * @returns true si le joueur est sous un "soft lock".
     */
    static shouldCancelOnMovement(player: PlayerState): boolean {
        return player.currentAnimationLockType === "soft";
    }
    
        /**
     * Vérifie si le joueur est sous un "full lock", ce qui empêche même les auto-attaques.
     * @param player 
     * @returns true si le joueur est en train de caster (full lock) ou sous un animation lock de type "full".
     */
    static isFullyLocked(player: PlayerState): boolean {
    // Un cast est toujours un full lock
    if (player.castLockRemaining > 0) return true;
    
    // Vérifie le type de lock d'animation
    return player.currentAnimationLockType === "full";
}
}
