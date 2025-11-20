import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { AFKManager } from "./AFKManager";
import { AFKCombatSystem } from "./AFKCombatSystem";
import { AFKBehaviorManager } from "./AFKBehaviorManager";
import { OnlineCombatSystem } from "./OnlineCombatSystem";
import { MonsterCombatSystem } from "./combat/MonsterCombatSystem"; // <-- Importer

export class CombatManager {

    private onlineSystem: OnlineCombatSystem;
    private afkSystem: AFKCombatSystem;
    private afkBehavior: AFKBehaviorManager;
    private monsterSystem: MonsterCombatSystem; // <-- Ajouter la propriété

    constructor(
        private readonly gameState: GameState,
        private readonly afkManager: AFKManager,
        private readonly broadcast: (sessionId: string, type: string, data: any) => void
    ) {
        this.afkBehavior = new AFKBehaviorManager();

        this.onlineSystem = new OnlineCombatSystem(
            this.gameState,
            this.broadcast
        );

        this.afkSystem = new AFKCombatSystem(
            this.gameState,
            this.afkManager,
            this.broadcast,
            this.afkBehavior
        );

        // --- MONSTER COMBAT SYSTEM ---
        this.monsterSystem = new MonsterCombatSystem(
            this.gameState,
            this.broadcast
        );
    }

    update(deltaTime: number) {
        // Mettre à jour les timers des joueurs
        for (const player of this.gameState.players.values()) {
            player.updateCombatTimers(dt);
        }

        // Mettre à jour la logique des monstres
        this.monsterSystem.update(deltaTime);

        // Mettre à jour la logique des joueurs
        for (const player of this.gameState.players.values()) {
            if (player.isDead) continue;

            if (player.isAFK) {
                this.afkSystem.update(deltaTime);
                continue;
            }

            this.onlineSystem.update(player, deltaTime);
        }
    }

    public forceStopCombat(player: PlayerState) {
        player.inCombat = false;
        player.targetMonsterId = "";
    }
}
