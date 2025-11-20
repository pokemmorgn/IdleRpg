import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";

export class AutoAttackController {

    /**
     * Vérifie si une auto-attaque doit partir maintenant.
     */
    static shouldTrigger(player: PlayerState): boolean {

        // Auto-attaque inactive si le joueur ne fait pas d’auto-combat
        if (!player.inCombat) return false;

        // Interdite pendant cast time
        if (player.castLockRemaining > 0) return false;

        // Interdite pendant animation lock (full + soft)
        if (player.animationLockRemaining > 0) return false;

        // Timer pas encore prêt
        if (player.autoAttackTimer < player.weaponSpeed * 1000) return false;

        return true;
    }

    /**
     * Lancement de l’auto-attaque.
     */
    static perform(
        player: PlayerState,
        monster: MonsterState,
        broadcast: (sessionId: string, type: string, data: any) => void
    ) {
        // Reset du timer
        player.autoAttackTimer = 0;

        // Calcul des dégâts
        const dmg = Math.max(1, player.attackPower - monster.defense);

        monster.hp = Math.max(0, monster.hp - dmg);

        // Broadcast vers le client
        broadcast(player.sessionId, "auto_attack", {
            targetId: monster.monsterId,
            damage: dmg,
            hpLeft: monster.hp
        });
    }

    /**
     * Mise à jour du timer à chaque tick serveur.
     */
    static updateTimer(player: PlayerState, dt: number) {
        // On stacke le temps même pendant les locks
        player.autoAttackTimer += dt;

        // Mais on ne déclenche que quand les locks sont terminés (shouldTrigger)
    }

    /**
     * Fonction appelée quand un cast ou animation lock termine
     * et qu’une auto attaque était prête.
     */
    static releaseIfReady(
        player: PlayerState,
        monster: MonsterState,
        broadcast: (sessionId: string, type: string, data: any) => void
    ) {
        if (!this.shouldTrigger(player)) return;
        this.perform(player, monster, broadcast);
    }

}
