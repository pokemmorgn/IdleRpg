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
    // 👹 MONSTER → PLAYER (DAMAGE)
    // =====================================================================
    onMonsterHit(
        monster: MonsterState,
        player: PlayerState,
        damage: number
    ): void;

    // =====================================================================
    // ❤️ HP UPDATE (important pour voir les dégâts reçus)
    // =====================================================================
    onHpUpdate?(player: PlayerState): void;

    // =====================================================================
    // 🎯 ACCURACY / DEFENSE (MONSTER → PLAYER)
    // =====================================================================
    onMiss?(
        monster: MonsterState,
        player: PlayerState,
        skillId?: string
    ): void;

    onDodge?(
        monster: MonsterState,
        player: PlayerState,
        skillId?: string
    ): void;

    onCrit?(
        monster: MonsterState,
        player: PlayerState,
        extraDamage: number,
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

    onCastEnd?(player: PlayerState, skillId: string): void;

    onCastInterrupted?(player: PlayerState, skillId: string, reason: string): void;

    // =====================================================================
    // 🆕 SKILL EXECUTION / COOLDOWN
    // =====================================================================
    onSkillExecute?(
        player: PlayerState,
        skillId: string
    ): void;

    onCooldown?(
        player: PlayerState,
        skillId: string,
        cooldownEnd: number
    ): void;

    // =====================================================================
    // 🩹 HEAL & BUFF
    // =====================================================================
    onPlayerHeal?(
        player: PlayerState,
        amount: number,
        skillId: string
    ): void;

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

    onCombatEnd?(player: PlayerState): void;

    // =====================================================================
    // 🤯 CROWD CONTROL
    // =====================================================================
    onApplyCC?(
        target: PlayerState | MonsterState,
        ccType: string,
        duration: number
    ): void;

    onBreakCC?(
        target: PlayerState | MonsterState,
        ccType: string
    ): void;

    onDispel?(
        caster: PlayerState,
        target: PlayerState | MonsterState,
        removedEffects: string[]
    ): void;

    // =====================================================================
    // 🔄 RESPAWN
    // =====================================================================
    onPlayerRespawn?(player: PlayerState): void;

    onMonsterRespawn?(monster: MonsterState): void;
}
