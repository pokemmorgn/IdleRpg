import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { MonsterState } from "../schema/MonsterState";

import { OnlineCombatSystem } from "./combat/OnlineCombatSystem";
import { MonsterCombatSystem } from "./combat/MonsterCombatSystem";

import { CombatLogManager } from "./CombatLogManager";
import { CombatEventCallbacks } from "./combat/CombatEventCallbacks";

export class CombatManager implements CombatEventCallbacks {

    private onlineSystem: OnlineCombatSystem;
    private monsterSystem: MonsterCombatSystem;
    private logs: CombatLogManager;

    constructor(
        private readonly gameState: GameState,
        private readonly broadcast: (sessionId: string, type: string, data: any) => void
    ) {
        // -------------------------------
        // 📘 CombatLogManager
        // -------------------------------
        this.logs = new CombatLogManager(this.gameState, this.broadcast);

        // -------------------------------
        // 🧠 Online Combat System (joueur)
        // -------------------------------
        this.onlineSystem = new OnlineCombatSystem(
            this.gameState,
            this // <-- CombatManager implémente TOUTES les callbacks
        );

        // -------------------------------
        // 👹 AI Combat (monstres)
        // -------------------------------
        this.monsterSystem = new MonsterCombatSystem(
            this.gameState,
            this // <-- idem ici
        );
    }

    // ======================================================
    // 🔄 MAIN UPDATE LOOP
    // ======================================================
    update(deltaTime: number) {

        // 1. IA Monstres
        this.monsterSystem.update(deltaTime);

        // 2. Joueurs : cast / gcd / auto / skills
        for (const player of this.gameState.players.values()) {

            player.updateCombatTimers(deltaTime);

            if (player.isDead) continue;

            this.onlineSystem.update(player, deltaTime);
        }
    }

    // ======================================================
    // 🛑 STOP MANUEL (si besoin)
    // ======================================================
    public forceStopCombat(player: PlayerState) {
        player.inCombat = false;
        player.targetMonsterId = "";
    }

    // ======================================================
    // 🔥 CombatEventCallbacks IMPLEMENTATION
    // ======================================================

    // ---------------------------------------
    // 🗡️ PLAYER → MONSTER (auto-attack)
    // ---------------------------------------
    onPlayerHit(
        player: PlayerState,
        monster: MonsterState,
        damage: number,
        crit: boolean,
        skillId?: string
    ): void {
        if (crit) {
            this.logs.crit(player, monster, damage, skillId);
        } else {
            this.logs.hit(player, monster, damage, skillId);
        }
    }

    // ---------------------------------------
    // ☄️ PLAYER → MONSTER (skill)
    // ---------------------------------------
    onPlayerSkillHit(
        player: PlayerState,
        monster: MonsterState,
        damage: number,
        crit: boolean,
        skillId: string
    ): void {
        if (crit) {
            this.logs.crit(player, monster, damage, skillId);
        } else {
            this.logs.hit(player, monster, damage, skillId);
        }
    }

    // ---------------------------------------
    // 🩹 HEAL
    // ---------------------------------------
    onPlayerHeal(player: PlayerState, amount: number, skillId: string): void {
        // (optionnel pour l’instant)
        this.broadcast(player.sessionId, "combat_log", {
            action: "heal",
            skillId,
            amount,
            hp: player.hp
        });
    }

    // ---------------------------------------
    // ⭐ BUFF
    // ---------------------------------------
    onApplyBuff(player: PlayerState, buffId: string, duration: number): void {
        this.broadcast(player.sessionId, "combat_log", {
            action: "buff",
            buffId,
            duration
        });
    }

    // ---------------------------------------
    // 👹 MONSTER → PLAYER
    // ---------------------------------------
    onMonsterHit(
        monster: MonsterState,
        player: PlayerState,
        damage: number
    ): void {
        this.logs.monsterHit(monster, player, damage);
    }

    // ---------------------------------------
    // 💀 MORT DU MONSTRE
    // ---------------------------------------
    onMonsterDeath(monster: MonsterState, killerPlayer: PlayerState): void {
        this.logs.monsterDeath(monster, killerPlayer);
    }

    // ---------------------------------------
    // ⚰️ MORT DU JOUEUR
    // ---------------------------------------
    onPlayerDeath(player: PlayerState, killerMonster: MonsterState): void {
        this.logs.playerDeath(player, killerMonster);
    }

    // ---------------------------------------
    // 🎬 CAST START
    // ---------------------------------------
    onCastStart(player: PlayerState, skillId: string): void {
        this.broadcast(player.sessionId, "combat_log", {
            action: "cast_start",
            skillId
        });
    }

    // ---------------------------------------
    // ❌ CAST CANCEL
    // ---------------------------------------
    onCastCancel(player: PlayerState, reason: string): void {
        this.broadcast(player.sessionId, "combat_log", {
            action: "cast_cancel",
            reason
        });
    }
}
