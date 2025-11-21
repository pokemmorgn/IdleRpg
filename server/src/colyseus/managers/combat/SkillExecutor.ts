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
        // GCD
        player.gcdRemaining = skill.globalCooldown ?? 1000;

        // Cooldown
        player.cooldowns.set(
            skill.id,
            Date.now() + (skill.cooldown ?? 0)
        );

        // Ressources
        this.consumeResources(player, skill);

        // --- CAST-TIME ---
        if (skill.castTime && skill.castTime > 0) {
            this.startCasting(player, skill);

            // → callback cast_start
            cb.onCastStart?.(player, skill.id);

            return;
        }

        // --- INSTANT ---
        this.applyAnimationLock(player, skill);
        this.applySkillEffect(player, monster, skill, cb, gameState);

        // → callback skill_execute
        cb.onCastStart?.(player, skill.id);
    }

    // =====================================================
    // CAST START
    // =====================================================
    private static startCasting(player: PlayerState, skill: SkillDefinition) {
        player.currentCastingSkillId = skill.id;
        player.castLockRemaining = skill.castTime ?? 0;
        player.currentAnimationLockType = skill.lockType ?? "none";
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

        // Anim-lock
        this.applyAnimationLock(player, skill);

        // Application
        this.applySkillEffect(player, monster, skill, cb, gameState);

        // → callback cast_end (optionnel)
        // (ton emitter l'enverra automatiquement si on ajoute onCastEnd)

        // Reset
        player.castLockRemaining = 0;
        player.currentCastingSkillId = "";
    }

    // =====================================================
    // ANIMATION LOCK
    // =====================================================
    private static applyAnimationLock(player: PlayerState, skill: SkillDefinition) {
        player.animationLockRemaining = skill.animationLock ?? 0;
        player.currentAnimationLockType = skill.lockType ?? "none";
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
    // DAMAGE
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

        // → callback skillHit
        cb.onPlayerSkillHit(player, monster, dmg, false, skill.id);
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
        player.hp = Math.min(player.maxHp, player.hp + amount);

        // → callback heal
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

        player.activeBuffs.set(skill.buffId, Date.now() + duration);

        // → callback buff
        cb.onApplyBuff?.(player, skill.buffId, duration);
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

            const d = this.dist(player, monster);
            if (d > radius) continue;

            const dmg = Math.max(1, skill.power + player.attackPower - monster.defense);

            monster.setHp(monster.hp - dmg);
            monster.targetPlayerId = player.sessionId;

            // → callback skillHit (pour chaque monstre)
            cb.onPlayerSkillHit(player, monster, dmg, false, skill.id);
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
    // TRY EXECUTE QUEUED SKILL
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
