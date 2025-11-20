import { PlayerState } from "../../schema/PlayerState";

export class AutoAttackController {

    static shouldTrigger(player: PlayerState): boolean {

        if (!player.inCombat) return false;

        // Ne pas AA pendant un cast ou une animation lock
        if (player.castLockRemaining > 0) return false;
        if (player.animationLockRemaining > 0) return false;

        // auto-attack basée sur attackSpeed (déjà calculée via PlayerStatsCalculator)
        if (player.autoAttackTimer < player.attackSpeed * 1000) return false;

        return true;
    }

    static trigger(player: PlayerState, monster: any) {
        // dégâts physiques basiques (placeholder)
        const dmg = Math.max(1, player.attackPower);

        monster.hp = Math.max(0, monster.hp - dmg);

        // reset AA timer
        player.autoAttackTimer = 0;

        return dmg;
    }

    static updateTimer(player: PlayerState, dt: number) {
        player.autoAttackTimer += dt;
    }
}
