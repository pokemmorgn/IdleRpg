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
}
