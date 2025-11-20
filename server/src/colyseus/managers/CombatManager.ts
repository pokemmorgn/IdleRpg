import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { AFKManager } from "./AFKManager";
import { AFKCombatSystem } from "./AFKCombatSystem";
import { AFKBehaviorManager } from "./AFKBehaviorManager";
import { OnlineCombatSystem } from "./OnlineCombatSystem";

export class CombatManager {

    private onlineSystem: OnlineCombatSystem;
    private afkSystem: AFKCombatSystem;
    private afkBehavior: AFKBehaviorManager;

    constructor(
        private readonly gameState: GameState,
        private readonly afkManager: AFKManager,
        private readonly broadcast: (sessionId: string, type: string, data: any) => void
    ) {
        this.afkBehavior = new AFKBehaviorManager();

        // --- ONLINE COMBAT SYSTEM ---
        this.onlineSystem = new OnlineCombatSystem(
            this.gameState,
            this.broadcast
        );

        // --- AFK COMBAT SYSTEM ---
        // Signature correcte :
        // constructor(gameState, afkManager, broadcastFn, behavior?)
        this.afkSystem = new AFKCombatSystem(
            this.gameState,
            this.afkManager,
            this.broadcast,
            this.afkBehavior
        );
    }

    /**
     * Tick principal du combat.
     * S'exécute à chaque frame depuis WorldRoom.update()
     */
    update(deltaTime: number) {
        // Parcourir tous les joueurs pour mettre à jour leurs états
        for (const player of this.gameState.players.values()) {

            // 1. Mettre à jour les timers de combat pour CE joueur
            // (GCD, cast lock, animation lock, auto-attack timer)
            player.updateCombatTimers(deltaTime);

            if (player.isDead) continue;

            // === AFK MODE ===
            if (player.isAFK) {
                // NOTE: Cet appel est fait pour chaque joueur AFK. 
                // Si AFKCombatSystem.update() est coûteux, cela pourrait être inefficace.
                // Une optimisation serait de l'appeler une seule fois par tick et de le laisser gérer tous les joueurs AFK.
                this.afkSystem.update(deltaTime);
                continue;
            }

            // === ONLINE MODE ===
            this.onlineSystem.update(player, deltaTime);
        }
    }

    /**
     * Appelé depuis WorldRoom quand un joueur bouge,
     * afin d'annuler un combat en cours.
     */
    public forceStopCombat(player: PlayerState) {
        player.inCombat = false;
        player.targetMonsterId = "";
    }
}
