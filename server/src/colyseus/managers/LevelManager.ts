// server/src/colyseus/managers/LevelManager.ts
import { PlayerState } from "../schema/PlayerState";
import { computeFullStats } from "./stats/PlayerStatsCalculator";

export class LevelManager {

    constructor(
        private readonly send: (sessionId: string, type: string, data: any) => void
    ) {}

    // ========================================================
    // 🔥 GAIN XP
    // ========================================================
    public async giveXP(player: PlayerState, amount: number) {

        if (amount <= 0) return;

        player.xp += amount;

        // Notification simple
        this.send(player.sessionId, "xp_gain", { amount, total: player.xp });

        // Check for level-ups
        let leveled = false;
        while (player.xp >= player.nextLevelXp) {
            player.xp -= player.nextLevelXp;
            player.level++;
            player.nextLevelXp = this.computeNextLevelXp(player.level);

            leveled = true;
        }

        // If player levelled-up
        if (leveled) {
            // Recompute stats based on new level
            const newStats = await computeFullStats(player);
            player.loadStatsFromProfile(newStats);

            // Notify player
            this.send(player.sessionId, "level_up", {
                level: player.level,
                xp: player.xp,
                nextLevelXp: player.nextLevelXp,
                stats: newStats
            });
        }
    }

    // ========================================================
    // 📈 FORMULE XP NIVEAU SUIVANT (modifiable facilement)
    // ========================================================
    public computeNextLevelXp(level: number): number {
        return Math.floor(100 * Math.pow(level, 1.5)); // Style MMORPG
    }
}
