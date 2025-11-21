import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { MonsterState } from "../schema/MonsterState";

export interface CombatLogEntry {
    timestamp: number;
    action: string;
    actorId: string;
    actorType: "player" | "monster";
    targetId: string;
    targetType: "player" | "monster";
    value?: number;
    skillId?: string;
    zoneId?: string;
}

export class CombatLogManager {

    constructor(
        private readonly state: GameState,
        private readonly broadcast: (sessionId: string, type: string, data: any) => void
    ) {}

    // ---------------------------------------
    // Envoi zone
    // ---------------------------------------
    private sendToZone(zoneId: string, entry: CombatLogEntry) {
        for (const [_, player] of this.state.players) {
            if (player.zoneId === zoneId) {
                this.broadcast(player.sessionId, "combat_log", entry);
            }
        }
    }

    // ---------------------------------------
    // Envoi joueur unique
    // ---------------------------------------
    private sendToPlayer(player: PlayerState, entry: CombatLogEntry) {
        this.broadcast(player.sessionId, "combat_log", entry);
    }

    private createEntry(params: Partial<CombatLogEntry>): CombatLogEntry {
        return {
            timestamp: Date.now(),
            action: params.action || "unknown",
            actorId: params.actorId || "",
            actorType: params.actorType || "player",
            targetId: params.targetId || "",
            targetType: params.targetType || "monster",
            value: params.value,
            skillId: params.skillId,
            zoneId: params.zoneId
        };
    }

    // ==========================================================
    // PLAYER → MONSTER HIT
    // ==========================================================
    hit(
        player: PlayerState,
        monster: MonsterState,
        damage: number,
        skillId?: string,
        crit: boolean = false
    ) {
        const entry = this.createEntry({
            action: crit ? "crit" : "hit",
            actorId: player.profileId,
            actorType: "player",
            targetId: monster.monsterId,
            targetType: "monster",
            value: damage,
            skillId,
            zoneId: player.zoneId
        });

        this.sendToZone(player.zoneId, entry);
    }

    // ==========================================================
    // MONSTER HIT PLAYER
    // ==========================================================
    monsterHit(monster: MonsterState, player: PlayerState, damage: number) {
        const entry = this.createEntry({
            action: "monster_hit",
            actorId: monster.monsterId,
            actorType: "monster",
            targetId: player.profileId,
            targetType: "player",
            value: damage,
            zoneId: player.zoneId
        });

        this.sendToZone(player.zoneId, entry);
    }

    // ==========================================================
    // MONSTER DEATH
    // ==========================================================
    monsterDeath(monster: MonsterState, killer: PlayerState) {
        const entry = this.createEntry({
            action: "monster_death",
            actorId: killer.profileId,
            actorType: "player",
            targetId: monster.monsterId,
            targetType: "monster",
            zoneId: killer.zoneId
        });

        this.sendToZone(killer.zoneId, entry);
    }

    // ==========================================================
    // PLAYER DEATH
    // ==========================================================
    playerDeath(player: PlayerState, monster: MonsterState) {
        const entry = this.createEntry({
            action: "player_death",
            actorId: monster.monsterId,
            actorType: "monster",
            targetId: player.profileId,
            targetType: "player",
            zoneId: player.zoneId
        });

        this.sendToZone(player.zoneId, entry);
    }

    // ==========================================================
    // CAST START
    // ==========================================================
    castStart(player: PlayerState, skillId: string) {
        const entry = this.createEntry({
            action: "cast_start",
            actorId: player.profileId,
            actorType: "player",
            targetId: "",
            targetType: "monster",
            skillId,
            zoneId: player.zoneId
        });

        this.sendToZone(player.zoneId, entry);
    }

    // ==========================================================
    // CAST CANCEL
    // ==========================================================
    castCancel(player: PlayerState, reason: string) {
        const entry = this.createEntry({
            action: "cast_cancel",
            actorId: player.profileId,
            actorType: "player",
            targetId: "",
            targetType: "monster",
            value: undefined,
            skillId: reason,
            zoneId: player.zoneId
        });

        this.sendToZone(player.zoneId, entry);
    }
}
