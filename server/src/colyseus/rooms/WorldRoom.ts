import { Room, Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { validateToken } from "../utils/authHelper";
import { loadPlayerCharacter, isCharacterAlreadyConnected } from "../utils/playerLoader";
import { NPCManager } from "../managers/NPCManager";
import { MonsterManager } from "../managers/MonsterManager";
import { CombatManager } from "../managers/CombatManager";
import { AFKManager } from "../managers/AFKManager";
import ServerProfile from "../../models/ServerProfile";

interface JoinOptions {
  token: string;
  serverId: string;
  characterSlot: number;
}

interface AuthData {
  playerId: string;
  profileId: string;
  characterName: string;
  level: number;
  characterClass: string;
  characterRace: string;
  characterSlot: number;
}

/**
 * WorldRoom - Room principale du jeu
 * Une instance par serveur logique (s1, s2, s3...)
 * Chaque joueur a son propre monde instancié côté serveur
 * Le GameState contient la liste des joueurs en ligne (présence) + les NPC actifs + les Monsters
 */
export class WorldRoom extends Room<GameState> {
  maxClients = 1000; // Maximum de joueurs par serveur logique
  
  private serverId: string = "";
  private updateInterval: any;
  private npcManager!: NPCManager;
  private monsterManager!: MonsterManager;
  private combatManager!: CombatManager;
  private afkManager!: AFKManager;
  
  /**
   * Création de la room
   */
  async onCreate(options: { serverId: string }) {
    this.serverId = options.serverId;
    this.roomId = `world_${this.serverId}`;
    
    // Initialiser l'état du monde
    this.setState(new GameState(this.serverId));

    console.log(`🌍 WorldRoom créée pour serveur: ${this.serverId}`);

    // Initialiser les managers
    this.npcManager = new NPCManager(this.serverId, this.state);
    this.monsterManager = new MonsterManager(this.serverId, this.state);
    this.afkManager = new AFKManager(this.serverId, this.state);
    this.combatManager = new CombatManager(this.serverId, this.state, this.afkManager);
    
    // Charger les NPC et Monsters depuis MongoDB
    await this.npcManager.loadNPCs();
    await this.monsterManager.loadMonsters();
    
    // Charger les sessions AFK actives
    await this.afkManager.loadActiveSessions();
    
    // Gestionnaire de messages
    this.onMessage("*", (client, type, message) => {
      this.handleMessage(client, String(type), message);
    });

    // Tick du serveur (30 FPS = ~33ms)
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 33);

    // Heartbeat pour mettre à jour worldTime (toutes les secondes)
    this.updateInterval = this.clock.setInterval(() => {
      this.state.updateWorldTime();
    }, 1000);
  }

  /**
   * Authentification du joueur
   * Valide le JWT et charge le personnage depuis MongoDB
   */
  async onAuth(client: Client, options: JoinOptions): Promise<AuthData | false> {
    try {
      console.log(`🔐 Tentative de connexion: ${client.sessionId}`);

      // 1. Vérifier que toutes les options sont présentes
      if (!options.token || !options.serverId || !options.characterSlot) {
        console.log("❌ Options manquantes");
        return false;
      }

      // 2. Vérifier que c'est bien le bon serveur
      if (options.serverId !== this.serverId) {
        console.log(`❌ Mauvais serverId: ${options.serverId} (attendu: ${this.serverId})`);
        return false;
      }

      // 3. Valider le token JWT
      const tokenValidation = await validateToken(options.token);
      if (!tokenValidation.valid || !tokenValidation.playerId) {
        console.log(`❌ Token invalide: ${tokenValidation.error}`);
        return false;
      }

      const playerId = tokenValidation.playerId;

      // 4. Charger le personnage depuis MongoDB
      const characterLoad = await loadPlayerCharacter(
        playerId,
        options.serverId,
        options.characterSlot
      );

      if (!characterLoad.success || !characterLoad.profile) {
        console.log(`❌ Personnage non trouvé: ${characterLoad.error}`);
        return false;
      }

      const profile = characterLoad.profile;

      // 5. Vérifier que le personnage n'est pas déjà connecté
      if (isCharacterAlreadyConnected(this.state.players, profile.profileId)) {
        console.log(`❌ Personnage déjà connecté: ${profile.characterName}`);
        return false;
      }

      console.log(`✅ Auth OK: ${profile.characterName} (${profile.class}/${profile.race})`);

      // Retourner les données du personnage
      return {
        playerId: profile.playerId,
        profileId: profile.profileId,
        characterName: profile.characterName,
        level: profile.level,
        characterClass: profile.class,
        characterRace: profile.race,
        characterSlot: profile.characterSlot
      };

    } catch (err: any) {
      console.error("❌ Erreur dans onAuth:", err.message);
      return false;
    }
  }

  /**
   * Joueur rejoint la room (après auth OK)
   */
  async onJoin(client: Client, options: JoinOptions, auth: AuthData) {
    try {
      console.log(`👤 ${auth.characterName} rejoint ${this.serverId}`);

      // Créer le PlayerState
      const playerState = new PlayerState(
        client.sessionId,
        auth.playerId,
        auth.profileId,
        auth.characterSlot,
        auth.characterName,
        auth.level,
        auth.characterClass,
        auth.characterRace
      );

      // Charger le profil complet depuis MongoDB pour récupérer les stats
      const fullProfile = await ServerProfile.findById(auth.profileId);
      
      if (fullProfile && fullProfile.computedStats) {
        // Charger les stats depuis le profil
        playerState.loadStatsFromProfile(fullProfile.computedStats);
        console.log(`📊 Stats chargées pour ${auth.characterName}: HP=${playerState.maxHp}, AP=${playerState.attackPower}, SP=${playerState.spellPower}`);
      } else {
        console.warn(`⚠️  Pas de stats trouvées pour ${auth.characterName}, stats par défaut utilisées`);
      }

      // Ajouter au GameState
      this.state.addPlayer(playerState);
      
      // Enregistrer le client dans CombatManager pour le broadcasting
      this.combatManager.registerClient(client.sessionId, client);

      // Mettre à jour lastOnline dans MongoDB (temps réel)
      await this.updateLastOnline(auth.profileId);

      // Message de bienvenue au client
      client.send("welcome", {
        message: `Bienvenue ${auth.characterName} sur ${this.serverId} !`,
        serverId: this.serverId,
        onlinePlayers: this.state.onlineCount,
        npcCount: this.npcManager.getNPCCount(),
        monsterCount: this.monsterManager.getMonsterCount(),
        stats: {
          hp: playerState.hp,
          maxHp: playerState.maxHp,
          resource: playerState.resource,
          maxResource: playerState.maxResource,
          attackPower: playerState.attackPower,
          spellPower: playerState.spellPower,
          attackSpeed: playerState.attackSpeed,
          moveSpeed: playerState.moveSpeed
        }
      });

      console.log(`✅ ${auth.characterName} connecté (${this.state.onlineCount} joueurs, ${this.npcManager.getNPCCount()} NPC, ${this.monsterManager.getMonsterCount()} monsters)`);

    } catch (err: any) {
      console.error("❌ Erreur dans onJoin:", err.message);
    }
  }

  /**
   * Joueur quitte la room
   */
  async onLeave(client: Client, consented: boolean) {
    try {
      const playerState = this.state.players.get(client.sessionId);

      if (!playerState) {
        return;
      }

      const characterName = playerState.characterName;
      const profileId = playerState.profileId;

      if (consented) {
        // Déconnexion volontaire
        console.log(`👋 ${characterName} quitte ${this.serverId} (volontaire)`);
        
        // Sauvegarder les HP/ressource actuels dans MongoDB
        await this.savePlayerStats(profileId, playerState);
        
        // Mettre à jour lastOnline
        await this.updateLastOnline(profileId);
        
        // Désenregistrer du CombatManager
        this.combatManager.unregisterClient(client.sessionId);

        // Retirer du state
        this.state.removePlayer(client.sessionId);

      } else {
        // Déconnexion accidentelle : autoriser reconnexion (30 secondes)
        console.log(`⚠️  ${characterName} déconnecté (accidentel) - reconnexion autorisée 30s`);
        
        try {
          await this.allowReconnection(client, 30);
          console.log(`🔄 ${characterName} reconnecté avec succès`);
          
          // Réenregistrer le client dans CombatManager
          this.combatManager.registerClient(client.sessionId, client);
        } catch (err) {
          // Timeout atteint, sauvegarder et retirer du state
          console.log(`❌ ${characterName} - timeout reconnexion`);
          await this.savePlayerStats(profileId, playerState);
          await this.updateLastOnline(profileId);
          this.combatManager.unregisterClient(client.sessionId);
          this.state.removePlayer(client.sessionId);
        }
      }

    } catch (err: any) {
      console.error("❌ Erreur dans onLeave:", err.message);
    }
  }

  /**
   * Réception de messages du client
   */
  private handleMessage(client: Client, type: string | number, message: any) {
    const playerState = this.state.players.get(client.sessionId);
    
    if (!playerState) {
      return;
    }

    console.log(`📨 Message de ${playerState.characterName}: ${type}`, message);

    // ===== MOUVEMENT MANUEL =====
    if (type === "player_move") {
      playerState.posX = message.x;
      playerState.posY = message.y;
      playerState.posZ = message.z;
      playerState.lastMovementTime = Date.now();
      
      // Arrêter le combat si en cours
      if (playerState.inCombat) {
        this.combatManager.stopCombat(playerState);
      }
      return;
    }

    // ===== AFK =====
    if (type === "activate_afk_mode") {
      this.afkManager.activateAFK(client, playerState);
      return;
    }

    if (type === "deactivate_afk_mode") {
      this.afkManager.deactivateAFK(client, playerState);
      return;
    }

    if (type === "claim_afk_summary") {
      this.afkManager.claimSummary(client, playerState);
      return;
    }
    
    if (type === "get_afk_summary") {
      this.afkManager.sendSummaryUpdate(client, playerState.profileId);
      return;
    }

    // ===== NPC =====
    if (type === "npc_interact") {
      this.npcManager.handleInteraction(client, playerState, message);
      return;
    }

    if (type === "dialogue_choice") {
      this.npcManager.handleDialogueChoice(client, playerState, message);
      return;
    }

    // ===== TEST: SPAWN MONSTRE =====
    if (type === "spawn_test_monster") {
      console.log("🧪 Spawn d'un monstre TEST demandé par", playerState.characterName);
    
      const MonsterState = require("../schema/MonsterState").MonsterState;
    
      const monster = new MonsterState(
        message.monsterId || "test_" + Date.now(),
        message.name || "Training Dummy",
        "test",
        1,
        30,
        30,
        5,
        0,
        1,
        "test_zone",
        message.x || 105,
        message.y || 0,
        message.z || 105,
        0,
        0,
        0,
        "aggressive",
        12,   // aggro range
        20,   // leash range
        2,    // attack range
        5,    // XP
        3,    // respawn time
        false,// respawnOnDeath
        "dummy_model",
        true
      );
    
      this.state.addMonster(monster);
    
      console.log("🟢 Monstre TEST ajouté :", monster.name);
      return;
    }

    // ===== ADMIN =====
    if (type === "npc_reload" && this.isAdmin(playerState)) {
      this.npcManager.reloadNPCs();
      client.send("info", { message: "NPCs reloaded" });
      return;
    }
    
    if (type === "monster_reload" && this.isAdmin(playerState)) {
      this.monsterManager.reloadMonsters();
      client.send("info", { message: "Monsters reloaded" });
      return;
    }
  }

  /**
   * Vérifie si un joueur est admin
   */
  private isAdmin(playerState: PlayerState): boolean {
    // TODO: Vérifier dans la DB si le joueur est admin
    return false;
  }

  /**
   * Tick du serveur (appelé toutes les ~33ms)
   */
  update(deltaTime: number) {
    // Tick combat (détection monstres, auto-attaque, déplacements)
    this.combatManager.update(deltaTime);
    
    // Tick AFK (gérer timers, récaps, etc.)
    this.afkManager.update(deltaTime);
    
    // TODO: Régénération de mana/rage/energy
    // TODO: Tick des DoT/HoT
  }

  /**
   * Nettoyage de la room
   */
  onDispose() {
    console.log(`♻️  WorldRoom ${this.serverId} détruite`);
    
    if (this.updateInterval) {
      this.updateInterval.clear();
    }
  }

  /**
   * Met à jour le lastOnline dans MongoDB
   */
  private async updateLastOnline(profileId: string): Promise<void> {
    try {
      await ServerProfile.findByIdAndUpdate(profileId, {
        lastOnline: new Date()
      });
    } catch (err: any) {
      console.error("❌ Erreur update lastOnline:", err.message);
    }
  }
  
  /**
   * Sauvegarde les stats actuelles (HP/ressource) dans MongoDB
   */
  private async savePlayerStats(profileId: string, playerState: PlayerState): Promise<void> {
    try {
      const profile = await ServerProfile.findById(profileId);
      
      if (profile) {
        profile.computedStats.hp = playerState.hp;
        profile.computedStats.resource = playerState.resource;
        await profile.save();
        console.log(`💾 Stats sauvegardées pour ${playerState.characterName}: HP=${playerState.hp}/${playerState.maxHp}`);
      }
    } catch (err: any) {
      console.error("❌ Erreur savePlayerStats:", err.message);
    }
  }
}
