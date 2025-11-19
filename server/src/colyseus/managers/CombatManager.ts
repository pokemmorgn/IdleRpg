import { Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { MonsterState } from "../schema/MonsterState";

interface CombatState {
  playerId: string;
  monsterId: string;
  playerAttackTimer: number;
  monsterAttackTimer: number;
  isMovingToTarget: boolean;
  targetReached: boolean;
}

/**
 * CombatManager - Gère tout le système de combat (online et AFK)
 * 
 * Responsabilités :
 * - Détecter joueurs immobiles (1s sans mouvement)
 * - Scanner monstres dans 40m et choisir le plus proche
 * - Déplacer progressivement vers le monstre
 * - Gérer timers d'attaque indépendants (joueur + monstre)
 * - Calculer dégâts (AP, critique, esquive, DR)
 * - XP gain et loot drop
 * - Respawn automatique des monstres
 * - Aggro des monstres aggressive
 */
export class CombatManager {
  private serverId: string;
  private gameState: GameState;
  
  // Map des combats en cours : sessionId → CombatState
  private activeCombats: Map<string, CombatState> = new Map();
  
  // Clients connectés (pour envoyer messages WebSocket)
  private clients: Map<string, Client> = new Map();
  
  constructor(serverId: string, gameState: GameState) {
    this.serverId = serverId;
    this.gameState = gameState;
  }
  
  /**
   * Enregistre un client (appelé dans WorldRoom.onJoin)
   */
  registerClient(sessionId: string, client: Client): void {
    this.clients.set(sessionId, client);
  }
  
  /**
   * Désenregistre un client (appelé dans WorldRoom.onLeave)
   */
  unregisterClient(sessionId: string): void {
    this.clients.delete(sessionId);
    this.activeCombats.delete(sessionId);
  }
  
  /**
   * Update principal (appelé depuis WorldRoom.update toutes les ~33ms)
   */
  update(deltaTime: number): void {
    // 1. Détecter les joueurs immobiles et lancer combat si monstre proche
    this.detectIdlePlayers(deltaTime);
    
    // 2. Gérer les combats en cours
    this.updateActiveCombats(deltaTime);
    
    // 3. Gérer l'aggro des monstres
    this.updateMonsterAggro(deltaTime);
    
    // 4. Gérer les respawns de monstres
    this.updateMonsterRespawns(deltaTime);
  }
  
  // ========================================
  // === DÉTECTION JOUEURS IMMOBILES ===
  // ========================================
  
  private detectIdlePlayers(deltaTime: number): void {
    const now = Date.now();
    
    this.gameState.players.forEach((player) => {
      // Si déjà en combat, skip
      if (player.inCombat) return;
      
      // Si en AFK, skip (géré par AFKManager)
      if (player.isAFK) return;
      
      // Si mort, skip
      if (player.isDead) return;
      
      // Vérifier si immobile depuis 1 seconde
      const timeSinceLastMove = now - player.lastMovementTime;
      
      if (timeSinceLastMove >= 1000) {
        // Joueur immobile → chercher monstre proche
        this.tryStartCombat(player);
      }
    });
  }
  
  /**
   * Cherche un monstre dans 40m et démarre le combat
   */
  private tryStartCombat(player: PlayerState): void {
    // Trouver le monstre le plus proche dans 40m
    const nearbyMonster = this.findNearestMonster(player, 40);
    
    if (!nearbyMonster) return;
    
    // Vérifier que le monstre est vivant
    if (nearbyMonster.isDead) return;
    
    // Démarrer le combat
    this.startCombat(player, nearbyMonster);
  }
  
  // ========================================
  // === GESTION DES COMBATS ===
  // ========================================
  
  /**
   * Démarre un combat entre un joueur et un monstre
   */
  startCombat(player: PlayerState, monster: MonsterState): void {
    console.log(`⚔️  [CombatManager] Combat start: ${player.characterName} vs ${monster.name}`);
    
    // Marquer le joueur en combat
    player.inCombat = true;
    player.targetMonsterId = monster.monsterId;
    player.attackTimer = 0;
    
    // Marquer le monstre en combat
    monster.targetPlayerId = player.sessionId;
    monster.attackTimer = 0;
    
    // Créer l'état de combat
    const combatState: CombatState = {
      playerId: player.sessionId,
      monsterId: monster.monsterId,
      playerAttackTimer: 0,
      monsterAttackTimer: 0,
      isMovingToTarget: true,
      targetReached: false
    };
    
    this.activeCombats.set(player.sessionId, combatState);
    
    // Envoyer message au client
    const client = this.clients.get(player.sessionId);
    if (client) {
      client.send("combat_start", {
        playerId: player.sessionId,
        monsterId: monster.monsterId,
        playerHP: player.hp,
        monsterHP: monster.hp
      });
    }
  }
  
  /**
   * Arrête un combat (joueur bouge manuellement)
   */
  stopCombat(player: PlayerState): void {
    console.log(`🛑 [CombatManager] Combat stop: ${player.characterName}`);
    
    const combatState = this.activeCombats.get(player.sessionId);
    if (!combatState) return;
    
    // Retirer le combat
    this.activeCombats.delete(player.sessionId);
    
    // Réinitialiser le joueur
    player.inCombat = false;
    player.targetMonsterId = "";
    player.attackTimer = 0;
    
    // Réinitialiser le monstre
    const monster = this.gameState.monsters.get(combatState.monsterId);
    if (monster) {
      monster.targetPlayerId = "";
      monster.attackTimer = 0;
    }
  }
  
  /**
   * Update des combats actifs
   */
  private updateActiveCombats(deltaTime: number): void {
    this.activeCombats.forEach((combatState, sessionId) => {
      const player = this.gameState.players.get(sessionId);
      const monster = this.gameState.monsters.get(combatState.monsterId);
      
      // Vérifier que le combat est toujours valide
      if (!player || !monster || player.isDead || monster.isDead) {
        this.activeCombats.delete(sessionId);
        return;
      }
      
      // Si le joueur est en AFK, ne pas mettre à jour le combat ici
      // (géré par AFKManager)
      if (player.isAFK) return;
      
      // 1. Déplacer le joueur vers le monstre si pas encore au corps à corps
      if (combatState.isMovingToTarget && !combatState.targetReached) {
        this.movePlayerTowardsMonster(player, monster, combatState, deltaTime);
      }
      
      // 2. Si au corps à corps, gérer les attaques
      if (combatState.targetReached) {
        this.processCombatTurn(player, monster, combatState, deltaTime);
      }
    });
  }
  
  /**
   * Déplace progressivement le joueur vers le monstre
   */
  private movePlayerTowardsMonster(
    player: PlayerState,
    monster: MonsterState,
    combatState: CombatState,
    deltaTime: number
  ): void {
    const distance = this.getDistance(
      player.posX, player.posY, player.posZ,
      monster.posX, monster.posY, monster.posZ
    );
    
    // Si à moins de 2m, considérer comme atteint
    if (distance <= 2) {
      combatState.targetReached = true;
      combatState.isMovingToTarget = false;
      console.log(`✅ [CombatManager] ${player.characterName} reached ${monster.name}`);
      return;
    }
    
    // Calculer la direction
    const dx = monster.posX - player.posX;
    const dy = monster.posY - player.posY;
    const dz = monster.posZ - player.posZ;
    
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (length === 0) return;
    
    // Normaliser
    const dirX = dx / length;
    const dirY = dy / length;
    const dirZ = dz / length;
    
    // Déplacer selon moveSpeed (deltaTime en ms)
    const moveAmount = player.moveSpeed * (deltaTime / 1000);
    
    player.posX += dirX * moveAmount;
    player.posY += dirY * moveAmount;
    player.posZ += dirZ * moveAmount;
    
    // Envoyer update de position au client (toutes les 100ms)
    const now = Date.now();
    if (!player.lastMovementTime || now - player.lastMovementTime >= 100) {
      const client = this.clients.get(player.sessionId);
      if (client) {
        client.send("player_position_update", {
          x: player.posX,
          y: player.posY,
          z: player.posZ
        });
      }
      player.lastMovementTime = now;
    }
  }
  
  /**
   * Gère un tour de combat (attaques indépendantes)
   */
  private processCombatTurn(
    player: PlayerState,
    monster: MonsterState,
    combatState: CombatState,
    deltaTime: number
  ): void {
    const client = this.clients.get(player.sessionId);
    
    // === ATTAQUE DU JOUEUR ===
    combatState.playerAttackTimer += deltaTime;
    
    if (combatState.playerAttackTimer >= player.attackSpeed * 1000) {
      // Joueur attaque
      this.playerAttacksMonster(player, monster, client);
      combatState.playerAttackTimer = 0;
    }
    
    // === ATTAQUE DU MONSTRE ===
    combatState.monsterAttackTimer += deltaTime;
    
    // Calculer l'attack speed du monstre
    const monsterAttackSpeed = this.calculateMonsterAttackSpeed(monster.speed);
    
    if (combatState.monsterAttackTimer >= monsterAttackSpeed * 1000) {
      // Monstre attaque
      this.monsterAttacksPlayer(monster, player, client);
      combatState.monsterAttackTimer = 0;
    }
  }
  
  // ========================================
  // === CALCULS DE COMBAT ===
  // ========================================
  
  /**
   * Joueur attaque monstre
   */
  private playerAttacksMonster(
    player: PlayerState,
    monster: MonsterState,
    client: Client | undefined
  ): void {
    // Calculer les dégâts
    const damageResult = this.calculateDamage(
      player.attackPower,
      player.criticalChance,
      player.criticalDamage,
      monster.defense,
      monster.speed // Utilisé pour l'esquive (0% pour les monstres par défaut)
    );
    
    // Appliquer les dégâts
    monster.hp = Math.max(0, monster.hp - damageResult.finalDamage);
    
    console.log(`⚔️  [Combat] ${player.characterName} → ${monster.name}: ${damageResult.finalDamage} dmg ${damageResult.isCritical ? '(CRIT)' : ''} ${damageResult.isMiss ? '(MISS)' : ''}`);
    
    // Envoyer message
    if (client) {
      client.send("combat_damage", {
        attackerId: player.sessionId,
        defenderId: monster.monsterId,
        damage: damageResult.finalDamage,
        isCritical: damageResult.isCritical,
        isMiss: damageResult.isMiss,
        defenderHPLeft: monster.hp
      });
    }
    
    // Vérifier mort du monstre
    if (monster.hp <= 0) {
      this.onMonsterDeath(player, monster, client);
    }
  }
  
  /**
   * Monstre attaque joueur
   */
  private monsterAttacksPlayer(
    monster: MonsterState,
    player: PlayerState,
    client: Client | undefined
  ): void {
    // Calculer les dégâts
    const damageResult = this.calculateDamage(
      monster.attack,
      0, // Pas de critique pour les monstres
      150,
      player.damageReduction,
      player.evasion
    );
    
    // Appliquer les dégâts
    player.hp = Math.max(0, player.hp - damageResult.finalDamage);
    
    console.log(`⚔️  [Combat] ${monster.name} → ${player.characterName}: ${damageResult.finalDamage} dmg ${damageResult.isMiss ? '(MISS)' : ''}`);
    
    // Envoyer message
    if (client) {
      client.send("combat_damage", {
        attackerId: monster.monsterId,
        defenderId: player.sessionId,
        damage: damageResult.finalDamage,
        isCritical: false,
        isMiss: damageResult.isMiss,
        defenderHPLeft: player.hp
      });
    }
    
    // Vérifier mort du joueur
    if (player.hp <= 0) {
      this.onPlayerDeath(player, monster, client);
    }
  }
  
  /**
   * Calcule les dégâts finaux
   */
  private calculateDamage(
    attackPower: number,
    critChance: number,
    critDamage: number,
    defenseOrDR: number, // Defense pour monstre, DR% pour joueur
    evasion: number
  ): { finalDamage: number; isCritical: boolean; isMiss: boolean } {
    let baseDamage = attackPower;
    let isCritical = false;
    let isMiss = false;
    
    // 1. Esquive
    if (Math.random() * 100 < evasion) {
      isMiss = true;
      return { finalDamage: 0, isCritical: false, isMiss: true };
    }
    
    // 2. Critique
    if (Math.random() * 100 < critChance) {
      isCritical = true;
      baseDamage *= (critDamage / 100);
    }
    
    // 3. Réduction de dégâts
    // Pour les joueurs: DR est un pourcentage direct
    // Pour les monstres: defense est une valeur brute (on utilise une formule simple)
    let finalDamage = baseDamage;
    
    if (defenseOrDR > 0) {
      // Si defenseOrDR < 100, on le traite comme un pourcentage (joueur)
      // Sinon, on le traite comme une defense brute (monstre - non utilisé ici car monstres n'ont pas de DR%)
      const reductionPercent = Math.min(75, defenseOrDR);
      finalDamage = baseDamage * (1 - (reductionPercent / 100));
    }
    
    // 4. Minimum 1 dégât
    finalDamage = Math.max(1, Math.floor(finalDamage));
    
    return { finalDamage, isCritical, isMiss };
  }
  
  /**
   * Calcule l'attack speed d'un monstre
   * Formula: 2.5 * (100 / speed)
   */
  private calculateMonsterAttackSpeed(speed: number): number {
    if (speed === 0) return 2.5;
    return 2.5 * (100 / speed);
  }
  
  // ========================================
  // === MORT ===
  // ========================================
  
  /**
   * Gère la mort d'un monstre
   */
  private onMonsterDeath(
    player: PlayerState,
    monster: MonsterState,
    client: Client | undefined
  ): void {
    console.log(`💀 [Combat] ${monster.name} killed by ${player.characterName}`);
    
    monster.isDead = true;
    monster.isAlive = false;
    
    // XP gain
    const xpGained = monster.xpReward;
    console.log(`⭐ [Combat] ${player.characterName} gained ${xpGained} XP`);
    
    // Envoyer message XP
    if (client) {
      client.send("xp_gained", {
        amount: xpGained
        // TODO: Calculer level up
      });
    }
    
    // Loot drop (or uniquement)
    const goldAmount = Math.floor(
      Math.random() * (monster.level * 15 - monster.level * 5 + 1) + monster.level * 5
    );
    
    console.log(`💰 [Combat] ${player.characterName} looted ${goldAmount} gold`);
    
    // Envoyer message loot
    if (client) {
      client.send("loot_dropped", {
        gold: goldAmount
      });
    }
    
    // Envoyer message mort
    if (client) {
      client.send("combat_death", {
        entityId: monster.monsterId,
        isPlayer: false
      });
    }
    
    // Retirer le combat
    this.activeCombats.delete(player.sessionId);
    player.inCombat = false;
    player.targetMonsterId = "";
    
    // Démarrer le respawn timer
    if (monster.respawnOnDeath) {
      monster.respawnTimer = monster.respawnTime;
      console.log(`⏱️  [Combat] ${monster.name} will respawn in ${monster.respawnTime}s`);
    }
  }
  
  /**
   * Gère la mort d'un joueur
   */
  private onPlayerDeath(
    player: PlayerState,
    monster: MonsterState,
    client: Client | undefined
  ): void {
    console.log(`💀 [Combat] ${player.characterName} killed by ${monster.name}`);
    
    player.isDead = true;
    player.hp = 0;
    player.deathTimer = 30; // 30 secondes
    
    // Envoyer message mort
    if (client) {
      client.send("combat_death", {
        entityId: player.sessionId,
        isPlayer: true
      });
    }
    
    // Retirer le combat
    this.activeCombats.delete(player.sessionId);
    player.inCombat = false;
    player.targetMonsterId = "";
    
    // Réinitialiser le monstre
    monster.targetPlayerId = "";
    monster.attackTimer = 0;
  }
  
  // ========================================
  // === AGGRO MONSTRES ===
  // ========================================
  
  /**
   * Gère l'aggro des monstres aggressive
   */
  private updateMonsterAggro(deltaTime: number): void {
    this.gameState.monsters.forEach((monster) => {
      // Seulement les monstres aggressive et vivants
      if (monster.behaviorType !== "aggressive") return;
      if (monster.isDead) return;
      if (monster.targetPlayerId) return; // Déjà en combat
      
      // Chercher un joueur dans l'aggroRange
      const nearbyPlayer = this.findNearestPlayer(monster, monster.aggroRange);
      
      if (nearbyPlayer && !nearbyPlayer.isDead && !nearbyPlayer.inCombat) {
        console.log(`😡 [Combat] ${monster.name} aggro ${nearbyPlayer.characterName}`);
        this.startCombat(nearbyPlayer, monster);
      }
    });
  }
  
  // ========================================
  // === RESPAWN MONSTRES ===
  // ========================================
  
  /**
   * Gère les respawns de monstres
   */
  private updateMonsterRespawns(deltaTime: number): void {
    this.gameState.monsters.forEach((monster) => {
      if (!monster.isDead) return;
      if (!monster.respawnOnDeath) return;
      
      // Décrémenter le timer
      monster.respawnTimer -= deltaTime / 1000;
      
      if (monster.respawnTimer <= 0) {
        // Respawn!
        monster.isDead = false;
        monster.isAlive = true;
        monster.hp = monster.maxHp;
        monster.respawnTimer = 0;
        monster.targetPlayerId = "";
        
        // Réinitialiser position
        monster.posX = monster.posX; // Déjà à la spawn position
        monster.posY = monster.posY;
        monster.posZ = monster.posZ;
        
        console.log(`🔄 [Combat] ${monster.name} respawned`);
        
        // Envoyer message à tous les clients du serveur
        this.clients.forEach((client) => {
          client.send("monster_respawn", {
            monsterId: monster.monsterId
          });
        });
      }
    });
  }
  
  // ========================================
  // === RÉSURRECTION JOUEUR ===
  // ========================================
  
  /**
   * Gère le timer de mort du joueur (appelé depuis WorldRoom.update)
   */
  updatePlayerDeathTimers(deltaTime: number): void {
    this.gameState.players.forEach((player) => {
      if (!player.isDead) return;
      
      // Décrémenter le timer
      player.deathTimer -= deltaTime / 1000;
      
      if (player.deathTimer <= 0) {
        // Résurrection!
        player.isDead = false;
        player.hp = player.maxHp;
        player.deathTimer = 0;
        
        console.log(`💚 [Combat] ${player.characterName} resurrected`);
        
        const client = this.clients.get(player.sessionId);
        if (client) {
          client.send("player_resurrected", {
            hp: player.hp,
            maxHp: player.maxHp
          });
        }
      }
    });
  }
  
  // ========================================
  // === UTILITAIRES ===
  // ========================================
  
  /**
   * Trouve le monstre le plus proche d'un joueur dans un rayon donné
   */
  private findNearestMonster(player: PlayerState, maxRange: number): MonsterState | null {
    let nearestMonster: MonsterState | null = null;
    let nearestDistance = maxRange;
    
    this.gameState.monsters.forEach((monster) => {
      if (monster.isDead) return;
      if (!monster.isActive) return;
      
      const distance = this.getDistance(
        player.posX, player.posY, player.posZ,
        monster.posX, monster.posY, monster.posZ
      );
      
      if (distance <= nearestDistance) {
        nearestDistance = distance;
        nearestMonster = monster;
      }
    });
    
    return nearestMonster;
  }
  
  /**
   * Trouve le joueur le plus proche d'un monstre dans un rayon donné
   */
  private findNearestPlayer(monster: MonsterState, maxRange: number): PlayerState | null {
    let nearestPlayer: PlayerState | null = null;
    let nearestDistance = maxRange;
    
    this.gameState.players.forEach((player) => {
      if (player.isDead) return;
      if (player.isAFK) return; // Monstres n'aggro pas les AFK
      
      const distance = this.getDistance(
        monster.posX, monster.posY, monster.posZ,
        player.posX, player.posY, player.posZ
      );
      
      if (distance <= nearestDistance) {
        nearestDistance = distance;
        nearestPlayer = player;
      }
    });
    
    return nearestPlayer;
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
}
