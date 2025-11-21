import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";

import { OnlineCombatSystem } from "./combat/OnlineCombatSystem";
import { MonsterCombatSystem } from "./combat/MonsterCombatSystem";
import { CombatLogManager } from "./CombatLogManager";

import { CombatEventCallbacks } from "./combat/CombatEventCallbacks";

export class CombatManager {

    private onlineSystem: OnlineCombatSystem;
    private monsterSystem: MonsterCombatSystem;
    private logs: CombatLogManager;

    constructor(
        private readonly gameState: GameState,
        private readonly broadcast: (sessionId: string, type: string, data: any) => void
    ) {

        // ============================================================
        // 📘 CombatLogManager — centralise aussi le broadcast final
        // ============================================================
        this.logs = new CombatLogManager(this.gameState, this.broadcast);

        // ============================================================
        // 🧩 Callback UNIFIÉES (la nouvelle interface)
        // ============================================================
        const callbacks: CombatEventCallbacks = {

            // ---------------------
            // PLAYER → MONSTER
            // ---------------------
            onPlayerHit: (player, monster, dmg, crit, skillId) => {
                this.logs.hit(player, monster, dmg, skillId, crit);
            },

            // ---------------------
            // MONSTER → PLAYER
            // ---------------------
            onMonsterHit: (monster, player, dmg) => {
                this.logs.monsterHit(monster, player, dmg);
            },

            // ---------------------
            // DEATHS
            // ---------------------
            onMonsterDeath: (monster, killerPlayer) => {
                this.logs.monsterDeath(monster, killerPlayer);
            },

            onPlayerDeath: (player, killerMonster) => {
                this.logs.playerDeath(player, killerMonster);
            },

            // ---------------------
            // CAST EVENTS
            // ---------------------
            onCastStart: (player, skillId) => {
                this.logs.castStart(player, skillId);
            },

            onCastCancel: (player, reason) => {
                this.logs.castCancel(player, reason);
            }
        };

        // ============================================================
        // SYSTÈMES DE COMBAT
        // ============================================================
        this.onlineSystem = new OnlineCombatSystem(this.gameState, callbacks);
        this.monsterSystem = new MonsterCombatSystem(this.gameState, callbacks);
    }


    // ============================================================
    // MAIN LOOP
    // ============================================================
    update(dt: number) {

        // 1. IA des monstres
        this.monsterSystem.update(dt);

        // 2. Joueurs online
        for (const player of this.gameState.players.values()) {

            player.updateCombatTimers(dt);

            if (player.isDead) continue;

            this.onlineSystem.update(player, dt);
        }
    }

    // ============================================================
    // Stop combat forcé
    // ============================================================
    public forceStopCombat(player: PlayerState) {
        player.inCombat = false;
        player.targetMonsterId = "";
    }
}
