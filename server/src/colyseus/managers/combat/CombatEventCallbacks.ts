import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";

export interface CombatEventCallbacks {

    // === PLAYER → MONSTER ===
    onPlayerHit(
        player: PlayerState,
        monster: MonsterState,
        damage: number,
        crit: boolean,
        skillId?: string
    ): void;

    // === MONSTER → PLAYER ===
    onMonsterHit(
        monster: MonsterState,
        player: PlayerState,
        damage: number
    ): void;

    // === MORT D'UN MONSTRE ===
    onMonsterDeath(
        monster: MonsterState,
        killerPlayer: PlayerState
    ): void;

    // === MORT DU JOUEUR ===
    onPlayerDeath(
        player: PlayerState,
        killerMonster: MonsterState
    ): void;

    // === CASTING DE SORT ===
    onCastStart(
        player: PlayerState,
        skillId: string
    ): void;

    onCastCancel(
        player: PlayerState,
        reason: string
    ): void;
}
