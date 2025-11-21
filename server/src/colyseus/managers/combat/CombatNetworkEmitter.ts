import { GameState } from "../../schema/GameState";
import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";

/**
 * CombatNetworkEmitter
 * ---------------------
 * Unique responsable de l'envoi des événements de combat
 * vers les clients via broadcast(sessionId, "combat_event", payload).
 */
export class CombatNetworkEmitter {

    constructor(
        private readonly gameState: GameState,
        private readonly broadcast: (sessionId: string, type: string, data: any) => void
    ) {}

    // ===========================================================
    // UTILITAIRE : envoyer dans une zone entière
    // ===========================================================
    private sendToZone(zoneId: string, payload: any) {
        for (const p of this.gameState.players.values()) {
            if (p.zoneId === zoneId) {
                this.broadcast(p.sessionId, "combat_event", payload);
            }
        }
    }

    // ===========================================================
    // UTILITAIRE : envoyer à un seul joueur
    // ===========================================================
    private sendToPlayer(player: PlayerState, payload: any) {
        this.broadcast(player.sessionId, "combat_event", payload);
    }

    // ===========================================================
    // COMBAT : LIFECYCLE
    // ===========================================================
    emitCombatStart(player: PlayerState) {
        this.sendToPlayer(player, {
            event: "combat_start",
            playerId: player.profileId
        });
    }

    emitCombatEnd(player: PlayerState) {
        this.sendToPlayer(player, {
            event: "combat_end",
            playerId: player.profileId
        });
    }

    // ===========================================================
    // TARGET / AGGRO
    // ===========================================================
    emitTargetChange(player: PlayerState, newTargetId: string | null) {
        this.sendToPlayer(player, {
            event: "target_change",
            targetId: newTargetId
        });
    }

    emitAggro(monster: MonsterState, player: PlayerState) {
        this.sendToZone(player.zoneId, {
            event: "aggro",
            monsterId: monster.monsterId,
            playerId: player.profileId
        });
    }

    emitThreatUpdate(monster: MonsterState, player: PlayerState, value: number) {
        this.sendToPlayer(player, {
            event: "threat_update",
            monsterId: monster.monsterId,
            value
        });
    }

    // ===========================================================
    // DAMAGE & HP
    // ===========================================================
    emitPlayerHit(player: PlayerState, monster: MonsterState, damage: number, crit: boolean, skillId?: string) {
        this.sendToZone(player.zoneId, {
            event: crit ? "crit" : "hit",
            source: "player",
            target: "monster",
            sourceId: player.profileId,
            targetId: monster.monsterId,
            damage,
            remainingHp: monster.hp,
            maxHp: monster.maxHp,
            skillId: skillId ?? "auto_attack"
        });
    }

    emitMonsterHit(monster: MonsterState, player: PlayerState, damage: number) {
        this.sendToZone(player.zoneId, {
            event: "hit",
            source: "monster",
            target: "player",
            sourceId: monster.monsterId,
            targetId: player.profileId,
            damage,
            remainingHp: player.hp,
            maxHp: player.maxHp
        });
    }

    emitMiss(attackerId: string, targetId: string, zoneId: string) {
        this.sendToZone(zoneId, {
            event: "miss",
            attackerId,
            targetId
        });
    }

    emitDodge(attackerId: string, targetId: string, zoneId: string) {
        this.sendToZone(zoneId, {
            event: "dodge",
            attackerId,
            targetId
        });
    }

    emitBlock(attackerId: string, targetId: string, amount: number, zoneId: string) {
        this.sendToZone(zoneId, {
            event: "block",
            attackerId,
            targetId,
            amount
        });
    }

    emitHPUpdate(entityId: string, hp: number, maxHp: number, zoneId: string) {
        this.sendToZone(zoneId, {
            event: "hp_update",
            entityId,
            hp,
            maxHp
        });
    }

    // ===========================================================
    // CASTING
    // ===========================================================
    emitCastStart(player: PlayerState, skillId: string, castTime: number) {
        this.sendToPlayer(player, {
            event: "cast_start",
            skillId,
            castTime
        });
    }

    emitCastEnd(player: PlayerState, skillId: string) {
        this.sendToPlayer(player, {
            event: "cast_end",
            skillId
        });
    }

    emitCastCancel(player: PlayerState, reason: string) {
        this.sendToPlayer(player, {
            event: "cast_cancel",
            reason
        });
    }

    emitCastInterrupted(player: PlayerState, skillId: string, reason: string) {
        this.sendToPlayer(player, {
            event: "cast_interrupted",
            skillId,
            reason
        });
    }

    emitSkillExecute(player: PlayerState, skillId: string) {
        this.sendToPlayer(player, {
            event: "skill_execute",
            skillId
        });
    }

    emitCooldown(player: PlayerState, skillId: string, cd: number) {
        this.sendToPlayer(player, {
            event: "skill_cooldown",
            skillId,
            cooldown: cd
        });
    }

    // ===========================================================
    // HEAL / BUFF / DOT / HOT
    // ===========================================================
    emitHeal(player: PlayerState, amount: number, skillId: string) {
        this.sendToZone(player.zoneId, {
            event: "heal",
            playerId: player.profileId,
            amount,
            skillId,
            hp: player.hp,
            maxHp: player.maxHp
        });
    }

    emitOverheal(player: PlayerState, amount: number, skillId: string) {
        this.sendToZone(player.zoneId, {
            event: "overheal",
            playerId: player.profileId,
            amount,
            skillId
        });
    }

    emitBuffApply(player: PlayerState, buffId: string, duration: number) {
        this.sendToZone(player.zoneId, {
            event: "buff_apply",
            buffId,
            duration,
            playerId: player.profileId
        });
    }

    emitBuffRefresh(player: PlayerState, buffId: string, duration: number) {
        this.sendToZone(player.zoneId, {
            event: "buff_refresh",
            buffId,
            duration,
            playerId: player.profileId
        });
    }

    emitBuffExpire(player: PlayerState, buffId: string) {
        this.sendToZone(player.zoneId, {
            event: "buff_expire",
            buffId,
            playerId: player.profileId
        });
    }

    emitDotTick(sourceId: string, targetId: string, damage: number, zoneId: string) {
        this.sendToZone(zoneId, {
            event: "dot_tick",
            sourceId,
            targetId,
            damage
        });
    }

    emitHotTick(player: PlayerState, amount: number, zoneId: string) {
        this.sendToZone(zoneId, {
            event: "hot_tick",
            playerId: player.profileId,
            amount,
            hp: player.hp,
            maxHp: player.maxHp
        });
    }

    // ===========================================================
    // CONTROL (CC)
    // ===========================================================
    emitStun(targetId: string, zoneId: string) {
        this.sendToZone(zoneId, { event: "stun", targetId });
    }

    emitSilence(targetId: string, zoneId: string) {
        this.sendToZone(zoneId, { event: "silence", targetId });
    }

    emitRoot(targetId: string, zoneId: string) {
        this.sendToZone(zoneId, { event: "root", targetId });
    }

    // ===========================================================
    // DEATH / RESPAWN
    // ===========================================================
    emitMonsterDeath(monster: MonsterState, killer: PlayerState) {
        this.sendToZone(killer.zoneId, {
            event: "death",
            entity: "monster",
            entityId: monster.monsterId,
            killerId: killer.profileId
        });
    }

    emitPlayerDeath(player: PlayerState, killer: MonsterState) {
        this.sendToZone(player.zoneId, {
            event: "death",
            entity: "player",
            entityId: player.profileId,
            killerId: killer.monsterId
        });
    }

    emitRespawn(entityId: string, zoneId: string) {
        this.sendToZone(zoneId, {
            event: "respawn",
            entityId
        });
    }
    // ===========================================================
    // PLAYER RESPAWN (correct)
    // ===========================================================
    emitPlayerRespawn(player: PlayerState) {
        this.sendToPlayer(player, {
            event: "respawn",
            entity: "player",
            entityId: player.profileId,
            hp: player.hp,
            maxHp: player.maxHp,
            x: player.posX,
            y: player.posY,
            z: player.posZ
        });
    }
}
