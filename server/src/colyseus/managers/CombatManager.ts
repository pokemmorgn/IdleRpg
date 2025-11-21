import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { MonsterState } from "../schema/MonsterState";

import { OnlineCombatSystem } from "./combat/OnlineCombatSystem";
import { MonsterCombatSystem } from "./combat/MonsterCombatSystem";

import { CombatEventCallbacks } from "./combat/CombatEventCallbacks";
import { CombatNetworkEmitter } from "./combat/CombatNetworkEmitter";

export class CombatManager implements CombatEventCallbacks {

    private onlineSystem: OnlineCombatSystem;
    private monsterSystem: MonsterCombatSystem;
    private net: CombatNetworkEmitter;

    constructor(
        private readonly gameState: GameState,
        private readonly broadcast: (sessionId: string, type: string, data: any) => void
    ) {
        // 🌐 Network emitter
        this.net = new CombatNetworkEmitter(gameState, broadcast);

        // 🧠 Player combat
        this.onlineSystem = new OnlineCombatSystem(
            this.gameState,
            this
        );

        // 👹 Monster AI
        this.monsterSystem = new MonsterCombatSystem(
            this.gameState,
            this
        );
    }

    // ======================================================
    // 🔄 UPDATE MAIN LOOP
    // ======================================================
    update(deltaTime: number) {

        // 1. Monsters
        this.monsterSystem.update(deltaTime);

        // 2. Players
        for (const player of this.gameState.players.values()) {

            player.updateCombatTimers(deltaTime);

            if (player.isDead) continue;

            this.onlineSystem.update(player, deltaTime);
        }
    }

    // ======================================================
    // 🛑 STOP MANUEL
    // ======================================================
    public forceStopCombat(player: PlayerState) {
        player.inCombat = false;
        player.targetMonsterId = "";
    }

    // ======================================================
    // 🔥 COMBAT EVENTS
    // ======================================================

    // PLAYER → MONSTER (auto)
    onPlayerHit(
        player: PlayerState,
        monster: MonsterState,
        damage: number,
        crit: boolean,
        skillId?: string
    ) {
        this.net.emitPlayerHit(player, monster, damage, crit, skillId);
    }

    // PLAYER → MONSTER (skill)
    onPlayerSkillHit(
        player: PlayerState,
        monster: MonsterState,
        damage: number,
        crit: boolean,
        skillId: string
    ) {
        this.net.emitPlayerHit(player, monster, damage, crit, skillId);
    }

    // MONSTER → PLAYER
    onMonsterHit(monster: MonsterState, player: PlayerState, damage: number) {
        this.net.emitMonsterHit(monster, player, damage);
    }

    // MONSTER DEATH
    onMonsterDeath(monster: MonsterState, killer: PlayerState) {
        this.net.emitMonsterDeath(monster, killer);
    }

    // PLAYER DEATH
    onPlayerDeath(player: PlayerState, monster: MonsterState) {
        this.net.emitPlayerDeath(player, monster);
    }

    // CAST START
    onCastStart(player: PlayerState, skillId: string) {
        this.net.emitCastStart(player, skillId, 0); // castTime inconnu → 0 par défaut
    }

    // CAST CANCEL
    onCastCancel(player: PlayerState, reason: string) {
        this.net.emitCastCancel(player, reason);
    }

    // HEAL
    onPlayerHeal(player: PlayerState, amount: number, skillId: string) {
        this.net.emitHeal(player, amount, skillId);
    }

    // BUFF
    onApplyBuff(player: PlayerState, buffId: string, duration: number) {
        this.net.emitBuffApply(player, buffId, duration);
    }
}
