import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";

export interface CombatEventCallbacks {

    // =====================================================================
    // 🎯 PLAYER → MONSTER (SKILL)
    // =====================================================================
    onPlayerSkillHit(
        player: PlayerState,
        monster: MonsterState,
        damage: number,
        crit: boolean,
        skillId: string
    ): void;

    // =====================================================================
    // 🗡 PLAYER → MONSTER (AUTO-ATTACK)
    // =====================================================================
    onPlayerHit(
        player: PlayerState,
        monster: MonsterState,
        damage: number,
        crit: boolean,
        skillId?: string
    ): void;

    // =====================================================================
    // 👹 MONSTER → PLAYER
    // =====================================================================
    onMonsterHit(
        monster: MonsterState,
        player: PlayerState,
        damage: number
    ): void;

    // =====================================================================
    // 💀 DEATH EVENTS
    // =====================================================================
    onMonsterDeath(
        monster: MonsterState,
        killerPlayer: PlayerState
    ): void;

    onPlayerDeath(
        player: PlayerState,
        killerMonster: MonsterState
    ): void;

    // =====================================================================
    // 🎬 CAST EVENTS
    // =====================================================================
    onCastStart(player: PlayerState, skillId: string): void;

    onCastCancel(player: PlayerState, reason: string): void;

    // Nouveau : cast terminé
    onCastEnd?(player: PlayerState, skillId: string): void;

    // Nouveau : cast interrompu (silence, stun, knockback…)
    onCastInterrupted?(player: PlayerState, skillId: string, reason: string): void;

    // =====================================================================
    // 🩹 HEAL & BUFF
    // =====================================================================
    onPlayerHeal?(player: PlayerState, amount: number, skillId: string): void;

    onApplyBuff?(
        player: PlayerState,
        buffId: string,
        duration: number
    ): void;

    onBuffRefresh?(
        player: PlayerState,
        buffId: string,
        newDuration: number
    ): void;

    onBuffExpire?(
        player: PlayerState,
        buffId: string
    ): void;

    // =====================================================================
    // 🛡 SHIELDS
    // =====================================================================
    onShieldApplied?(
        player: PlayerState,
        shieldId: string,
        amount: number
    ): void;

    onShieldBroken?(
        player: PlayerState,
        shieldId: string
    ): void;

    // =====================================================================
    // 🔥 DOT / HOT
    // =====================================================================
    onDotTick?(
        applier: PlayerState | MonsterState,
        target: PlayerState | MonsterState,
        dotId: string,
        amount: number
    ): void;

    onHotTick?(
        applier: PlayerState,
        target: PlayerState,
        hotId: string,
        amount: number
    ): void;

    // =====================================================================
    // 🎯 ACCURACY / DEFENSE
    // =====================================================================
    onMiss?(
        attacker: PlayerState | MonsterState,
        defender: PlayerState | MonsterState,
        skillId?: string
    ): void;

    onDodge?(
        attacker: PlayerState | MonsterState,
        defender: PlayerState | MonsterState,
        skillId?: string
    ): void;

    onParry?(
        attacker: PlayerState | MonsterState,
        defender: PlayerState | MonsterState,
        skillId?: string
    ): void;

    onBlock?(
        attacker: PlayerState | MonsterState,
        defender: PlayerState | MonsterState,
        reducedDamage: number,
        skillId?: string
    ): void;

    onCrit?(
        attacker: PlayerState | MonsterState,
        defender: PlayerState | MonsterState,
        extraDamage: number,
        skillId?: string
    ): void;

    // =====================================================================
    // 🎯 TARGETING
    // =====================================================================
    onTargetChanged?(
        player: PlayerState,
        newTarget: MonsterState | null
    ): void;

    // =====================================================================
    // 🔥 AGGRO / THREAT
    // =====================================================================
    onAggro?(
        monster: MonsterState,
        player: PlayerState
    ): void;

    onThreatUpdate?(
        monster: MonsterState,
        player: PlayerState,
        threat: number
    ): void;

    onThreatLost?(monster: MonsterState): void;

    // =====================================================================
    // ⚔️ COMBAT FLOW
    // =====================================================================
    onCombatStart?(
        player: PlayerState,
        target: MonsterState | PlayerState
    ): void;

    onCombatEnd?(
        player: PlayerState
    ): void;

    // =====================================================================
    // 🤯 CROWD CONTROL (CC)
    // =====================================================================

    // Stun, root, silence, fear, freeze, slow, knockback, snare, disarm…
    onApplyCC?(
        target: PlayerState | MonsterState,
        ccType: string,
        duration: number
    ): void;

    onBreakCC?(
        target: PlayerState | MonsterState,
        ccType: string
    ): void;

    // Purge (supprimer buffs) / Dispel (supprimer debuffs)
    onDispel?(
        caster: PlayerState,
        target: PlayerState | MonsterState,
        removedEffects: string[]
    ): void;

    // =====================================================================
    // 🔄 RESPawn
    // =====================================================================
    onPlayerRespawn?(player: PlayerState): void;

    onMonsterRespawn?(monster: MonsterState): void;
}
