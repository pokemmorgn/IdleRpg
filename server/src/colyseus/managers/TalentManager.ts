import { PlayerState } from "../schema/PlayerState";
import { ITalent } from "../../models/Talent";
import Talent from "../../models/Talent";
import { talentScriptRegistry } from "../talents/TalentScriptRegistry";
import { computeFullStats } from "./stats/PlayerStatsCalculator";

/**
 * TalentManager - Gère toute la logique liée aux talents des joueurs.
 */
export class TalentManager {
    private talentCache: Map<string, ITalent> = new Map();
    private onSavePlayer?: (player: PlayerState) => Promise<void>;

    constructor(
        onSavePlayer?: (player: PlayerState) => Promise<void>
    ) {
        this.onSavePlayer = onSavePlayer;
    }

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
            console.log(`✅ [TalentManager] ${this.talentCache.size} définitions de talent chargées.`);
        } catch (error) {
            console.error("❌ [TalentManager] Erreur lors du chargement des talents:", error);
        }
    }

    /* ===========================================================
       GESTION DES POINTS
       =========================================================== */
    /**
     * Donne un point de talent au joueur. Appelé lors d'une montée de niveau.
     */
    giveSkillPoint(player: PlayerState): void {
        player.availableSkillPoints++;
        console.log(`🌟 [TalentManager] ${player.characterName} gagne 1 point de talent (Total: ${player.availableSkillPoints})`);
        // TODO: Notifier le client
    }

    /* ===========================================================
       VALIDATION
       =========================================================== */
    /**
     * Vérifie si un joueur peut apprendre un rang de ce talent.
     */
    canLearnTalent(player: PlayerState, talentId: string): { canLearn: boolean; reason?: string } {
        const talent = this.talentCache.get(talentId);
        if (!talent) return { canLearn: false, reason: "Talent not found" };

        const currentRank = player.talents.get(talentId) || 0;

        // 1. Vérifier le niveau du joueur
        if (player.level < talent.requiredLevel) {
            return { canLearn: false, reason: `Requires level ${talent.requiredLevel}` };
        }

        // 2. Vérifier les points disponibles
        if (player.availableSkillPoints <= 0) {
            return { canLearn: false, reason: "Not enough skill points" };
        }

        // 3. Vérifier le rang maximum
        if (currentRank >= talent.maxRank) {
            return { canLearn: false, reason: "Max rank reached" };
        }

        // 4. Vérifier les prérequis
        for (const prereq of talent.prerequisites) {
            if (prereq.type === 'talent' && prereq.talentId && prereq.rank) {
                const prereqRank = player.talents.get(prereq.talentId) || 0;
                if (prereqRank < prereq.rank) {
                    const prereqTalent = this.talentCache.get(prereq.talentId);
                    return { canLearn: false, reason: `Requires ${prereqRank} ranks in ${prereqTalent?.name || prereq.talentId}` };
                }
            }
        }

        return { canLearn: true };
    }

    /* ===========================================================
       APPRENTISSAGE / RESPEC
       =========================================================== */
    /**
     * Tente d'apprendre un rang de talent.
     * @returns true si succès, false sinon.
     */
    async learnTalent(player: PlayerState, talentId: string): Promise<boolean> {
        const validation = this.canLearnTalent(player, talentId);
        if (!validation.canLearn) {
            console.log(`❌ [TalentManager] ${player.characterName} ne peut pas apprendre ${talentId}: ${validation.reason}`);
            return false;
        }

        const talent = this.talentCache.get(talentId)!;
        const newRank = (player.talents.get(talentId) || 0) + 1;

        // 1. Dépenser le point
        player.availableSkillPoints--;

        // 2. Mettre à jour le rang
        player.talents.set(talentId, newRank);

        // 3. Exécuter le script du talent (onLearn)
        const script = talentScriptRegistry.get(talent.scriptName);
        if (script?.onLearn) {
            script.onLearn(player, newRank);
        }

        console.log(`📚 [TalentManager] ${player.characterName} apprend ${talent.name} (Rang ${newRank})`);

        // 4. Recalculer les stats du joueur
        const newStats = await computeFullStats(player);
        player.loadStatsFromProfile(newStats);

        // 5. Sauvegarder
        this.onSavePlayer?.(player);

        // TODO: Notifier le client du succès et du changement de stats
        return true;
    }

    /**
     * Réinitialise tous les talents du joueur.
     */
    async resetTalents(player: PlayerState): Promise<void> {
        console.log(`🔄 [TalentManager] ${player.characterName} réinitialise ses talents.`);
        let pointsToRefund = 0;

        // 1. Parcourir tous les talents appris pour les désapprendre
        for (const [talentId, rank] of player.talents.entries()) {
            const talent = this.talentCache.get(talentId);
            if (!talent) continue;

            pointsToRefund += rank;

            // Exécuter le script (onUnlearn) pour chaque rang
            const script = talentScriptRegistry.get(talent.scriptName);
            if (script?.onUnlearn) {
                // On appelle onUnlearn pour chaque rang, du plus haut au plus bas
                for (let i = rank; i > 0; i--) {
                    script.onUnlearn(player, i);
                }
            }
        }

        // 2. Vider les talents et rembourser les points
        player.talents.clear();
        player.availableSkillPoints += pointsToRefund;

        console.log(`💰 [TalentManager] ${player.characterName} a récupé ${pointsToRefund} points de talent.`);

        // 3. Recalculer les stats
        const newStats = await computeFullStats(player);
        player.loadStatsFromProfile(newStats);

        // 4. Sauvegarder
        this.onSavePlayer?.(player);

        // TODO: Notifier le client du respec
    }
}
