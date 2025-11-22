import { PlayerState } from "../schema/PlayerState";
import { ITalent } from "../../models/Talent";
import Talent from "../../models/Talent";
import { talentScriptRegistry } from "../talents/TalentScriptRegistry";
import { computeFullStats } from "./stats/PlayerStatsCalculator";

/**
 * TalentManager - Gère toute la logique liée aux talents des joueurs.
 * Version OPTIMUM : toutes les actions envoient un paquet complet "player_update".
 */
export class TalentManager {

    private talentCache: Map<string, ITalent> = new Map();

    constructor(
        private readonly onSavePlayer?: (player: PlayerState) => Promise<void>,
        private readonly send?: (sessionId: string, type: string, data: any) => void
    ) {}

    /* ===========================================================
       CHARGEMENT DB
       =========================================================== */
    async loadAllTalentsFromDB(): Promise<void> {
        console.log("📥 [TalentManager] Chargement des définitions de talents depuis MongoDB...");
        try {
            const talents = await Talent.find({});
            this.talentCache.clear();

            for (const talent of talents) {
                this.talentCache.set(talent.talentId, talent.toObject());
            }

            console.log(`✅ [TalentManager] ${this.talentCache.size} talents chargés.`);
        } catch (error) {
            console.error("❌ [TalentManager] Erreur chargement talents:", error);
        }
    }

    /* ===========================================================
       DONNER UN POINT DE TALENT
       =========================================================== */
    giveSkillPoint(player: PlayerState): void {
        player.availableSkillPoints++;
        console.log(`🌟 [TalentManager] ${player.characterName} gagne 1 point de talent (Total: ${player.availableSkillPoints})`);
    }

    /* ===========================================================
       VALIDATION
       =========================================================== */
    canLearnTalent(player: PlayerState, talentId: string) {
        const talent = this.talentCache.get(talentId);
        if (!talent) return { canLearn: false, reason: "Talent not found" };

        const currentRank = player.talents.get(talentId) || 0;

        if (player.level < talent.requiredLevel)
            return { canLearn: false, reason: `Requires level ${talent.requiredLevel}` };

        if (player.availableSkillPoints <= 0)
            return { canLearn: false, reason: "Not enough skill points" };

        if (currentRank >= talent.maxRank)
            return { canLearn: false, reason: "Max rank reached" };

        for (const prereq of talent.prerequisites) {
            if (prereq.type === "talent" && prereq.talentId && prereq.rank) {
                const prereqRank = player.talents.get(prereq.talentId) || 0;
                if (prereqRank < prereq.rank) {
                    const t = this.talentCache.get(prereq.talentId);
                    return {
                        canLearn: false,
                        reason: `Requires ${prereq.rank} ranks in ${t?.name || prereq.talentId}`
                    };
                }
            }
        }

        return { canLearn: true };
    }

    /* ===========================================================
       APPRENDRE UN TALENT
       =========================================================== */
    async learnTalent(player: PlayerState, talentId: string): Promise<boolean> {

        const validation = this.canLearnTalent(player, talentId);
        if (!validation.canLearn) {
            console.log(`❌ [TalentManager] ${player.characterName} ne peut pas apprendre ${talentId}: ${validation.reason}`);
            return false;
        }

        const talent = this.talentCache.get(talentId)!;
        const newRank = (player.talents.get(talentId) || 0) + 1;

        // Dépenser le point
        player.availableSkillPoints--;

        // Apprendre le rang
        player.talents.set(talentId, newRank);

        // Exécuter script talent
        const script = talentScriptRegistry.get(talent.scriptName);
        if (script?.onLearn) script.onLearn(player, newRank);

        console.log(`📚 [TalentManager] ${player.characterName} apprend ${talent.name} (Rang ${newRank})`);

        // Recompute stats
        const stats = await computeFullStats(player);
        player.loadStatsFromProfile(stats);

        // Sauvegarder
        await this.onSavePlayer?.(player);

        // 🔥 ENVOYER player_update COMPLET
        this.sendPlayerUpdate(player, stats);

        return true;
    }

    /* ===========================================================
       RESET DES TALENTS
       =========================================================== */
    async resetTalents(player: PlayerState): Promise<void> {

        console.log(`🔄 [TalentManager] ${player.characterName} reset ses talents.`);
        let refund = 0;

        for (const [talentId, rank] of player.talents.entries()) {

            const talent = this.talentCache.get(talentId);
            if (!talent) continue;

            refund += rank;

            const script = talentScriptRegistry.get(talent.scriptName);
            if (script?.onUnlearn) {
                for (let i = rank; i > 0; i--) {
                    script.onUnlearn(player, i);
                }
            }
        }

        player.talents.clear();
        player.availableSkillPoints += refund;

        console.log(`💰 [TalentManager] ${player.characterName} récupère ${refund} points.`);

        // Recompute stats
        const stats = await computeFullStats(player);
        player.loadStatsFromProfile(stats);

        // Sauvegarde
        await this.onSavePlayer?.(player);

        // 🔥 ENVOYER player_update COMPLET
        this.sendPlayerUpdate(player, stats);
    }

    /* ===========================================================
       SEND PLAYER UPDATE (NOUVEAU PACKET OPTIMUM)
       =========================================================== */
    private sendPlayerUpdate(player: PlayerState, stats: any) {
        if (!this.send) return;

        this.send(player.sessionId, "player_update", {
            level: player.level,
            xp: player.xp,
            nextLevelXp: player.nextLevelXp,
            stats,
            availableSkillPoints: player.availableSkillPoints,
            talents: player.saveTalentsToProfile()
        });
    }
}
