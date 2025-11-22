// server/src/colyseus/managers/LevelManager.ts
import { PlayerState } from "../schema/PlayerState";
import { computeFullStats } from "./stats/PlayerStatsCalculator";
import { TalentManager } from "./TalentManager";

export class LevelManager {

    constructor(
        private readonly send: (sessionId: string, type: string, data: any) => void,
        private readonly talentManager: TalentManager
    ) {}

    // ========================================================
    // 🔥 GAIN XP
    // ========================================================
    public async giveXP(player: PlayerState, amount: number) {

        if (amount <= 0) return;

        player.xp += amount;

        // Petite notif optionnelle (pas importante pour les tests)
        this.send(player.sessionId, "xp_gain", {
            amount,
            total: player.xp
        });

        let leveled = false;

        while (player.xp >= player.nextLevelXp) {
            player.xp -= player.nextLevelXp;
            player.level++;
            player.nextLevelXp = this.computeNextLevelXp(player.level);
            leveled = true;

            // ⭐ Donner un point de talent
            this.talentManager.giveSkillPoint(player);
        }

        if (leveled) {
            // Recompute full stats
            const newStats = await computeFullStats(player);
            player.loadStatsFromProfile(newStats);

            // ⭐ ENVOYER LE NOUVEAU PLAYER_UPDATE
            this.send(player.sessionId, "player_update", {
                level: player.level,
                xp: player.xp,
                nextLevelXp: player.nextLevelXp,
                stats: newStats,
                availableSkillPoints: player.availableSkillPoints,
                talents: player.saveTalentsToProfile()
            });
        }
    }

    public computeNextLevelXp(level: number): number {
        return Math.floor(100 * Math.pow(level, 1.5));
    }
}
