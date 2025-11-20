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

export class WorldRoom extends Room<GameState> {
  maxClients = 1000;

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

    // Init state
    this.setState(new GameState(this.serverId));

    console.log(`🌍 WorldRoom créée pour serveur: ${this.serverId}`);

    // Managers NPC / MONSTERS
    this.npcManager = new NPCManager(this.serverId, this.state);
    this.monsterManager = new MonsterManager(this.serverId, this.state);

    // AFK MANAGER (Version B — RAM only)
    this.afkManager = new AFKManager(
      this.state,
      (sessionId, type, data) => {
        const client = this.clients.find(c => c.sessionId === sessionId);
        if (client) client.send(type, data);
      }
    );

    // COMBAT MANAGER
    this.combatManager = new CombatManager(
      this.state,
      this.afkManager,
      (sessionId, type, data) => {
        const client = this.clients.find(c => c.sessionId === sessionId);
        if (client) client.send(type, data);
      }
    );

    // Load NPCs & Monsters
    await this.npcManager.loadNPCs();
    await this.monsterManager.loadMonsters();

    // Messages
    this.onMessage("*", (client, type, message) => {
      this.handleMessage(client, String(type), message);
    });

    // Simulation interval (30 FPS)
    this.setSimulationInterval((deltaTime) => this.update(deltaTime), 33);

    // Update world time every second
    this.updateInterval = this.clock.setInterval(() => {
      this.state.updateWorldTime();
    }, 1000);
  }

  /**
   * Authentification
   */
  async onAuth(client: Client, options: JoinOptions): Promise<AuthData | false> {
    try {
      if (!options.token || !options.serverId || !options.characterSlot) return false;
      if (options.serverId !== this.serverId) return false;

      const tokenValidation = await validateToken(options.token);
      if (!tokenValidation.valid || !tokenValidation.playerId) return false;

      const playerId = tokenValidation.playerId;

      const characterLoad = await loadPlayerCharacter(
        playerId,
        options.serverId,
        options.characterSlot
      );

      if (!characterLoad.success || !characterLoad.profile) return false;

      const profile = characterLoad.profile;

      if (isCharacterAlreadyConnected(this.state.players, profile.profileId)) {
        console.log(`❌ Personnage déjà connecté`);
        return false;
      }

      return {
        playerId: profile.playerId,
        profileId: profile.profileId,
        characterName: profile.characterName,
        level: profile.level,
        characterClass: profile.class,
        characterRace: profile.race,
        characterSlot: profile.characterSlot
      };

    } catch (err) {
      console.error("❌ Auth error:", err);
      return false;
    }
  }

  /**
   * Join
   */
  async onJoin(client: Client, options: JoinOptions, auth: AuthData) {
    try {
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

      // Load stats from DB
      const fullProfile = await ServerProfile.findById(auth.profileId);
      if (fullProfile?.computedStats) {
        playerState.loadStatsFromProfile(fullProfile.computedStats);
      }

      // Add to state
      this.state.addPlayer(playerState);

      // Welcome message
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

      // update lastOnline
      await this.updateLastOnline(auth.profileId);

    } catch (err) {
      console.error("❌ onJoin error:", err);
    }
  }

  /**
   * Leave
   */
  async onLeave(client: Client, consented: boolean) {
    const playerState = this.state.players.get(client.sessionId);
    if (!playerState) return;

    const profileId = playerState.profileId;

    try {
      if (consented) {
        await this.savePlayerStats(profileId, playerState);
        await this.updateLastOnline(profileId);
        this.state.removePlayer(client.sessionId);
      } else {
        try {
          await this.allowReconnection(client, 30);
        } catch {
          await this.savePlayerStats(profileId, playerState);
          await this.updateLastOnline(profileId);
          this.state.removePlayer(client.sessionId);
        }
      }
    } catch (err) {
      console.error("❌ onLeave error:", err);
    }
  }

  /**
   * Messages
   */
  private handleMessage(client: Client, type: string | number, message: any) {
    const playerState = this.state.players.get(client.sessionId);
    if (!playerState) return;

    // ------------------------------
    // Move
    // ------------------------------
    if (type === "player_move") {
      playerState.posX = message.x;
      playerState.posY = message.y;
      playerState.posZ = message.z;
      playerState.lastMovementTime = Date.now();

      if (playerState.inCombat) {
        this.combatManager.forceStopCombat(playerState);
      }
      return;
    }

    // ------------------------------
    // AFK
    // ------------------------------
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

    // ------------------------------
    // NPC
    // ------------------------------
    if (type === "npc_interact") {
      this.npcManager.handleInteraction(client, playerState, message);
      return;
    }

    if (type === "dialogue_choice") {
      this.npcManager.handleDialogueChoice(client, playerState, message);
      return;
    }

    // ------------------------------
    // Spawn test monster
    // ------------------------------
    if (type === "spawn_test_monster") {
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
        0,0,0,
        "aggressive",
        12,
        20,
        2,
        5,
        3,
        false,
        "dummy_model",
        true
      );

      this.state.addMonster(monster);
      return;
    }

    // ------------------------------
    // ADMIN
    // ------------------------------
    if (type === "npc_reload") {
      this.npcManager.reloadNPCs();
      client.send("info", { message: "NPCs reloaded" });
      return;
    }

    if (type === "monster_reload") {
      this.monsterManager.reloadMonsters();
      client.send("info", { message: "Monsters reloaded" });
      return;
    }
  }
  // ------------------------------
  // Skill Queueing
  // ------------------------------
  if (type === "queue_skill") {
    const playerState = this.state.players.get(client.sessionId);
    if (!playerState || !playerState.inCombat) return;
  
    const skillId = message.skillId;
    if (!skillId) return;
  
    // Vérification simple : le joueur possède-t-il ce skill ?
    if (playerState.skills.has(skillId)) {
      playerState.queuedSkill = skillId;
      console.log(`[Queue] ${playerState.characterName} a mis en file d'attente le skill: ${skillId}`);
    }
    return;
  }
  
  if (type === "clear_skill_queue") {
    const playerState = this.state.players.get(client.sessionId);
    if (playerState) {
      playerState.queuedSkill = "";
    }
    return;
  }
  /**
   * Server tick
   */
  update(deltaTime: number) {
    this.combatManager.update(deltaTime);
    this.afkManager.update(deltaTime);
  }

  onDispose() {
    if (this.updateInterval) this.updateInterval.clear();
  }

  private async updateLastOnline(profileId: string) {
    await ServerProfile.findByIdAndUpdate(profileId, { lastOnline: new Date() });
  }

  private async savePlayerStats(profileId: string, playerState: PlayerState) {
    const profile = await ServerProfile.findById(profileId);
    if (profile) {
      profile.computedStats.hp = playerState.hp;
      profile.computedStats.resource = playerState.resource;
      await profile.save();
    }
  }
}
