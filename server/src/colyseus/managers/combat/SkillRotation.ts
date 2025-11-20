import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";
import { SkillDefinition } from "../../types/SkillDefinition"; // à créer : data statique du skill

export class SkillRotation {

    /**
     * Retourne le meilleur skill immédiatement lançable
     * selon l'ordre de la barre de skills du joueur.
     * 
     * IMPORTANT :
     * - respecte auto ON/OFF
     * - respecte le GCD
     * - respecte cooldown individuel
     * - respecte buff déjà actif
     */
    static chooseSkill(
        player: PlayerState,
        monster: MonsterState
    ): SkillDefinition | null {

        // Si en GCD → impossible de lancer un sort
        if (player.gcdRemaining > 0) return null;

        // Liste des skills dans l'ordre défini par le joueur
        const bar = player.skillBar; // array of skillIds

        for (const skillId of bar) {

            const skill = player.skills[skillId] as SkillDefinition;
            if (!skill) continue;

            // Auto OFF → ignoré
            if (skill.autoCast === false) continue;

            // Cooldown pas prêt
            if (!this.cooldownReady(player, skill)) continue;

            // Buff déjà actif → ignorer les sorts buff
            if (skill.type === "buff" && this.buffAlreadyUp(player, skill)) {
                continue;
            }

            // Vérifier les ressources requises
            if (!this.hasResources(player, skill)) continue;

            // Vérifier la portée
            const dist = this.dist(player, monster);
            if (dist > skill.range) continue;

            // Ce skill est valable
            return skill;
        }

        return null;
    }


    /**
     * Permet au moteur de savoir quel skill sera choisi ensuite,
     * utile pour déterminer si on doit se déplacer.
     */
    static peekNextSkill(
        player: PlayerState,
        monster: MonsterState
    ): SkillDefinition | null {
        return this.chooseSkill(player, monster);
    }


    // -------------------------------------------------------
    // CONDITIONS DE CAST
    // -------------------------------------------------------

    static cooldownReady(player: PlayerState, skill: SkillDefinition): boolean {
        const now = Date.now();
        return !player.cooldowns[skill.id] || player.cooldowns[skill.id] <= now;
    }

    static buffAlreadyUp(player: PlayerState, skill: SkillDefinition): boolean {
        if (!skill.buffId) return false;
        return !!player.activeBuffs[skill.buffId];
    }

    static hasResources(player: PlayerState, skill: SkillDefinition): boolean {
        if (skill.manaCost && player.mana < skill.manaCost) return false;
        if (skill.energyCost && player.energy < skill.energyCost) return false;
        return true;
    }

    // -------------------------------------------------------
    // UTILS
    // -------------------------------------------------------

    private static dist(p: PlayerState, m: MonsterState): number {
        return Math.sqrt(
            (p.posX - m.posX) ** 2 +
            (p.posY - m.posY) ** 2 +
            (p.posZ - m.posZ) ** 2
        );
    }
}
