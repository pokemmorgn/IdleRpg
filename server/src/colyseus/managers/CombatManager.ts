import { Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { MonsterState } from "../schema/MonsterState";
import { AFKManager } from "./AFKManager";
import { ConsumableManager } from "./ConsumableManager";

/**
 * CombatManager - Gère tout le système de combat (Online + AFK)
 * 
 * Responsabilités :
 * - Détection automatique des combats (joueur immobile + monstre proche)
 * - Déplacement progressif vers le monstre (mode online uniquement)
 * - Calcul des dégâts (critiques, esquives, réduction)
 * - Gestion des timers d'attaque indépendants
 * - Gestion de la mort (joueur/monstre)
 * - XP gain et loot drop
 * - Respawn automatique des monstres
 * - Aggro des monstres aggressive
 * - Intégration avec AFKManager pour mode AFK
 * - Intégration avec ConsumableManager pour auto-heal
 */
export class CombatManager {
  private serverId: string;
  private gameState: GameState;
  private afkManager: AFKManager;
  private consumableManager: ConsumableManager;
  
  // Référence aux clients (pour broadcaster)
  private clients: Map<string, Client> = new Map();
  
  // Timers d'attaque par entité (sessionId ou monsterId)
  private attackTimers: Map<string, number> = new Map();
  
  // Timers de respawn des monstres (monsterId)
  private respawnTimers: Map<string, number> = new Map();
  
  // Constantes
  private readonly DETECTION_RANGE = 40; // Distance de détection (mètres)
  private readonly MELEE_RANGE = 2;      // Distance de corps à corps (mètres)
  private readonly IDLE_THRESHOLD = 1000; // Temps d'immobilité pour déclencher combat (ms)
  
  constructor(serverId: string, gameState: GameState, afkManager: AFKManager) {
    this.serverId = serverId;
    this.gameState = gameState;
    this.afkManager = afkManager;
    this.consumableManager = new ConsumableManager();
  }
  
  /**
   * Enregistre un client pour le broadcasting
   */
  registerClient(sessionId: string, client: Client): void {
    this.clients.set(sessionId, client);
  }
  
  /**
   * Désenregistre un client
   */
  unregisterClient(sessionId: string): void {
    this.clients.delete(sessionId);
  }
  
  /**
   * Tick principal du combat (appelé toutes les ~33ms)
   */
  update(deltaTime: number): void {
    // 1. Mettre à jour les timers de respawn
    this.updateRespawnTimers(deltaTime);
    
    // 2. Pour chaque joueur en ligne
    this.gameState.players.forEach((player) => {
      // Si mort, gérer le cooldown de résurrection
      if (player.isDead) {
        this.handlePlayerDeath(player, deltaTime);
        return;
      }
      
      // Si en combat, continuer le combat
      if (player.inCombat && player.targetMonsterId) {
        this.handleActiveCombat(player, deltaTime);
        return;
      }
      
      // Si pas en combat, vérifier détection automatique (online + AFK)
      if (!player.inCombat) {
        this.detectCombatOpportunity(player);
      }
    });
    
    // 3. Aggro des monstres aggressive
    this.handleMonsterAggro();
  }
  
  /**
   * Détecte si un joueur immobile peut commencer un combat
   */
  private detectCombatOpportunity(player: PlayerState): void {
    const now = Date.now();
  
    // 🔒 Anti-spam : on limite les checks à 1 par seconde
    if (now - player.lastAFKCombatCheck < 1000) {
      return;
    }
    player.lastAFKCombatCheck = now;
  
    // Vérifier si le joueur ne bouge plus depuis 1 seconde OU est en AFK
    const isIdle = (now - player.lastMovementTime) >= this.IDLE_THRESHOLD;
  
    if (!isIdle && !player.isAFK) {
      return; // Joueur actif et pas AFK → pas d'auto-combat
    }
  
    // Chercher le monstre le plus proche dans les 40m
    const nearestMonster = this.findNearestMonster(player);
  
    if (!nearestMonster) {
      return; // Aucun monstre à portée
    }
  
    // Démarrer le combat (une seule fois par seconde max)
    this.startCombat(player, nearestMonster);
  }

  
  /**
   * Trouve le monstre le plus proche d'un joueur
   */
  private findNearestMonster(player: PlayerState): MonsterState | null {
    let nearest: MonsterState | null = null;
    let minDistance = this.DETECTION_RANGE;
    
    this.gameState.monsters.forEach((monster) => {
      // Ignorer les monstres morts
      if (monster.isDead || !monster.isActive || !monster.isAlive) {
        return;
      }
      
      const distance = this.getDistance(
        player.posX, player.posY, player.posZ,
        monster.posX, monster.posY, monster.posZ
      );
      
      if (distance <= this.DETECTION_RANGE && distance < minDistance) {
        nearest = monster;
        minDistance = distance;
      }
    });
    
    return nearest;
  }
  
  /**
   * Démarre un combat entre un joueur et un monstre
   */
  private startCombat(player: PlayerState, monster: MonsterState): void {
    // Marquer le joueur en combat
    player.inCombat = true;
    player.targetMonsterId = monster.monsterId;
    player.attackTimer = 0;
    
    // Marquer le monstre en combat
    monster.targetPlayerId = player.sessionId;
    
    // Initialiser le timer d'attaque du monstre
    if (!this.attackTimers.has(monster.monsterId)) {
      this.attackTimers.set(monster.monsterId, 0);
    }
    
    console.log(`⚔️  [Combat] ${player.characterName} engage ${monster.name} (distance: ${this.getDistance(player.posX, player.posY, player.posZ, monster.posX, monster.posY, monster.posZ).toFixed(2)}m)`);
    
    // Envoyer message au client
    this.broadcastToPlayer(player.sessionId, "combat_start", {
      playerId: player.sessionId,
      monsterId: monster.monsterId,
      playerHP: player.hp,
      monsterHP: monster.hp
    });
  }
  
  /**
   * Gère un combat actif
   */
  private handleActiveCombat(player: PlayerState, deltaTime: number): void {
    const monster = this.gameState.monsters.get(player.targetMonsterId);
    
    if (!monster || monster.isDead) {
      // Monstre disparu ou mort, arrêter le combat
      this.stopCombat(player);
      return;
    }
    
    // Calculer la distance au monstre
    const distance = this.getDistance(
      player.posX, player.posY, player.posZ,
      monster.posX, monster.posY, monster.posZ
    );
    
    // Si trop loin (> 40m pour AFK, leash), arrêter le combat
    if (distance > this.DETECTION_RANGE) {
      console.log(`⚠️  [Combat] ${player.characterName} trop loin de ${monster.name}, combat arrêté`);
      this.stopCombat(player);
      return;
    }
    
    // Si en mode AFK, pas de déplacement - rester statique
    if (player.isAFK) {
      // Vérifier que le monstre est toujours à portée
      if (distance > this.MELEE_RANGE) {
        // Monstre trop loin en AFK, arrêter le combat
        console.log(`⚠️  [Combat] Mode AFK: ${monster.name} trop loin (${distance.toFixed(2)}m), combat arrêté`);
        this.stopCombat(player);
        return;
      }
      // On est à portée, gérer les attaques
      this.handleCombatAttacks(player, monster, deltaTime);
      return;
    }
    
    // Mode Online: Si pas au corps à corps, se déplacer progressivement
    if (distance > this.MELEE_RANGE) {
      this.moveTowardsTarget(player, monster, deltaTime);
      return; // Pas encore d'attaque
    }
    
    // On est au corps à corps, gérer les attaques
    this.handleCombatAttacks(player, monster, deltaTime);
  }
  
  /**
   * Déplace progressivement le joueur vers le monstre (mode online uniquement)
   */
  private moveTowardsTarget(
    player: PlayerState,
    monster: MonsterState,
    deltaTime: number
  ): void {
    // Calculer la direction
    const dx = monster.posX - player.posX;
    const dy = monster.posY - player.posY;
    const dz = monster.posZ - player.posZ;
    
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (distance === 0) return;
    
    // Normaliser
    const dirX = dx / distance;
    const dirY = dy / distance;
    const dirZ = dz / distance;
    
    // Déplacer selon moveSpeed
    const moveDistance = player.moveSpeed * (deltaTime / 1000);
    
    player.posX += dirX * moveDistance;
    player.posY += dirY * moveDistance;
    player.posZ += dirZ * moveDistance;
    
    // Envoyer update de position au client (toutes les 100ms environ)
    this.broadcastToPlayer(player.sessionId, "player_position_update", {
      x: player.posX,
      y: player.posY,
      z: player.posZ
    });
  }
  
  /**
   * Gère les attaques dans un combat actif
   */
  private handleCombatAttacks(
    player: PlayerState,
    monster: MonsterState,
    deltaTime: number
  ): void {
    // Incrémenter le timer d'attaque du joueur
    player.attackTimer += deltaTime;
    
    // Le joueur peut attaquer ?
    if (player.attackTimer >= player.attackSpeed * 1000) {
      this.performAttack(player, monster);
      player.attackTimer = 0;
    }
    
    // Incrémenter le timer d'attaque du monstre
    const monsterTimerKey = monster.monsterId;
    const currentMonsterTimer = this.attackTimers.get(monsterTimerKey) || 0;
    const newMonsterTimer = currentMonsterTimer + deltaTime;
    this.attackTimers.set(monsterTimerKey, newMonsterTimer);
    
    // Le monstre peut attaquer ?
    const monsterAttackSpeed = this.calculateMonsterAttackSpeed(monster);
    
    if (newMonsterTimer >= monsterAttackSpeed * 1000) {
      this.performAttack(monster, player);
      this.attackTimers.set(monsterTimerKey, 0);
    }
  }
  
  /**
   * Calcule l'attack speed d'un monstre
   * Formula: 2.5 * (100 / speed)
   */
  private calculateMonsterAttackSpeed(monster: MonsterState): number {
    return 2.5 * (100 / monster.speed);
  }
  
  /**
   * Effectue une attaque (joueur → monstre ou monstre → joueur)
   */
  private performAttack(
    attacker: PlayerState | MonsterState,
    defender: PlayerState | MonsterState
  ): void {
    // Déterminer les stats de l'attaquant
    let attackPower = 0;
    let criticalChance = 0;
    let criticalDamage = 150;
    let precision = 0;
    let attackerName = "";
    let attackerId = "";
    
    if (attacker instanceof PlayerState) {
      attackPower = attacker.attackPower;
      criticalChance = attacker.criticalChance;
      criticalDamage = attacker.criticalDamage;
      precision = attacker.precision;
      attackerName = attacker.characterName;
      attackerId = attacker.sessionId;
    } else {
      attackPower = attacker.attack;
      criticalChance = 0; // Monstres pas de crit pour l'instant
      criticalDamage = 150;
      precision = 0;
      attackerName = attacker.name;
      attackerId = attacker.monsterId;
    }
    
    // Déterminer les stats du défenseur
    let damageReduction = 0;
    let evasion = 0;
    let defenderName = "";
    let defenderId = "";
    
    if (defender instanceof PlayerState) {
      damageReduction = defender.damageReduction;
      evasion = defender.evasion;
      defenderName = defender.characterName;
      defenderId = defender.sessionId;
    } else {
      // Calculer la réduction de dégâts du monstre depuis defense
      damageReduction = this.calculateMonsterDamageReduction(defender);
      evasion = 0; // Monstres pas d'esquive pour l'instant
      defenderName = defender.name;
      defenderId = defender.monsterId;
    }
    
    // Calculer les dégâts
    let baseDamage = attackPower;
    let finalDamage = baseDamage * (1 - (damageReduction / 100));
    
    // Vérifier esquive (si roll < evasion)
    const evasionRoll = Math.random() * 100;
    const isMiss = evasionRoll < evasion;
    
    if (isMiss) {
      finalDamage = 0;
      console.log(`💨 [Combat] ${attackerName} MISS sur ${defenderName}`);
      
      // Envoyer message
      this.broadcastCombatDamage(attackerId, defenderId, 0, false, true, defender instanceof PlayerState ? defender.hp : defender.hp);
      return;
    }
    
    // Vérifier critique (si roll < criticalChance)
    const critRoll = Math.random() * 100;
    const isCritical = critRoll < criticalChance;
    
    if (isCritical) {
      finalDamage *= (criticalDamage / 100);
    }
    
    // Minimum 1 dégât
    finalDamage = Math.max(1, Math.floor(finalDamage));
    
    // Appliquer les dégâts
    if (defender instanceof PlayerState) {
      defender.hp = Math.max(0, defender.hp - finalDamage);
    } else {
      defender.hp = Math.max(0, defender.hp - finalDamage);
    }
    
    console.log(`⚔️  [Combat] ${attackerName} → ${defenderName}: ${finalDamage} dmg${isCritical ? ' (CRIT!)' : ''} (HP: ${defender instanceof PlayerState ? defender.hp : defender.hp}/${defender instanceof PlayerState ? defender.maxHp : defender.maxHp})`);
    
    // Envoyer message de dégâts
    this.broadcastCombatDamage(
      attackerId,
      defenderId,
      finalDamage,
      isCritical,
      false,
      defender instanceof PlayerState ? defender.hp : defender.hp
    );
    
    // Vérifier la mort
    if ((defender instanceof PlayerState && defender.hp <= 0) || 
        (defender instanceof MonsterState && defender.hp <= 0)) {
      this.handleDeath(attacker, defender);
    }
  }
  
  /**
   * Calcule la réduction de dégâts d'un monstre depuis sa defense
   * Simple formula pour l'instant: defense * 0.5%
   */
  private calculateMonsterDamageReduction(monster: MonsterState): number {
    return Math.min(75, monster.defense * 0.5);
  }
  
  /**
   * Gère la mort d'une entité
   */
  private handleDeath(
    killer: PlayerState | MonsterState,
    victim: PlayerState | MonsterState
  ): void {
    if (victim instanceof MonsterState) {
      // Monstre mort
      this.handleMonsterDeath(killer as PlayerState, victim);
    } else {
      // Joueur mort
      this.handlePlayerDeathInCombat(victim);
    }
  }
  
  /**
   * Gère la mort d'un monstre
   */
  private async handleMonsterDeath(killer: PlayerState, monster: MonsterState): Promise<void> {
    console.log(`💀 [Combat] ${monster.name} tué par ${killer.characterName}`);
    
    // Marquer le monstre comme mort
    monster.isDead = true;
    monster.isAlive = false;
    
    // Arrêter le combat du joueur
    this.stopCombat(killer);
    
    // XP Gain
    const xpGained = monster.xpReward;
    
    // Loot Drop (or uniquement)
    const goldAmount = this.calculateGoldDrop(monster);
    
    console.log(`⭐ [Combat] ${killer.characterName} gagne ${xpGained} XP et ${goldAmount} or`);
    
    // Si en mode AFK, ajouter au récap
    if (killer.isAFK) {
      await this.afkManager.addMonsterKill(killer.profileId, xpGained, goldAmount);
    } else {
      // Mode online : envoyer directement au client
      this.broadcastToPlayer(killer.sessionId, "xp_gained", {
        amount: xpGained
        // newLevel: si level up
      });
      
      this.broadcastToPlayer(killer.sessionId, "loot_dropped", {
        gold: goldAmount
      });
    }
    
    // Envoyer message de mort
    this.broadcastToPlayer(killer.sessionId, "combat_death", {
      entityId: monster.monsterId,
      isPlayer: false
    });
    
    // Programmer le respawn
    if (monster.respawnOnDeath) {
      this.scheduleRespawn(monster);
    }
  }
  
  /**
   * Calcule le drop d'or d'un monstre
   */
  private calculateGoldDrop(monster: MonsterState): number {
    const min = monster.level * 5;
    const max = monster.level * 15;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  /**
   * Programme le respawn d'un monstre
   */
  private scheduleRespawn(monster: MonsterState): void {
    this.respawnTimers.set(monster.monsterId, monster.respawnTime * 1000);
    console.log(`⏰ [Combat] ${monster.name} respawn dans ${monster.respawnTime}s`);
  }
  
  /**
   * Met à jour les timers de respawn
   */
  private updateRespawnTimers(deltaTime: number): void {
    this.respawnTimers.forEach((timer, monsterId) => {
      const newTimer = timer - deltaTime;
      
      if (newTimer <= 0) {
        // Respawn !
        this.respawnMonster(monsterId);
        this.respawnTimers.delete(monsterId);
      } else {
        this.respawnTimers.set(monsterId, newTimer);
      }
    });
  }
  
  /**
   * Respawn un monstre
   */
  private respawnMonster(monsterId: string): void {
    const monster = this.gameState.monsters.get(monsterId);
    
    if (!monster) return;
    
    // Réinitialiser le monstre
    monster.isDead = false;
    monster.isAlive = true;
    monster.hp = monster.maxHp;
    monster.currentHp = monster.maxHp;
    monster.targetPlayerId = "";
    
    console.log(`♻️  [Combat] ${monster.name} respawn avec ${monster.maxHp} HP`);
    
    // Broadcast le respawn à tous les joueurs
    this.broadcast("monster_respawn", {
      monsterId: monster.monsterId
    });
  }
  
  /**
   * Gère la mort d'un joueur en combat
   */
  private async handlePlayerDeathInCombat(player: PlayerState): Promise<void> {
    console.log(`💀 [Combat] ${player.characterName} est mort`);
    
    // Tenter de se soigner avec consommables
    const healed = this.consumableManager.tryHealPlayer(player);
    
    if (healed) {
      console.log(`💊 [Combat] ${player.characterName} se soigne automatiquement`);
      return; // Survie
    }
    
    // Plus de consommables → Mort
    player.isDead = true;
    player.hp = 0;
    player.deathTimer = 30000; // 30 secondes
    
    // Arrêter le combat
    this.stopCombat(player);
    
    // Si en mode AFK, ajouter au récap
    if (player.isAFK) {
      await this.afkManager.addDeath(player.profileId);
    }
    
    // Envoyer message au client
    this.broadcastToPlayer(player.sessionId, "combat_death", {
      entityId: player.sessionId,
      isPlayer: true
    });
  }
  
  /**
   * Gère le cooldown de mort d'un joueur
   */
  private handlePlayerDeath(player: PlayerState, deltaTime: number): void {
    player.deathTimer -= deltaTime;
    
    if (player.deathTimer <= 0) {
      // Résurrection
      this.resurrectPlayer(player);
    }
  }
  
  /**
   * Ressuscite un joueur
   */
  private resurrectPlayer(player: PlayerState): void {
    console.log(`✨ [Combat] ${player.characterName} ressuscite`);
    
    // Réinitialiser
    player.isDead = false;
    player.hp = player.maxHp;
    player.deathTimer = 0;
    
    // Envoyer message au client
    this.broadcastToPlayer(player.sessionId, "player_resurrected", {
      hp: player.hp,
      maxHp: player.maxHp
    });
  }
  
  /**
   * Arrête le combat d'un joueur
   */
  stopCombat(player: PlayerState): void {
    if (!player.inCombat) return;
    
    console.log(`🛑 [Combat] ${player.characterName} arrête le combat`);
    
    player.inCombat = false;
    player.targetMonsterId = "";
    player.attackTimer = 0;
    
    // Nettoyer le timer d'attaque
    this.attackTimers.delete(player.sessionId);
  }

  private moveMonsterTowardsPlayer(
    monster: MonsterState,
    player: PlayerState,
    deltaTime: number
): void {

    // direction
    const dx = player.posX - monster.posX;
    const dy = player.posY - monster.posY;
    const dz = player.posZ - monster.posZ;

    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distance <= monster.attackRange) return; // déjà au CaC

    if (distance === 0) return;

    const dirX = dx / distance;
    const dirY = dy / distance;
    const dirZ = dz / distance;

    // vitesse du monstre (convertie en m/s)
    const moveDist = monster.speed * (deltaTime / 1000);

    monster.posX += dirX * moveDist;
    monster.posY += dirY * moveDist;
    monster.posZ += dirZ * moveDist;
}

  
private handleMonsterAggro(): void {
    this.gameState.monsters.forEach((monster) => {

        if (!monster.isAlive || monster.isDead) return;

        // ON A DÉJÀ UNE CIBLE ?
        if (monster.targetPlayerId) {
            const player = this.gameState.players.get(monster.targetPlayerId);

            // Si le joueur n'existe plus → reset
            if (!player || player.isDead) {
                monster.targetPlayerId = "";
                return;
            }

            const distance = this.getDistance(
                player.posX, player.posY, player.posZ,
                monster.posX, monster.posY, monster.posZ
            );

            // TROP LOIN → LEASH RESET
            if (distance > monster.leashRange) {
                monster.targetPlayerId = "";
                return;
            }

            // SI PAS encore au CaC → on avance vers le joueur
            if (distance > monster.attackRange) {
                this.moveMonsterTowardsPlayer(monster, player, 33);
            }

            // Sinon → le combatManager gère les attaques dans handleActiveCombat()
            return;
        }

        // ============================
        // PAS DE CIBLE → CHECK AGGRO
        // ============================
        if (monster.behaviorType !== "aggressive") return;

        this.gameState.players.forEach((player) => {

            if (player.isDead) return;

            const dist = this.getDistance(
                player.posX, player.posY, player.posZ,
                monster.posX, monster.posY, monster.posZ
            );

            if (dist <= monster.aggroRange) {

                monster.targetPlayerId = player.sessionId;

                console.log(`👹 [AGGRO] ${monster.name} aggro ${player.characterName}`);

                // pour accélérer l'action → déplacement immédiat au tick d’aggro
                if (dist > monster.attackRange) {
                    this.moveMonsterTowardsPlayer(monster, player, 33);
                }
            }
        });
    });
}

  
  /**
   * Calcule la distance entre deux points
   */
  private getDistance(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  /**
   * Envoie un message à un joueur spécifique
   */
  private broadcastToPlayer(sessionId: string, type: string, message: any): void {
    const client = this.clients.get(sessionId);
    if (client) {
      client.send(type, message);
    }
  }
  
  /**
   * Envoie un message à tous les joueurs
   */
  private broadcast(type: string, message: any): void {
    this.clients.forEach((client) => {
      client.send(type, message);
    });
  }
  
  /**
   * Envoie un message de dégâts
   */
  private broadcastCombatDamage(
    attackerId: string,
    defenderId: string,
    damage: number,
    isCritical: boolean,
    isMiss: boolean,
    defenderHPLeft: number
  ): void {
    this.broadcast("combat_damage", {
      attackerId,
      defenderId,
      damage,
      isCritical,
      isMiss,
      defenderHPLeft
    });
  }
}
