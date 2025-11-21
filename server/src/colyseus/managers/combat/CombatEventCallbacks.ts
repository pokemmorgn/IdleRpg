import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";

export interface CombatEventCallbacks {

    // ======================================
    // PLAYER → MONSTER (SKILLS)
    // ======================================
    onPlayerSkillHit(
        player: PlayerState,
        monster: MonsterState,
        damage: number,
        crit: boolean,
        skillId: string
    ): void;

    // ======================================
    // PLAYER → MONSTER (AUTO-ATTACK)
    // ======================================
    onPlayerHit(
        player: PlayerState,
        monster: MonsterState,
        damage: number,
        crit: boolean,
        skillId?: string
    ): void;

    // ======================================
    // MONSTER → PLAYER
    // ======================================
    onMonsterHit(
        monster: MonsterState,
        player: PlayerState,
        damage: number
    ): void;

    // ======================================
    // DEATH EVENTS
    // ======================================
    onMonsterDeath(
        monster: MonsterState,
        killerPlayer: PlayerState
    ): void;

    onPlayerDeath(
        player: PlayerState,
        killerMonster: MonsterState
    ): void;

    // ======================================
    // CASTING EVENTS
    // ======================================
    onCastStart(player: PlayerState, skillId: string): void;

    onCastCancel(player: PlayerState, reason: string): void;

    // ======================================
    // HEAL / BUFF
    // ======================================
    onPlayerHeal?(player: PlayerState, amount: number, skillId: string): void;

    onApplyBuff?(
        player: PlayerState,
        buffId: string,
        duration: number
    ): void;
}
