import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { OnlineCombatSystem } from "./combat/OnlineCombatSystem";
import { MonsterCombatSystem } from "./combat/MonsterCombatSystem";
import { CombatLogManager } from "./CombatLogManager";

export class CombatManager {

    private onlineSystem: OnlineCombatSystem;
    private monsterSystem: MonsterCombatSystem;
    private logs: CombatLogManager;

    constructor(
        private readonly gameState: GameState,
        private readonly broadcast: (sessionId: string, type: string, data: any) => void
    ) {
        // ===============================
        // 📘 CombatLogManager
        // ===============================
        this.logs = new CombatLogManager(
            this.gameState,
            this.broadcast
        );

        // ===============================
        // 🧠 Online Combat system
        // ===============================
        this.onlineSystem = new OnlineCombatSystem(
            this.gameState,
            (player, monster, damage, crit, skillId) => {
                if (crit) {
                    this.logs.crit(player, monster, damage, skillId);
                } else {
                    this.logs.hit(player, monster, damage, skillId);
                }
            }
        );

        // ===============================
        // 🧟 Monster Combat system
        // ===============================
        this.monsterSystem = new MonsterCombatSystem(
            this.gameState,
            (monster, player, damage) => {
                this.logs.monsterHit(monster, player, damage);
            },
            (monster, killerPlayer) => {
                this.logs.monsterDeath(monster, killerPlayer);
            },
            (player, killerMonster) => {
                this.logs.playerDeath(player, killerMonster);
            }
        );
    }

    // ======================================================
    // 🔄 MAIN UPDATE LOOP
    // ======================================================
    update(deltaTime: number) {
        // 1. Monstres → IA + attaques
        this.monsterSystem.update(deltaTime);

        // 2. Joueurs → mode online (auto-attack + GCD + cast)
        for (const player of this.gameState.players.values()) {

            // GCD / cast / buffs
            player.updateCombatTimers(deltaTime);

            if (player.isDead) continue;

            this.onlineSystem.update(player, deltaTime);
        }
    }

    // ======================================================
    // 🛑 INTERRUPTION DE COMBAT MANUELLE
    // ======================================================
    public forceStopCombat(player: PlayerState) {
        player.inCombat = false;
        player.targetMonsterId = "";
    }
}
