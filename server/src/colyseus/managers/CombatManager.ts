import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { AFKManager } from "./AFKManager";
import { AFKCombatSystem } from "./AFKCombatSystem";
import { AFKBehaviorManager } from "./AFKBehaviorManager";
import { OnlineCombatSystem } from "./combat/OnlineCombatSystem";
import { MonsterCombatSystem } from "./combat/MonsterCombatSystem";

export class CombatManager {

    private onlineSystem: OnlineCombatSystem;
    private afkSystem: AFKCombatSystem;
    private afkBehavior: AFKBehaviorManager;
    private monsterSystem: MonsterCombatSystem;

    constructor(
        private readonly gameState: GameState,
        private readonly afkManager: AFKManager,
        private readonly broadcast: (sessionId: string, type: string, data: any) => void
    ) {
        this.afkBehavior = new AFKBehaviorManager();

        // --- ONLINE SYSTEM ---
        this.onlineSystem = new OnlineCombatSystem(
            this.gameState,
            (sessionId, type, data) => this.emitCombatEvent(sessionId, type, data)
        );

        // --- AFK SYSTEM ---
        this.afkSystem = new AFKCombatSystem(
            this.gameState,
            this.afkManager,
            (sessionId, type, data) => this.emitCombatEvent(sessionId, type, data),
            this.afkBehavior
        );

        // --- MONSTER SYSTEM ---
        this.monsterSystem = new MonsterCombatSystem(
            this.gameState,
            (sessionId, type, data) => this.emitCombatEvent(sessionId, type, data)
        );
    }

    /**
     * Unifie tous les events de combat → FORMAT B
     */
    private emitCombatEvent(
        sessionId: string,
        eventType: string,
        data: any
    ) {
        // Les systèmes t'envoient un type interne comme:
        // - "playerHit"
        // - "monsterHit"
        // - "monsterKilled"
        // - "playerKilled"
        //
        // On les transforme en FORMAT B.

        if (eventType === "playerHit") {
            this.broadcast(sessionId, "combat_event", {
                event: "hit",
                source: "player",
                sourceId: data.playerId,
                target: "monster",
                targetId: data.monsterId,
                damage: data.damage,
                remainingHp: data.remainingHp,
                crit: data.crit ?? false,
                time: Date.now()
            });
            return;
        }

        if (eventType === "monsterHit") {
            this.broadcast(sessionId, "combat_event", {
                event: "hit",
                source: "monster",
                sourceId: data.monsterId,
                target: "player",
                targetId: data.playerId,
                damage: data.damage,
                remainingHp: data.remainingHp,
                crit: false,
                time: Date.now()
            });
            return;
        }

        if (eventType === "monsterKilled") {
            this.broadcast(sessionId, "combat_event", {
                event: "death",
                entity: "monster",
                entityId: data.monsterId,
                time: Date.now()
            });
            return;
        }

        if (eventType === "playerKilled") {
            this.broadcast(sessionId, "combat_event", {
                event: "death",
                entity: "player",
                entityId: data.playerId,
                time: Date.now()
            });
            return;
        }

        // Fallback → relayer brut (utile debug)
        this.broadcast(sessionId, eventType, data);
    }

    /**
     * MAIN TICK
     */
    update(deltaTime: number) {

        // 1. Update monsters behaviour + attacks
        this.monsterSystem.update(deltaTime);

        // 2. Update each player's combat loop
        for (const player of this.gameState.players.values()) {

            // Timers / cooldowns / regen
            player.updateCombatTimers(deltaTime);

            if (player.isDead) continue;

            // === AFK Mode ===
            if (player.isAFK) {
                this.afkSystem.update(deltaTime);
                continue;
            }

            // === Online Combat ===
            this.onlineSystem.update(player, deltaTime);
        }
    }

    /**
     * STOP COMBAT WHEN PLAYER MOVES
     */
    public forceStopCombat(player: PlayerState) {
        player.inCombat = false;
        player.targetMonsterId = "";
    }
}
