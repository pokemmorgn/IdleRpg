import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";
import { CombatUtils } from "./CombatUtils"; // <-- Importer CombatUtils

export class AutoAttackController {

    static shouldTrigger(player: PlayerState): boolean {

        if (!player.inCombat) return false;

        // MODIFIÉ : Bloquer l'AA uniquement pendant un "full lock"
        if (CombatUtils.isFullyLocked(player)) return false;

        // auto-attack basée sur attackSpeed (déjà calculée via PlayerStatsCalculator)
        if (player.autoAttackTimer < player.attackSpeed * 1000) return false;

        return true;
    }

    // MODIFIÉ : Ajouter le broadcast pour la notification
    static trigger(
        player: PlayerState, 
        monster: MonsterState, 
        broadcast: (sessionId: string, type: string, data: any) => void
    ): number {
        // Dégâts physiques basiques
        const dmg = Math.max(1, player.attackPower);

        monster.setHp(monster.hp - dmg);

        // Reset AA timer
        player.autoAttackTimer = 0;

        // Notifier le client de l'auto-attaque
        broadcast(player.sessionId, "auto_attack", {
            targetId: monster.monsterId,
            damage: dmg,
            hpLeft: monster.hp
        });

        return dmg;
    }

    // La méthode updateTimer est maintenant gérée dans PlayerState.updateCombatTimers
    // et peut être supprimée d'ici si elle existe encore.
    static updateTimer(player: PlayerState, dt: number) {
        // Cette méthode est obsolète car la logique est dans PlayerState
        player.autoAttackTimer += dt;
    }
}
