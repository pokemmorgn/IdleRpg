import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { AFKBehaviorManager } from "./AFKBehaviorManager";
import { OnlineCombatSystem } from "./OnlineCombatSystem";
import { AFKCombatSystem } from "./AFKCombatSystem";
import { AFKManager } from "./AFKManager";

export class CombatManager {

    private onlineSystem: OnlineCombatSystem;
    private afkSystem: AFKCombatSystem;
    private afkBehavior: AFKBehaviorManager;

    constructor(
        private gameState: GameState,
        private afkManager: AFKManager,
        private broadcast: (sessionId: string, type: string, data: any) => void
    ) {
        this.afkBehavior = new AFKBehaviorManager();

        this.onlineSystem = new OnlineCombatSystem(
            this.gameState,
            this.broadcast
        );

        this.afkSystem = new AFKCombatSystem(
            this.gameState,
            this.afkManager,
            this.afkBehavior,
            this.broadcast
        );
    }

    /**
     * Tick du combat : route vers ONLINE ou AFK
     */
    update(deltaTime: number) {
        this.gameState.players.forEach(player => {

            if (player.isDead) return;

            // AFK mode → AFK system
            if (player.isAFK) {
                this.afkSystem.update(player, deltaTime);
            }

            // ONLINE mode → auto combat
            else {
                this.onlineSystem.update(player, deltaTime);
            }
        });
    }

    /**
     * Fonction publique pour arrêter proprement un combat
     * appelée par WorldRoom.
     */
    public forceStopCombat(player: PlayerState) {
        player.inCombat = false;
        player.targetMonsterId = "";
    }
}
