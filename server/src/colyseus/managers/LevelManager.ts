// server/src/colyseus/managers/LevelManager.ts
import { PlayerState } from "../schema/PlayerState";
import { computeFullStats } from "./stats/PlayerStatsCalculator";
import { TalentManager } from "./TalentManager";

export class LevelManager {

    constructor(
        private readonly send: (sessionId: string, type: string, data: any) => void,
        private readonly talentManager: TalentManager      // <-- AJOUT
    ) {}

    public async giveXP(player: PlayerState, amount: number) {

        if (amount <= 0) return;

        player.xp += amount;

        this.send(player.sessionId, "xp_gain", { amount, total: player.xp });

        let leveled = false;
        while (player.xp >= player.nextLevelXp) {
            player.xp -= player.nextLevelXp;
            player.level++;
            player.nextLevelXp = this.computeNextLevelXp(player.level);

            // ⭐ DONNER LE POINT DE TALENT ICI !
            this.talentManager.giveSkillPoint(player);

            leveled = true;
        }

        if (leveled) {
            const newStats = await computeFullStats(player);
            player.loadStatsFromProfile(newStats);

            this.send(player.sessionId, "level_up", {
                level: player.level,
                xp: player.xp,
                nextLevelXp: player.nextLevelXp,
                stats: newStats
            });
        }
    }

    public computeNextLevelXp(level: number): number {
        return Math.floor(100 * Math.pow(level, 1.5));
    }
}
