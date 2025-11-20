import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";
import { SkillDefinition } from "../../types/SkillDefinition";

export class SkillExecutor {

    /**
     * Lancement du sort : vérifie cast time, lock, GCD,
     * puis démarre soit un cast, soit une animation instantanée.
     */
    static cast(
        player: PlayerState,
        monster: MonsterState,
        skill: SkillDefinition,
        broadcast: (sessionId: string, type: string, data: any) => void
    ) {
        // 1. Appliquer GCD
        player.gcdRemaining = skill.globalCooldown ?? 1000; // fallback 1 sec

        // 2. Déclencher cooldown
        const now = Date.now();
        player.cooldowns[skill.id] = now + skill.cooldown;

        // 3. Consommer ressources
        this.consumeResources(player, skill);

        // 4. Cast time ?
        if (skill.castTime > 0) {
            this.startCasting(player, skill, broadcast);
        } else {
            // Sort instant → mais animation lock possible
            this.applyAnimationLock(player, skill);
            this.applySkillEffect(player, monster, skill, broadcast);
        }
    }

    /**
     * Démarre un cast (sort > 0ms)
     */
    private static startCasting(
        player: PlayerState,
        skill: SkillDefinition,
        broadcast: (sessionId: string, type: string, data: any) => void
    ) {
        player.currentCastingSkillId = skill.id;
        player.castLockRemaining = skill.castTime;
        player.currentAnimationLockType = skill.lockType; // soft / full / none

        // Broadcast début du cast
        broadcast(player.sessionId, "cast_start", {
            skillId: skill.id,
            castTime: skill.castTime
        });
    }

    /**
     * Appelé par OnlineCombatSystem lorsque le cast se termine
     */
    static finishCast(
        player: PlayerState,
        monster: MonsterState,
        broadcast: (sessionId: string, type: string, data: any) => void
    ) {
        const skillId = player.currentCastingSkillId;
        if (!skillId) return;

        const skill = player.skills[skillId] as SkillDefinition;

        // Cast terminé → appliquer animation lock
        this.applyAnimationLock(player, skill);

        // Appliquer l’effet du sort
        this.applySkillEffect(player, monster, skill, broadcast);

        // Clear cast
        player.castLockRemaining = 0;
        player.currentCastingSkillId = "";
    }


    // -------------------------------------------------------
    // ANIMATION LOCK
    // -------------------------------------------------------

    private static applyAnimationLock(player: PlayerState, skill: SkillDefinition) {
        const lock = skill.animationLock ?? 0;

        if (lock <= 0) {
            // no-lock : le joueur peut tout faire immédiatement
            player.animationLockRemaining = 0;
            return;
        }

        // soft-lock : parsable par le mouvement (géré ailleurs)
        // full-lock : bloquant
        player.animationLockRemaining = lock;
        player.currentAnimationLockType = skill.lockType;
    }


    // -------------------------------------------------------
    // APPLICATION DE L’EFFET DU SORT
    // -------------------------------------------------------

    private static applySkillEffect(
        player: PlayerState,
        monster: MonsterState,
        skill: SkillDefinition,
        broadcast: (sessionId: string, type: string, data: any) => void
    ) {
        switch (skill.effectType) {

            case "damage":
                this.applyDamageSkill(player, monster, skill, broadcast);
                break;

            case "aoe":
                this.applyAoeSkill(player, skill, broadcast);
                break;

            case "buff":
                this.applyBuff(player, skill, broadcast);
                break;

            case "heal":
                this.applyHeal(player, skill, broadcast);
                break;

            default:
                console.warn("⚠️ Skill type inconnu :", skill.effectType);
                break;
        }

        // Broadcast générique dans tous les cas
        broadcast(player.sessionId, "skill_cast", {
            skillId: skill.id
        });
    }


    // -------------------------------------------------------
    // SKILLS : DAMAGE
    // -------------------------------------------------------

    private static applyDamageSkill(
        player: PlayerState,
        monster: MonsterState,
        skill: SkillDefinition,
        broadcast: (sessionId: string, type: string, data: any) => void
    ) {
        const dmg = Math.max(1, skill.power + player.attackPower - monster.defense);
        monster.hp = Math.max(0, monster.hp - dmg);

        broadcast(player.sessionId, "skill_damage", {
            skillId: skill.id,
            targetId: monster.monsterId,
            damage: dmg,
            hpLeft: monster.hp
        });
    }


    // -------------------------------------------------------
    // SKILLS : HEAL
    // -------------------------------------------------------

    private static applyHeal(
        player: PlayerState,
        skill: SkillDefinition,
        broadcast: (sessionId: string, type: string, data: any) => void
    ) {
        const amount = Math.max(1, skill.power);
        player.hp = Math.min(player.maxHp, player.hp + amount);

        broadcast(player.sessionId, "skill_heal", {
            skillId: skill.id,
            heal: amount,
            hp: player.hp
        });
    }


    // -------------------------------------------------------
    // SKILLS : BUFF
    // -------------------------------------------------------

    private static applyBuff(
        player: PlayerState,
        skill: SkillDefinition,
        broadcast: (sessionId: string, type: string, data: any) => void
    ) {
        if (!skill.buffId) return;

        player.activeBuffs[skill.buffId] = Date.now() + skill.duration;

        broadcast(player.sessionId, "skill_buff", {
            skillId: skill.id,
            buffId: skill.buffId,
            duration: skill.duration
        });
    }


    // -------------------------------------------------------
    // SKILLS : AOE
    // -------------------------------------------------------

    private static applyAoeSkill(
        player: PlayerState,
        skill: SkillDefinition,
        broadcast: (sessionId: string, type: string, data: any) => void
    ) {
        const radius = skill.radius ?? 4;

        let hitCount = 0;

        for (const monster of player.roomState.monsters.values()) {
            const d = this.dist(player, monster);
            if (d <= radius && monster.isAlive && !monster.isDead) {
                const dmg = Math.max(1, skill.power + player.attackPower - monster.defense);
                monster.hp = Math.max(0, monster.hp - dmg);
                hitCount++;
            }
        }

        broadcast(player.sessionId, "skill_aoe", {
            skillId: skill.id,
            hits: hitCount,
            radius
        });
    }


    // -------------------------------------------------------
    // RESSOURCES
    // -------------------------------------------------------

    private static consumeResources(player: PlayerState, skill: SkillDefinition) {
        if (skill.manaCost) player.mana = Math.max(0, player.mana - skill.manaCost);
        if (skill.energyCost) player.energy = Math.max(0, player.energy - skill.energyCost);
    }


    // -------------------------------------------------------
    // UTILS
    // -------------------------------------------------------

    static isInRange(player: PlayerState, monster: MonsterState, skill: SkillDefinition) {
        return this.dist(player, monster) <= skill.range;
    }

    static targetInCastRange(player: PlayerState, monster: MonsterState) {
        const skill = player.skills[player.currentCastingSkillId];
        if (!skill) return false;
        return this.dist(player, monster) <= skill.range;
    }

    private static dist(a: PlayerState, b: MonsterState) {
        return Math.sqrt(
            (a.posX - b.posX) ** 2 +
            (a.posY - b.posY) ** 2 +
            (a.posZ - b.posZ) ** 2
        );
    }
}
