import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { OnlineCombatSystem } from "./combat/OnlineCombatSystem";
import { MonsterCombatSystem } from "./combat/MonsterCombatSystem";

export class CombatManager {

    private onlineSystem: OnlineCombatSystem;
    private monsterSystem: MonsterCombatSystem;

    constructor(
        private readonly gameState: GameState,
        private readonly broadcast: (sessionId: string, type: string, data: any) => void
    ) {
        // --- ONLINE SYSTEM ---
        this.onlineSystem = new OnlineCombatSystem(
            this.gameState,
            (sessionId, type, data) => this.emitCombatEvent(sessionId, type, data)
        );

        // --- MONSTER SYSTEM ---
        this.monsterSystem = new MonsterCombatSystem(
            this.gameState,
            (sessionId, type, data) => this.emitCombatEvent(sessionId, type, data)
        );
    }

    // =====================================================================
    //  FORMAT B : Unification de tous les events de combat (client-friendly)
    // =====================================================================
    private emitCombatEvent(
        sessionId: string,
        eventType: string,
        data: any
    ) {
        // ----- PLAYER → MONSTER -----
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
                time: Date.now(),
            });
            return;
        }

        // ----- MONSTER → PLAYER -----
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
                time: Date.now(),
            });
            return;
        }

        // ----- MONSTER DEAD -----
        if (eventType === "monsterKilled") {
            this.broadcast(sessionId, "combat_event", {
                event: "death",
                entity: "monster",
                entityId: data.monsterId,
                time: Date.now(),
            });
            return;
        }

        // ----- PLAYER DEAD -----
        if (eventType === "playerKilled") {
            this.broadcast(sessionId, "combat_event", {
                event: "death",
                entity: "player",
                entityId: data.playerId,
                time: Date.now(),
            });
            return;
        }

        // Fallback debug
        this.broadcast(sessionId, eventType, data);
    }

    // =====================================================================
    //  MAIN UPDATE LOOP
    // =====================================================================
    update(deltaTime: number) {
        // 1. Monstres : IA + attaques
        this.monsterSystem.update(deltaTime);

        // 2. Joueurs : logique combat online
        for (const player of this.gameState.players.values()) {

            // Timers combat / GCD / cast
            player.updateCombatTimers(deltaTime);

            if (player.isDead) continue;

            // Mode ONLINE ONLY
            this.onlineSystem.update(player, deltaTime);
        }
    }

    // =====================================================================
    //  STOP COMBAT SI LE JOUEUR BOUGE
    // =====================================================================
    public forceStopCombat(player: PlayerState) {
        player.inCombat = false;
        player.targetMonsterId = "";
    }
}
