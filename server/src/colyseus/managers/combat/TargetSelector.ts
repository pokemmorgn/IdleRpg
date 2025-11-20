import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";
import { MapSchema } from "@colyseus/schema";

export class TargetSelector {

    /**
     * Retourne le monstre le plus proche dans une portée donnée
     */
    static getNearestInRange(
        player: PlayerState,
        monsters: MapSchema<MonsterState>,
        maxRange: number
    ): MonsterState | null {

        let nearest: MonsterState | null = null;
        let minDist = maxRange;

        monsters.forEach(monster => {
            if (!this.isValidTarget(monster)) return;

            const d = this.dist(player, monster);
            if (d < minDist) {
                nearest = monster;
                minDist = d;
            }
        });

        return nearest;
    }

    /**
     * Retourne simplement le monstre le plus proche, sans limite
     */
    static getNearestAny(
        player: PlayerState,
        monsters: MapSchema<MonsterState>
    ): MonsterState | null {

        let nearest: MonsterState | null = null;
        let minDist = Number.MAX_VALUE;

        monsters.forEach(monster => {
            if (!this.isValidTarget(monster)) return;

            const d = this.dist(player, monster);
            if (d < minDist) {
                nearest = monster;
                minDist = d;
            }
        });

        return nearest;
    }

    /**
     * Vérifie si un monstre est une vraie cible
     */
    static isValidTarget(monster: MonsterState): boolean {
        return (
            monster &&
            monster.isAlive &&
            !monster.isDead &&
            monster.hp > 0
        );
    }

    /**
     * Vérifie si un monstre est dans la portée d'un skill donné
     */
    static isInSkillRange(
        player: PlayerState,
        monster: MonsterState,
        range: number
    ): boolean {
        return this.dist(player, monster) <= range;
    }

    /**
     * Distances utilitaires
     */
    static dist(a: PlayerState, b: MonsterState): number {
        return Math.sqrt(
            (a.posX - b.posX) ** 2 +
            (a.posY - b.posY) ** 2 +
            (a.posZ - b.posZ) ** 2
        );
    }
}
