import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { MonsterState } from "../schema/MonsterState";

import { OnlineCombatSystem } from "./combat/OnlineCombatSystem";
import { MonsterCombatSystem } from "./combat/MonsterCombatSystem";

import { CombatEventCallbacks } from "./combat/CombatEventCallbacks";
import { CombatNetworkEmitter } from "./combat/CombatNetworkEmitter";
import { LevelManager } from "./LevelManager";
import { QuestObjectiveManager } from "./QuestObjectiveManager";

export class CombatManager implements CombatEventCallbacks {

    private onlineSystem: OnlineCombatSystem;
    private monsterSystem: MonsterCombatSystem;
    private net: CombatNetworkEmitter;
    private levelManager: LevelManager;
    constructor(
        private readonly gameState: GameState,
        private readonly broadcast: (sessionId: string, type: string, data: any) => void,
        private readonly questObjectiveManager?: QuestObjectiveManager
    ) {
        this.net = new CombatNetworkEmitter(gameState, broadcast);
        this.levelManager = new LevelManager(broadcast);
        this.onlineSystem = new OnlineCombatSystem(
            this.gameState,
            this
        );

        this.monsterSystem = new MonsterCombatSystem(
            this.gameState,
            this
        );
    }

    // ======================================================
    // 🔄 UPDATE LOOP
    // ======================================================
    update(deltaTime: number) {

        // Monsters first
        this.monsterSystem.update(deltaTime);

        // Players
        for (const player of this.gameState.players.values()) {

            player.updateCombatTimers(deltaTime);

            if (player.isDead) continue;

            this.onlineSystem.update(player, deltaTime);
        }
    }

    // ======================================================
    // 🛑 STOP COMBAT
    // ======================================================
    public forceStopCombat(player: PlayerState) {
        player.inCombat = false;
        player.targetMonsterId = "";
    }

    // ======================================================
    // 🔥 RESPAWN PLAYER
    // ======================================================
    public respawnPlayer(player: PlayerState) {

        console.log(`🔄 Respawning player: ${player.characterName}`);

        // Restore stats
        player.hp = player.maxHp;
        player.isDead = false;

        // Reset combat
        player.inCombat = false;
        player.targetMonsterId = "";
        player.lastAttackerId = "";

        // Reset locks
        player.castLockRemaining = 0;
        player.animationLockRemaining = 0;
        player.currentCastingSkillId = "";
        player.currentAnimationLockType = "none";

        // Reset position
        player.posX = 0;
        player.posY = 0;
        player.posZ = 0;

        // Internal callback
        this.onPlayerRespawn?.(player);

        // Notify client
        this.net.emitPlayerRespawn(player);
    }

    // ======================================================
    // 🗡 PLAYER → MONSTER (AUTO)
    // ======================================================
    onPlayerHit(
        player: PlayerState,
        monster: MonsterState,
        damage: number,
        crit: boolean,
        skillId?: string
    ) {
        this.net.emitPlayerHit(player, monster, damage, crit, skillId);
    }

    // ======================================================
    // 🎯 PLAYER → MONSTER (SKILL)
    // ======================================================
    onPlayerSkillHit(
        player: PlayerState,
        monster: MonsterState,
        damage: number,
        crit: boolean,
        skillId: string
    ) {
        this.net.emitPlayerHit(player, monster, damage, crit, skillId);
    }

    // ======================================================
    // 👹 MONSTER → PLAYER (DAMAGE)
    // ======================================================
    onMonsterHit(monster: MonsterState, player: PlayerState, damage: number) {
        this.net.emitMonsterHit(monster, player, damage);
    }

    // ======================================================
    // ❤️ HP UPDATE
    // ======================================================
    onHpUpdate(player: PlayerState) {
        this.net.emitHPUpdate(
            player.profileId,
            player.hp,
            player.maxHp,
            player.zoneId
        );
    }

    // ======================================================
    // 🎯 MONSTER → PLAYER (MISS / DODGE / CRIT)
    // ======================================================
    onMiss(monster: MonsterState, player: PlayerState) {
        this.net.emitMiss(monster.monsterId, player.profileId, player.zoneId);
    }

    onDodge(monster: MonsterState, player: PlayerState) {
        this.net.emitDodge(monster.monsterId, player.profileId, player.zoneId);
    }

    onCrit(monster: MonsterState, player: PlayerState, extraDamage: number) {
        this.net.emitMonsterHit(monster, player, extraDamage);
    }

    // ======================================================
    // 💀 DEATH EVENTS
    // ======================================================
    onMonsterDeath(monster: MonsterState, killer: PlayerState) {
        this.net.emitMonsterDeath(monster, killer);
    
        // 🔥 GIVE XP (ex: monster.level * 20)
        const baseXP = Math.max(5, monster.level * 20);
        this.levelManager.giveXP(killer, baseXP);
    
        // 🔥 QUEST HOOK
        if (this.questObjectiveManager && killer) {
            this.questObjectiveManager.onMonsterKilled(killer, {
                enemyType: monster.type,
                enemyRarity: (monster as any).rarity ?? undefined,
                isBoss: (monster as any).isBoss ?? false,
                zoneId: killer.zoneId
            });
        }
    }


    onPlayerDeath(player: PlayerState, monster: MonsterState) {
        this.net.emitPlayerDeath(player, monster);
    }

    // ======================================================
    // 🎬 CAST EVENTS
    // ======================================================
    onCastStart(player: PlayerState, skillId: string) {
        this.net.emitCastStart(player, skillId, 0);
    }

    onCastCancel(player: PlayerState, reason: string) {
        this.net.emitCastCancel(player, reason);
    }

    // ======================================================
    // 🩹 HEAL
    // ======================================================
    onPlayerHeal(player: PlayerState, amount: number, skillId: string) {
        this.net.emitHeal(player, amount, skillId);
    }

    // ======================================================
    // 💡 BUFF
    // ======================================================
    onApplyBuff(player: PlayerState, buffId: string, duration: number) {
        this.net.emitBuffApply(player, buffId, duration);
    }

    // ======================================================
    // 🧲 THREAT
    // ======================================================
    onThreatUpdate(monster: MonsterState, player: PlayerState, threat: number) {
        this.net.emitThreatUpdate(monster, player, threat);
    }

    onThreatLost(monster: MonsterState) {
        // optional
    }

    // ======================================================
    // 🔄 RESPAWN CALLBACK
    // ======================================================
    onPlayerRespawn(player: PlayerState) {
        // Internal only
    }
}
