import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";
import { SkillDefinition } from "../../types/SkillDefinition";
import { CombatUtils } from "./CombatUtils"; // <-- Importer CombatUtils

export class SkillRotation {
    static getNextSkill(
        player: PlayerState,
        monster: MonsterState
    ): SkillDefinition | null {

        // GCD actif → aucun sort
        if (player.gcdRemaining > 0) return null;

        // MODIFIÉ : Utiliser l'utilitaire pour vérifier les locks
        if (CombatUtils.isLockedForActions(player)) return null;

        const now = Date.now();

        for (const skillId of player.skillBar) {
            const skill = player.skills.get(skillId) as SkillDefinition;
            if (!skill) continue;

            // Auto OFF → ignoré
            if (skill.autoCast === false) continue;

            // Cooldown pas prêt
            const cd = player.cooldowns.get(skill.id);
            if (cd && cd > now) continue;

            // Buff déjà actif → ignorer
            if (
                skill.effectType === "buff" &&
                skill.buffId &&
                player.activeBuffs.has(skill.buffId)
            ) {
                continue;
            }

            // Vérifier ressource du joueur
            if (skill.manaCost && player.resource < skill.manaCost) continue;
            if (skill.energyCost && player.resource < skill.energyCost) continue;

            // Vérifier la portée
            const dist = this.dist(player, monster);
            if (dist > skill.range) continue;

            return skill;
        }

        return null;
    }

    static peekNextSkill(
        player: PlayerState,
        monster: MonsterState
    ): SkillDefinition | null {
        return this.getNextSkill(player, monster);
    }

    private static dist(p: PlayerState, m: MonsterState): number {
        return Math.sqrt(
            (p.posX - m.posX) ** 2 +
            (p.posY - m.posY) ** 2 +
            (p.posZ - m.posZ) ** 2
        );
    }
}
