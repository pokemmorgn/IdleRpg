import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";
import { GameState } from "../../schema/GameState";
import { SkillDefinition } from "../../types/SkillDefinition";
import { SkillRotation } from "./SkillRotation";
import { CombatEventCallbacks } from "./CombatEventCallbacks";

export class SkillExecutor {

    // =====================================================
    // TRY EXECUTE
    // =====================================================
    static tryExecute(
        player: PlayerState,
        monster: MonsterState,
        gameState: GameState,
        cb: CombatEventCallbacks
    ): boolean {

        const skill = SkillRotation.getNextSkill(player, monster);
        if (!skill) return false;

        this.cast(player, monster, skill, cb, gameState);
        return true;
    }

    // =====================================================
    // CAST (instant ou cast-time)
    // =====================================================
    static cast(
        player: PlayerState,
        monster: MonsterState,
        skill: SkillDefinition,
        cb: CombatEventCallbacks,
        gameState: GameState
    ) {
        // Global cooldown
        player.gcdRemaining = skill.globalCooldown ?? 1000;

        // Skill cooldown
        const cdEnd = Date.now() + (skill.cooldown ?? 0);
        player.cooldowns.set(skill.id, cdEnd);

        cb.onCooldown?.(player, skill.id, cdEnd);

        // Mana / Energy
        this.consumeResources(player, skill);

        // -------------------------------
        // 📌 SKILL AVEC CAST TIME
        // -------------------------------
        if (skill.castTime && skill.castTime > 0) {

            // Passer en mode cast
            player.currentCastingSkillId = skill.id;
            player.castLockRemaining = skill.castTime;
            player.currentAnimationLockType = skill.lockType ?? "full";

            // EVENT → cast start
            cb.onCastStart?.(player, skill.id);

            return;
        }

        // -------------------------------
        // 📌 SKILL INSTANTANÉ
        // -------------------------------
        this.applyAnimationLock(player, skill);

        // EVENT → skill_execute
        cb.onSkillExecute?.(player, skill.id);

        // Appliquer les effets
        this.applySkillEffect(player, monster, skill, cb, gameState);
    }

    // =====================================================
    // CAST FINISH (après castTime)
    // =====================================================
    static finishCast(
        player: PlayerState,
        monster: MonsterState,
        gameState: GameState,
        cb: CombatEventCallbacks
    ) {
        const skill = player.skills.get(player.currentCastingSkillId) as SkillDefinition;
        if (!skill) return;

        this.applyAnimationLock(player, skill);

        // EVENT → cast_end
        cb.onCastEnd?.(player, skill.id);

        // EVENT → skill_execute
        cb.onSkillExecute?.(player, skill.id);

        // appliquer les dégâts & effets
        this.applySkillEffect(player, monster, skill, cb, gameState);

        // reset cast
        player.currentCastingSkillId = "";
        player.castLockRemaining = 0;
    }

    // =====================================================
    // UTILS : Animation lock
    // =====================================================
    private static applyAnimationLock(player: PlayerState, skill: SkillDefinition) {
        player.animationLockRemaining = skill.animationLock ?? 0;
        player.currentAnimationLockType = skill.lockType ?? "soft";
    }

    // =====================================================
    // APPLY SKILL EFFECT
    // =====================================================
    private static applySkillEffect(
        player: PlayerState,
        monster: MonsterState,
        skill: SkillDefinition,
        cb: CombatEventCallbacks,
        gameState: GameState
    ) {
        switch (skill.effectType) {
            case "damage":
            case "projectile":
                this.applyDamageSkill(player, monster, skill, cb);
                break;

            case "aoe":
                this.applyAoeSkill(player, skill, cb, gameState);
                break;

            case "buff":
                this.applyBuff(player, skill, cb);
                break;

            case "heal":
                this.applyHeal(player, skill, cb);
                break;
        }
    }

    // =====================================================
    // DAMAGE SKILL
    // =====================================================
    private static applyDamageSkill(
        player: PlayerState,
        monster: MonsterState,
        skill: SkillDefinition,
        cb: CombatEventCallbacks
    ) {
        const dmg = Math.max(1, skill.power + player.attackPower - monster.defense);

        monster.setHp(monster.hp - dmg);
        monster.targetPlayerId = player.sessionId;

        cb.onPlayerSkillHit(player, monster, dmg, false, skill.id);
    }

    // =====================================================
    // AOE DAMAGE
    // =====================================================
    private static applyAoeSkill(
        player: PlayerState,
        skill: SkillDefinition,
        cb: CombatEventCallbacks,
        gameState: GameState
    ) {
        const radius = skill.radius ?? 4;

        for (const monster of gameState.monsters.values()) {

            if (!monster.isAlive) continue;
            if (this.dist(player, monster) > radius) continue;

            const dmg = Math.max(1, skill.power + player.attackPower - monster.defense);

            monster.setHp(monster.hp - dmg);
            monster.targetPlayerId = player.sessionId;

            cb.onPlayerSkillHit(player, monster, dmg, false, skill.id);
        }
    }

    // =====================================================
    // HEAL
    // =====================================================
    private static applyHeal(
        player: PlayerState,
        skill: SkillDefinition,
        cb: CombatEventCallbacks
    ) {
        const amount = Math.max(1, skill.power);
        const oldHp = player.hp;
        player.hp = Math.min(player.maxHp, player.hp + amount);

        if (player.hp > oldHp)
            cb.onPlayerHeal?.(player, amount, skill.id);
    }

    // =====================================================
    // BUFF
    // =====================================================
    private static applyBuff(
        player: PlayerState,
        skill: SkillDefinition,
        cb: CombatEventCallbacks
    ) {
        if (!skill.buffId) return;

        const duration = skill.duration ?? 0;
        const now = Date.now();

        const old = player.activeBuffs.get(skill.buffId);

        if (old && old > now) {
            // Refresh
            player.activeBuffs.set(skill.buffId, now + duration);
            cb.onBuffRefresh?.(player, skill.buffId, duration);
        } else {
            // New buff
            player.activeBuffs.set(skill.buffId, now + duration);
            cb.onApplyBuff?.(player, skill.buffId, duration);
        }
    }

    // =====================================================
    // RESOURCE COSTS
    // =====================================================
    private static consumeResources(player: PlayerState, skill: SkillDefinition) {
        if (skill.manaCost)
            player.resource = Math.max(0, player.resource - skill.manaCost);

        if (skill.energyCost)
            player.resource = Math.max(0, player.resource - skill.energyCost);
    }

    // =====================================================
    // UTILS
    // =====================================================
    private static dist(a: PlayerState, b: MonsterState): number {
        return Math.sqrt(
            (a.posX - b.posX) ** 2 +
            (a.posY - b.posY) ** 2 +
            (a.posZ - b.posZ) ** 2
        );
    }

    // =====================================================
    // QUEUED SKILL EXECUTION
    // =====================================================
    static tryExecuteQueuedSkill(
        player: PlayerState,
        monster: MonsterState,
        gameState: GameState,
        cb: CombatEventCallbacks
    ): boolean {

        const skillId = player.queuedSkill;
        if (!skillId) return false;

        const skill = player.skills.get(skillId) as SkillDefinition;
        if (!skill) {
            player.queuedSkill = "";
            return false;
        }

        const now = Date.now();
        const cd = player.cooldowns.get(skill.id);

        if (cd && cd > now) return false;

        if (skill.manaCost && player.resource < skill.manaCost) {
            player.queuedSkill = "";
            return false;
        }

        const dist = this.dist(player, monster);
        if (dist > skill.range) {
            player.queuedSkill = "";
            return false;
        }

        this.cast(player, monster, skill, cb, gameState);
        player.queuedSkill = "";

        return true;
    }
}
