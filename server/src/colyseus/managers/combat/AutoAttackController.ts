import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";

export class AutoAttackController {

    /**
     * Vérifie si une auto-attaque doit partir maintenant.
     */
    static shouldTrigger(player: PlayerState): boolean {
    
        if (!player.inCombat) return false;
    
        if (player.castLockRemaining > 0) return false;
    
        if (player.animationLockRemaining > 0) return false;
    
        // attackSpeed = weapon speed final (calculé par PlayerStatsCalculator)
        if (player.autoAttackTimer < player.attackSpeed * 1000) return false;
    
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
        player.autoAttackTimer += dt;
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
