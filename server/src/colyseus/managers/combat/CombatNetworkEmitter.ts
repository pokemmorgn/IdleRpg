import { GameState } from "../../schema/GameState";
import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";

export class CombatNetworkEmitter {

    constructor(
        private readonly gameState: GameState,
        private readonly broadcast: (sessionId: string, type: string, data: any) => void
    ) {}

    // ============================================================
    // 🗡 PLAYER → MONSTER
    // ============================================================
    emitPlayerHit(player: PlayerState, monster: MonsterState, damage: number, crit: boolean, skillId?: string) {

        const payload = {
            type: "combat_event",
            event: "hit",
            source: "player",
            target: "monster",
            sourceId: player.profileId,
            targetId: monster.monsterId,
            damage,
            crit,
            skillId: skillId ?? "auto_attack",
            remainingHp: monster.hp,
            maxHp: monster.maxHp
        };

        // Broadcast seulement dans la zone du joueur
        this.sendToZone(player.zoneId, payload);
    }

    // ============================================================
    // 👹 MONSTER → PLAYER
    // ============================================================
    emitMonsterHit(monster: MonsterState, player: PlayerState, damage: number) {

        const payload = {
            type: "combat_event",
            event: "hit",
            source: "monster",
            target: "player",
            sourceId: monster.monsterId,
            targetId: player.profileId,
            damage,
            remainingHp: player.hp,
            maxHp: player.maxHp
        };

        this.sendToZone(player.zoneId, payload);
    }

    // ============================================================
    // 💀 MONSTER DEATH
    // ============================================================
    emitMonsterDeath(monster: MonsterState, killer: PlayerState) {

        const payload = {
            type: "combat_event",
            event: "death",
            entity: "monster",
            entityId: monster.monsterId,
            killerId: killer.profileId
        };

        this.sendToZone(killer.zoneId, payload);
    }

    // ============================================================
    // ⚰ PLAYER DEATH
    // ============================================================
    emitPlayerDeath(player: PlayerState, monster: MonsterState) {

        const payload = {
            type: "combat_event",
            event: "death",
            entity: "player",
            entityId: player.profileId,
            killerId: monster.monsterId
        };

        this.sendToZone(player.zoneId, payload);
    }

    // ============================================================
    // 🔥 CAST START
    // ============================================================
    emitCastStart(player: PlayerState, skillId: string) {

        const payload = {
            type: "combat_event",
            event: "cast_start",
            playerId: player.profileId,
            skillId
        };

        this.broadcast(player.sessionId, "combat_event", payload);
    }

    // ============================================================
    // ❌ CAST CANCEL
    // ============================================================
    emitCastCancel(player: PlayerState, reason: string) {

        const payload = {
            type: "combat_event",
            event: "cast_cancel",
            reason
        };

        this.broadcast(player.sessionId, "combat_event", payload);
    }

    // ============================================================
    // 🩹 HEAL
    // ============================================================
    emitPlayerHeal(player: PlayerState, amount: number, skillId: string) {

        const payload = {
            type: "combat_event",
            event: "heal",
            amount,
            skillId,
            hp: player.hp,
            maxHp: player.maxHp
        };

        this.sendToZone(player.zoneId, payload);
    }

    // ============================================================
    // ⭐ BUFF
    // ============================================================
    emitBuff(player: PlayerState, buffId: string, duration: number) {

        const payload = {
            type: "combat_event",
            event: "buff",
            buffId,
            duration
        };

        this.sendToZone(player.zoneId, payload);
    }

    // ============================================================
    // UTILITAIRE
    // ============================================================
    private sendToZone(zoneId: string, payload: any) {
        for (const p of this.gameState.players.values()) {
            if (p.zoneId === zoneId) {
                this.broadcast(p.sessionId, "combat_event", payload);
            }
        }
    }
}
