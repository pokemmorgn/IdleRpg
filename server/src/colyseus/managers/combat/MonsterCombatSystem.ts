import { GameState } from "../../schema/GameState";
import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";
import { CombatUtils } from "./CombatUtils";

export class MonsterCombatSystem {

    private readonly MONSTER_ATTACK_COOLDOWN = 2000; // ms

    constructor(
        private readonly gameState: GameState,
        private readonly broadcast: (sessionId: string, type: string, data: any) => void
    ) {}

    update(dt: number) {
        this.gameState.monsters.forEach(monster => {
            if (!monster.isAlive) return;
            this.updateMonster(monster, dt);
        });
    }

    private updateMonster(monster: MonsterState, dt: number) {
        console.log(`⚔️ Monster tick: ${monster.monsterId}, target=${monster.targetPlayerId}, alive=${monster.isAlive}, atkTimer=${monster.attackTimer}`);
        monster.attackTimer += dt;

        // Pas de cible → idle
        if (!monster.targetPlayerId) {
            const nearest = this.findNearestPlayer(monster, 25); // range d’aggro 25
            if (nearest) {
                monster.targetPlayerId = nearest.sessionId;
                console.log(`👁‍🗨 Monster ${monster.monsterId} aggro ${nearest.characterName}`);
            }
        }

        const target = this.gameState.players.get(monster.targetPlayerId);
        if (!target || target.isDead) {
            monster.targetPlayerId = "";
            return;
        }

        // Distance check
        const dist = this.getDistance(monster, target);
        if (dist > monster.attackRange) return;

        // Pas encore prêt à attaquer
        if (monster.attackTimer < this.MONSTER_ATTACK_COOLDOWN) return;

        // =======================
        //     ATTAQUE DU MONSTRE
        // =======================
        const dmg = Math.max(1, monster.attack - target.armor);
        target.hp = Math.max(0, target.hp - dmg);

        // Marquer l'agresseur pour que le joueur contre-attaque
        target.lastAttackerId = monster.monsterId;

        // =======================
        //        LOG HUD
        // =======================
        this.broadcast(target.sessionId, "playerDamaged", {
            type: "monster_attack",
            monsterId: monster.monsterId,
            monsterName: monster.name,
            damage: dmg,
            hpLeft: target.hp
        });

        // Reset du timer d’attaque
        monster.attackTimer = 0;

        // =======================
        //     MORT DU JOUEUR
        // =======================
        if (target.hp <= 0 && !target.isDead) {
            target.isDead = true;

            this.broadcast(target.sessionId, "playerKilled", {
                byMonster: monster.monsterId,
                monsterName: monster.name
            });

            // Le monstre oublie la cible
            monster.targetPlayerId = "";
            return;
        }
    }
        private findNearestPlayer(monster: MonsterState, range: number): PlayerState | null {
            let nearest: PlayerState | null = null;
            let bestDist = range;
        
            this.gameState.players.forEach(player => {
                if (player.isDead) return;
        
                const d = this.getDistance(monster, player);
                if (d < bestDist) {
                    bestDist = d;
                    nearest = player;
                }
            });
        
            return nearest;
        }

    private getDistance(a: MonsterState, b: PlayerState): number {
        const dx = a.posX - b.posX;
        const dy = a.posY - b.posY;
        const dz = a.posZ - b.posZ;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}
