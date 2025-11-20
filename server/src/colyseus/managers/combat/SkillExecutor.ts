import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";
import { GameState } from "../../schema/GameState";
import { SkillDefinition } from "../../types/SkillDefinition";
import { SkillRotation } from "./SkillRotation";

export class SkillExecutor {

    // =====================================================
    // TRY EXECUTE (appelé par OnlineCombatSystem)
    // =====================================================
    static tryExecute(
        player: PlayerState,
        monster: MonsterState,
        gameState: GameState,
        broadcast: (sessionId: string, type: string, data: any) => void
    ): boolean {

        const skill = SkillRotation.getNextSkill(player, monster);
        if (!skill) return false;

        this.cast(player, monster, skill, broadcast, gameState);
        return true;
    }

    // =====================================================
    // CAST
    // =====================================================
    static cast(
        player: PlayerState,
        monster: MonsterState,
        skill: SkillDefinition,
        broadcast: (sessionId: string, type: string, data: any) => void,
        gameState: GameState
    ) {
        // 1. Appliquer GCD
        player.gcdRemaining = skill.globalCooldown ?? 1000;

        // 2. Déclencher cooldown
        const now = Date.now();
        player.cooldowns.set(skill.id, now + (skill.cooldown ?? 0));

        // 3. Consommer ressource
        this.consumeResources(player, skill);

        // 4. Cast time ?
        if (skill.castTime > 0) {
            this.startCasting(player, skill, broadcast);
        } else {
            this.applyAnimationLock(player, skill);
            this.applySkillEffect(player, monster, skill, broadcast, gameState);
        }
    }

    // =====================================================
    // CAST START
    // =====================================================
    private static startCasting(
        player: PlayerState,
        skill: SkillDefinition,
        broadcast: (sessionId: string, type: string, data: any) => void
    ) {
        player.currentCastingSkillId = skill.id;
        player.castLockRemaining = skill.castTime ?? 0;
        player.currentAnimationLockType = skill.lockType ?? "none";

        broadcast(player.sessionId, "cast_start", {
            skillId: skill.id,
            castTime: skill.castTime
        });
    }

    // =====================================================
    // CAST FINISH
    // =====================================================
    static finishCast(
        player: PlayerState,
        monster: MonsterState,
        gameState: GameState,
        broadcast: (sessionId: string, type: string, data: any) => void
    ) {
        const skill = player.skills.get(player.currentCastingSkillId) as SkillDefinition;
        if (!skill) return;

        this.applyAnimationLock(player, skill);
        this.applySkillEffect(player, monster, skill, broadcast, gameState);

        player.castLockRemaining = 0;
        player.currentCastingSkillId = "";
    }

    // =====================================================
    // ANIMATION LOCK
    // =====================================================
    private static applyAnimationLock(player: PlayerState, skill: SkillDefinition) {
        const lock = skill.animationLock ?? 0;

        player.animationLockRemaining = lock;
        player.currentAnimationLockType = skill.lockType ?? "none";
    }
    // =====================================================
    // TRY EXECUTE QUEUED SKILL
    // =====================================================
    static tryExecuteQueuedSkill(
        player: PlayerState,
        monster: MonsterState,
        gameState: GameState,
        broadcast: (sessionId: string, type: string, data: any) => void
    ): boolean {
    
        const skillId = player.queuedSkill;
        if (!skillId) return false;
    
        const skill = player.skills.get(skillId) as SkillDefinition;
        if (!skill) {
            // Skill invalide, on vide la file d'attente
            player.queuedSkill = "";
            return false;
        }
    
        // Vérifier les conditions (SAUF GCD)
        const now = Date.now();
        const cd = player.cooldowns.get(skill.id);
        if (cd && cd > now) {
            // Pas encore prêt, on attend le prochain tick
            return false;
        }
    
        if (skill.manaCost && player.resource < skill.manaCost) {
            // Pas assez de ressource, on vide la file
            player.queuedSkill = "";
            broadcast(player.sessionId, "queue_fail", { reason: "resource" });
            return false;
        }
        
        const dist = this.dist(player, monster);
        if (dist > skill.range) {
            // Hors de portée, on vide la file
            player.queuedSkill = "";
            broadcast(player.sessionId, "queue_fail", { reason: "range" });
            return false;
        }
    
        // Toutes les conditions sont réunies, on exécute !
        this.cast(player, monster, skill, broadcast, gameState);
        
        // On vide la file d'attente après un lancement réussi
        player.queuedSkill = "";
        
        return true;
    }
    // =====================================================
    // APPLY SKILL EFFECT
    // =====================================================
    private static applySkillEffect(
        player: PlayerState,
        monster: MonsterState,
        skill: SkillDefinition,
        broadcast: (sessionId: string, type: string, data: any) => void,
        gameState: GameState
    ) {

        switch (skill.effectType) {

            case "damage":
                this.applyDamageSkill(player, monster, skill, broadcast);
                break;

            case "aoe":
                this.applyAoeSkill(player, skill, broadcast, gameState);
                break;

            case "buff":
                this.applyBuff(player, skill, broadcast);
                break;

            case "heal":
                this.applyHeal(player, skill, broadcast);
                break;
        }

        broadcast(player.sessionId, "skill_cast", { skillId: skill.id });
    }

    // DAMAGE
    private static applyDamageSkill(
        player: PlayerState,
        monster: MonsterState,
        skill: SkillDefinition,
        broadcast: any
    ) {
        const dmg = Math.max(1, skill.power + player.attackPower - monster.defense);
        monster.setHp(monster.hp - dmg);

        broadcast(player.sessionId, "skill_damage", {
            skillId: skill.id,
            targetId: monster.monsterId,
            damage: dmg,
            hpLeft: monster.hp
        });
    }

    // HEAL
    private static applyHeal(
        player: PlayerState,
        skill: SkillDefinition,
        broadcast: any
    ) {
        const amount = Math.max(1, skill.power);
        player.hp = Math.min(player.maxHp, player.hp + amount);

        broadcast(player.sessionId, "skill_heal", {
            skillId: skill.id,
            heal: amount,
            hp: player.hp
        });
    }

    // BUFF
    private static applyBuff(
        player: PlayerState,
        skill: SkillDefinition,
        broadcast: any
    ) {
        if (!skill.buffId) return;

        const duration = skill.duration ?? 0;

        player.activeBuffs.set(skill.buffId, Date.now() + duration);

        broadcast(player.sessionId, "skill_buff", {
            skillId: skill.id,
            buffId: skill.buffId,
            duration
        });
    }

    // AOE
    private static applyAoeSkill(
        player: PlayerState,
        skill: SkillDefinition,
        broadcast: any,
        gameState: GameState
    ) {
        const radius = skill.radius ?? 4;
        let hits = 0;

        for (const monster of gameState.monsters.values()) {
            const d = this.dist(player, monster);

            if (d <= radius && monster.isAlive) {
                const dmg = Math.max(1, skill.power + player.attackPower - monster.defense);
                monster.setHp(monster.hp - dmg);
                hits++;
            }
        }

        broadcast(player.sessionId, "skill_aoe", {
            skillId: skill.id,
            hits,
            radius
        });
    }

    // RESOURCE
    private static consumeResources(player: PlayerState, skill: SkillDefinition) {
        if (skill.manaCost)
            player.resource = Math.max(0, player.resource - skill.manaCost);

        if (skill.energyCost)
            player.resource = Math.max(0, player.resource - skill.energyCost);
    }

    // UTILS
    private static dist(a: PlayerState, b: MonsterState): number {
        return Math.sqrt(
            (a.posX - b.posX) ** 2 +
            (a.posY - b.posY) ** 2 +
            (a.posZ - b.posZ) ** 2
        );
    }
}
