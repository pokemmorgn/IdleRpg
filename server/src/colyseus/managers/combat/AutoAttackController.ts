import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";
import { CombatUtils } from "./CombatUtils";
import { CombatEventCallbacks } from "./SkillExecutor"; // <-- même interface

export class AutoAttackController {

    static shouldTrigger(player: PlayerState): boolean {

        if (!player.inCombat) return false;

        // Bloqué uniquement si FULL animation lock
        if (CombatUtils.isFullyLocked(player)) return false;

        // attackSpeed en ms
        if (player.autoAttackTimer < player.attackSpeed * 1000) return false;

        return true;
    }

    static trigger(
        player: PlayerState,
        monster: MonsterState,
        cb: CombatEventCallbacks
    ): number {

        // Dégâts physiques basiques
        const dmg = Math.max(1, player.attackPower);

        monster.setHp(monster.hp - dmg);

        // Reset du timer
        player.autoAttackTimer = 0;

        // Le monstre sait qui l’a tapé
        monster.targetPlayerId = player.sessionId;

        // 🔥 NOUVELLE VERSION : événement normalisé
        cb.onPlayerSkillHit(player, monster, dmg, false, "autoattack");

        return dmg;
    }
}
