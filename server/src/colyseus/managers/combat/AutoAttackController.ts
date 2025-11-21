import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";
import { CombatUtils } from "./CombatUtils";
import { CombatEventCallbacks } from "./CombatEventCallbacks";

export class AutoAttackController {

    // Peut-on auto-attaquer ?
    static shouldTrigger(player: PlayerState): boolean {

        if (!player.inCombat) return false;

        // Bloqué uniquement en full-lock
        if (CombatUtils.isFullyLocked(player)) return false;

        // Attack speed
        if (player.autoAttackTimer < player.attackSpeed * 1000) return false;

        return true;
    }

    // AUTO-ATTAQUE → renvoie le damage appliqué
    static trigger(
        player: PlayerState,
        monster: MonsterState,
        cb: CombatEventCallbacks
    ): number {

        const dmg = Math.max(1, player.attackPower);

        monster.setHp(monster.hp - dmg);
        monster.targetPlayerId = player.profileId;

        // Reset du timer AA
        player.autoAttackTimer = 0;

        // 👉 On délègue au système global
        cb.onPlayerHit(player, monster, dmg, false, undefined);

        return dmg;
    }
}
