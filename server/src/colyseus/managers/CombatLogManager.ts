import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { MonsterState } from "../schema/MonsterState";

export interface CombatLogEntry {
    timestamp: number;
    action: string;          // "hit" | "crit" | "miss" | "dodge" | ...
    actorId: string;
    actorType: "player" | "monster";
    targetId: string;
    targetType: "player" | "monster";
    value?: number;          // dmg/heal
    skillId?: string;
    zoneId?: string;
}

export class CombatLogManager {

    constructor(
        private readonly state: GameState,
        private readonly broadcast: (sessionId: string, type: string, data: any) => void
    ) {}

    // ---------------------------------------
    // 🌍 ENVOI AUX JOUEURS DANS UNE ZONE
    // ---------------------------------------
    private sendToZone(zoneId: string, entry: CombatLogEntry) {
        for (const [_, player] of this.state.players) {
            if (player.zoneId === zoneId) {
                this.broadcast(player.sessionId, "combat_log", entry);
            }
        }
    }

    // ---------------------------------------
    // 🎯 ENVOI À UN SEUL JOUEUR
    // ---------------------------------------
    private sendToPlayer(player: PlayerState, entry: CombatLogEntry) {
        this.broadcast(player.sessionId, "combat_log", entry);
    }

    // ---------------------------------------
    // 🧱 CRÉATEUR DE LOG
    // ---------------------------------------
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

    // ============================================================
    // 🔥 API PUBLIQUE – APPELÉE PAR CombatManager / Skills / AI
    // ============================================================

    // ---------------------------------------
    // 🗡️ Touché (autos / skills)
    // ---------------------------------------
    hit(player: PlayerState, monster: MonsterState, damage: number, skillId?: string) {
        const entry = this.createEntry({
            action: "hit",
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

    // ---------------------------------------
    // 💥 Coup critique
    // ---------------------------------------
    crit(player: PlayerState, monster: MonsterState, damage: number, skillId?: string) {
        const entry = this.createEntry({
            action: "crit",
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

    // ---------------------------------------
    // 🛑 Miss / Dodge
    // ---------------------------------------
    miss(player: PlayerState, monster: MonsterState) {
        const entry = this.createEntry({
            action: "miss",
            actorId: player.profileId,
            actorType: "player",
            targetId: monster.monsterId,
            targetType: "monster",
            zoneId: player.zoneId
        });

        this.sendToZone(player.zoneId, entry);
    }

    dodge(monster: MonsterState, player: PlayerState) {
        const entry = this.createEntry({
            action: "dodge",
            actorId: monster.monsterId,
            actorType: "monster",
            targetId: player.profileId,
            targetType: "player",
            zoneId: player.zoneId
        });

        this.sendToPlayer(player, entry);
    }

    // ---------------------------------------
    // 🐺 Dégâts du monstre au joueur
    // ---------------------------------------
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

    // ---------------------------------------
    // 💀 Mort de monstre
    // ---------------------------------------
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

    // ---------------------------------------
    // ⚰️ Mort du joueur
    // ---------------------------------------
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
}
