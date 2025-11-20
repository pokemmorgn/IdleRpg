import { GameState } from "../../schema/GameState";
import { PlayerState } from "../../schema/PlayerState";
import { MonsterState } from "../../schema/MonsterState";
import { CombatUtils } from "./CombatUtils";

export class MonsterCombatSystem {

    // Temps entre deux attaques de monstre (en ms)
    private readonly MONSTER_ATTACK_COOLDOWN = 2000; 

    constructor(
        private readonly gameState: GameState,
        private readonly broadcast: (sessionId: string, type: string, data: any) => void
    ) {}

    /**
     * Met à jour la logique de combat de tous les monstres.
     * @param dt DeltaTime en ms.
     */
    update(dt: number) {
        this.gameState.monsters.forEach(monster => {
            if (!monster.isAlive) return;

            this.updateMonster(monster, dt);
        });
    }

    private updateMonster(monster: MonsterState, dt: number) {
        // 1. Mettre à jour le timer d'attaque du monstre
        monster.attackTimer += dt;

        // 2. Si le monstre n'a pas de cible, on ne fait rien
        if (!monster.targetPlayerId) return;

        const target = this.gameState.players.get(monster.targetPlayerId);
        if (!target || target.isDead) {
            // La cible n'est plus valide, on l'oublie
            monster.targetPlayerId = "";
            return;
        }

        // 3. Vérifier si le monstre peut attaquer
        const dist = this.getDistance(monster, target);
        if (dist <= monster.attackRange && monster.attackTimer >= this.MONSTER_ATTACK_COOLDOWN) {
            
            // Le monstre attaque !
            const dmg = Math.max(1, monster.attack - target.armor); // Dégâts simples
            target.hp = Math.max(0, target.hp - dmg); // Utiliser setHp serait mieux, mais pour l'instant c'est ok
            
            // --- DÉCLENCHEUR DE LA CONTRE-ATTAQUE ---
            // On informe le joueur qu'il a été attaqué
            target.lastAttackerId = monster.monsterId;

            // Notifier le joueur des dégâts
            this.broadcast(target.sessionId, "monster_attack", {
                attackerId: monster.monsterId,
                damage: dmg,
                hpLeft: target.hp
            });

            // Reset le timer du monstre
            monster.attackTimer = 0;
        }
    }

    private getDistance(a: MonsterState, b: PlayerState): number {
        const dx = a.posX - b.posX;
        const dy = a.posY - b.posY;
        const dz = a.posZ - b.posZ;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}
