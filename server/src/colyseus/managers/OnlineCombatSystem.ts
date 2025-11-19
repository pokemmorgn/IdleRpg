import { PlayerState } from "../schema/PlayerState";
import { MonsterState } from "../schema/MonsterState";
import { GameState } from "../schema/GameState";

export class OnlineCombatSystem {

    private readonly DETECTION_RANGE = 40;   // Distance max avant engagement
    private readonly MELEE_RANGE = 2.2;      // Distance pour frapper
    private readonly CHASE_RANGE = 25;       // Distance max avant abandon
    private readonly MONSTER_MOVE_SPEED = 6; // Vitesse de déplacement du monstre (m/s)

    constructor(
        private gameState: GameState,
        private broadcast: (sessionId: string, type: string, data: any) => void
    ) {}

    /**
     * Tick principal du combat ONLINE
     */
    update(player: PlayerState, deltaTime: number) {
        if (player.isAFK || player.isDead) return;

        // --- DÉTECTION DE COMBAT ---
        if (!player.inCombat) {
            this.detectOnlineCombat(player);
            return;
        }

        // --- COMBAT ACTIF ---
        const monster = this.gameState.monsters.get(player.targetMonsterId);
        if (!monster || monster.isDead || !monster.isAlive) {
            this.stopOnlineCombat(player);
            return;
        }

        this.updateOnlineCombat(player, monster, deltaTime);
    }

    /**
     * Détection automatique ONLINE
     */
    private detectOnlineCombat(player: PlayerState) {
        let nearest: MonsterState | null = null;
        let minDist = this.DETECTION_RANGE;

        this.gameState.monsters.forEach(monster => {
            if (!monster.isAlive || monster.isDead) return;

            const d = this.dist(player, monster);
            if (d < minDist) {
                nearest = monster;
                minDist = d;
            }
        });

        if (nearest) {
            this.startOnlineCombat(player, nearest);
        }
    }

    /**
     * Engagement du combat ONLINE
     */
    private startOnlineCombat(player: PlayerState, monster: MonsterState) {
        player.inCombat = true;
        player.attackTimer = 0;
        player.targetMonsterId = monster.monsterId;

        monster.targetPlayerId = player.sessionId;
        monster.attackTimer = 0;

        this.broadcast(player.sessionId, "combat_start", {
            monsterId: monster.monsterId,
            playerHP: player.hp,
            monsterHP: monster.hp,
        });

        console.log(`⚔️ [Online] ${player.characterName} engage ${monster.name}`);
    }

    /**
     * Tick du combat ONLINE
     */
    private updateOnlineCombat(
        player: PlayerState,
        monster: MonsterState,
        deltaTime: number
    ) {
        const distance = this.dist(player, monster);

        // Trop loin → leash
        if (distance > this.CHASE_RANGE) {
            console.log(`⚠️ [Online] ${monster.name} leash → combat arrêté`);
            this.stopOnlineCombat(player);
            return;
        }

        // Si pas à portée → déplacements
        if (distance > this.MELEE_RANGE) {
            this.movePlayerToward(player, monster, deltaTime);
            this.moveMonsterToward(monster, player, deltaTime);
            return;
        }

        // Combats
        this.handleAttacks(player, monster, deltaTime);
    }

    /**
     * Attaques ONLINE
     */
    private handleAttacks(
        player: PlayerState,
        monster: MonsterState,
        deltaTime: number
    ) {
        // Attaque du joueur
        player.attackTimer += deltaTime;
        if (player.attackTimer >= player.attackSpeed * 1000) {
            this.hit(player, monster);
            player.attackTimer = 0;
        }

        // Attaque du monstre
        monster.attackTimer += deltaTime;
        const monsterAttackSpeed = 2.5 * (100 / monster.speed);

        if (monster.attackTimer >= monsterAttackSpeed * 1000) {
            this.hit(monster, player);
            monster.attackTimer = 0;
        }

        // MORTS
        if (monster.hp <= 0) this.killMonster(player, monster);
        if (player.hp <= 0) this.killPlayer(player);
    }

    /**
     * Déplacement joueur vers le monstre
     */
    private movePlayerToward(
        player: PlayerState,
        monster: MonsterState,
        deltaTime: number
    ) {
        const { dx, dy, dz, dist } = this.dir(player, monster);
        const move = player.moveSpeed * (deltaTime / 1000);

        player.posX += (dx / dist) * move;
        player.posY += (dy / dist) * move;
        player.posZ += (dz / dist) * move;
    }

    /**
     * Déplacement monstre vers le joueur
     */
    private moveMonsterToward(
        monster: MonsterState,
        player: PlayerState,
        deltaTime: number
    ) {
        const { dx, dy, dz, dist } = this.dir(player, monster);
        const move = this.MONSTER_MOVE_SPEED * (deltaTime / 1000);

        monster.posX -= (dx / dist) * move;
        monster.posY -= (dy / dist) * move;
        monster.posZ -= (dz / dist) * move;
    }

    /**
     * Calcul dégâts
     */
    private hit(attacker: PlayerState | MonsterState, defender: PlayerState | MonsterState) {
        const atk = attacker instanceof PlayerState
            ? attacker.attackPower
            : attacker.attack;

        const reduction = defender instanceof PlayerState
            ? defender.damageReduction
            : Math.min(75, defender.defense * 0.5);

        const dmg = Math.max(1, Math.floor(atk * (1 - reduction / 100)));

        defender.hp = Math.max(0, defender.hp - dmg);

        const attackerId = attacker instanceof PlayerState ? attacker.sessionId : attacker.monsterId;
        const defenderId = defender instanceof PlayerState ? defender.sessionId : defender.monsterId;

        this.broadcast(attacker instanceof PlayerState ? attacker.sessionId : defender instanceof PlayerState ? defender.sessionId : attackerId,
            "combat_damage",
            {
                attackerId,
                defenderId,
                damage: dmg,
                defenderHPLeft: defender.hp
            }
        );
    }

    /**
     * Mort du monstre
     */
    private killMonster(player: PlayerState, monster: MonsterState) {
        monster.isDead = true;
        monster.isAlive = false;

        this.broadcast(player.sessionId, "combat_death", {
            entityId: monster.monsterId,
            isPlayer: false
        });

        console.log(`💀 [Online] ${monster.name} tué`);

        this.stopOnlineCombat(player);
    }

    /**
     * Mort du joueur
     */
    private killPlayer(player: PlayerState) {
        player.isDead = true;
        player.inCombat = false;

        this.broadcast(player.sessionId, "combat_death", {
            entityId: player.sessionId,
            isPlayer: true
        });

        console.log(`💀 [Online] ${player.characterName} est mort`);
    }

    /**
     * STOP COMBAT
     */
    private stopOnlineCombat(player: PlayerState) {
        player.inCombat = false;
        player.targetMonsterId = "";
    }

    /**
     * Utilitaires vectoriels
     */
    private dist(a: PlayerState, b: MonsterState) {
        return Math.sqrt(
            (a.posX - b.posX) ** 2 +
            (a.posY - b.posY) ** 2 +
            (a.posZ - b.posZ) ** 2
        );
    }

    private dir(a: PlayerState, b: MonsterState) {
        const dx = a.posX - b.posX;
        const dy = a.posY - b.posY;
        const dz = a.posZ - b.posZ;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return { dx, dy, dz, dist };
    }
}
