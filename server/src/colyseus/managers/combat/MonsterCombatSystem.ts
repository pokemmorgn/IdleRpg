import { GameState } from "../../schema/GameState";
import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";
import { CombatEventCallbacks } from "./CombatEventCallbacks";
import { CombatUtils } from "./CombatUtils";

export class MonsterCombatSystem {

    private readonly MONSTER_ATTACK_COOLDOWN = 2000;

    constructor(
        private readonly gameState: GameState,
        private readonly cb: CombatEventCallbacks
    ) {}

    // ======================================================
    // 🔄 UPDATE
    // ======================================================
    update(dt: number) {
        this.gameState.monsters.forEach(monster => {
            this.updateMonster(monster, dt);
        });
    }

    // ======================================================
    // 🧠 MONSTER LOGIC
    // ======================================================
    private updateMonster(monster: MonsterState, dt: number) {

        // ------------------------------------------------------
        // 🌱 0) RESPAWN
        // ------------------------------------------------------
        if (monster.isDead) {

            if (!monster.respawnOnDeath) return;

            monster.respawnTimer += dt;

            if (monster.respawnTimer >= monster.respawnTime * 1000) {

                monster.respawnTimer = 0;
                monster.setHp(monster.maxHp);
                monster.targetPlayerId = "";

                console.log(`[MonsterState] Respawn de ${monster.name} (${monster.monsterId})`);

                this.cb.onMonsterRespawn?.(monster);
            }

            return;
        }

        // ------------------------------------------------------
        // 🎯 1) CHERCHER UNE CIBLE SI PAS D’AGGRO
        // ------------------------------------------------------
        if (!monster.targetPlayerId) {
            const nearest = this.findNearestPlayer(monster, monster.aggroRange);

            if (nearest) {
                monster.targetPlayerId = nearest.sessionId;
                this.cb.onAggro?.(monster, nearest);
            }
            else {
                return; // rien à faire
            }
        }

        const target = this.gameState.players.get(monster.targetPlayerId);
        if (!target || !CombatUtils.isValidTarget(target)) {
            monster.targetPlayerId = "";
            return;
        }

        // ------------------------------------------------------
        // 🪢 2) LEASH : trop loin du spawn → reset
        // ------------------------------------------------------
        const distFromSpawn = this.getDistanceXYZ(monster, { posX: 0, posY: 0, posZ: 0 }); // À remplacer par tes spawn pos si needed

        if (distFromSpawn > monster.leashRange) {
            monster.targetPlayerId = "";
            return;
        }

        // ------------------------------------------------------
        // 📏 3) DISTANCE ACTUELLE AVEC LE JOUEUR
        // ------------------------------------------------------
        const dist = this.getDistanceXYZ(monster, target);

        // ------------------------------------------------------
        // 🏃 4) DEPLACEMENT VERS LE JOUEUR
        // ------------------------------------------------------
        if (dist > monster.attackRange) {
            this.moveTowards(monster, target, dt);
            return;
        }

        // ------------------------------------------------------
        // ⏳ 5) ATTAQUE SI DANS LE RANGE
        // ------------------------------------------------------
        monster.attackTimer += dt;

        if (monster.attackTimer < this.MONSTER_ATTACK_COOLDOWN) return;
        monster.attackTimer = 0;

        // ------------------------------------------------------
        // 💥 6) HIT
        // ------------------------------------------------------
        const damage = Math.max(1, monster.attack - target.armor);

        target.hp = Math.max(0, target.hp - damage);
        target.lastAttackerId = monster.monsterId;

        this.cb.onMonsterHit(monster, target, damage);
        this.cb.onThreatUpdate?.(monster, target, damage);

        // ------------------------------------------------------
        // 💀 7) PLAYER DEATH
        // ------------------------------------------------------
        if (target.hp <= 0 && !target.isDead) {
            target.isDead = true;
            target.hp = 0;

            this.cb.onPlayerDeath(target, monster);
            this.cb.onThreatLost?.(monster);

            monster.targetPlayerId = "";
        }
    }

    // ======================================================
    // 🔍 TROUVER JOUEUR LE PLUS PROCHE
    // ======================================================
    private findNearestPlayer(monster: MonsterState, range: number): PlayerState | null {
        let best: PlayerState | null = null;
        let bestDist = range;

        this.gameState.players.forEach(player => {
            if (!CombatUtils.isValidTarget(player)) return;

            const d = this.getDistanceXYZ(monster, player);
            if (d < bestDist) {
                bestDist = d;
                best = player;
            }
        });

        return best;
    }

    // ======================================================
    // 📏 DISTANCE
    // ======================================================
    private getDistanceXYZ(a: { posX: number; posY: number; posZ: number }, b: { posX: number; posY: number; posZ: number }): number {
        const dx = a.posX - b.posX;
        const dy = a.posY - b.posY;
        const dz = a.posZ - b.posZ;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }

    // ======================================================
    // 🏃 DEPLACEMENT
    // ======================================================
    private moveTowards(monster: MonsterState, target: PlayerState, dt: number) {

        const dirX = target.posX - monster.posX;
        const dirY = target.posY - monster.posY;
        const dirZ = target.posZ - monster.posZ;

        const len = Math.sqrt(dirX*dirX + dirY*dirY + dirZ*dirZ);
        if (len === 0) return;

        const speed = monster.speed * (dt / 1000);

        monster.posX += (dirX / len) * speed;
        monster.posZ += (dirZ / len) * speed;

        // Rotation simple sur l’axe Y uniquement
        monster.rotY = Math.atan2(dirX, dirZ);
    }
}
