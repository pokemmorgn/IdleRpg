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

  // ===========================================================
  // onCreate
  // ===========================================================
  async onCreate(options: { serverId: string }) {
    this.serverId = options.serverId;
    this.roomId = `world_${this.serverId}`;

    this.setState(new GameState(this.serverId));
    console.log(`🌍 WorldRoom créée pour serveur: ${this.serverId}`);

    // MANAGERS
    this.npcManager = new NPCManager(this.serverId, this.state);
    this.monsterManager = new MonsterManager(this.serverId, this.state);
    this.afkManager = new AFKManager(
      this.state,
      (sessionId, type, data) => {
        const client = this.clients.find(c => c.sessionId === sessionId);
        if (client) client.send(type, data);
      }
    );

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

    // Colyseus raw messages ("*")
    this.onMessage("*", (client, type, message) => {
      this.handleMessage(client, String(type), message);
    });

    // 🔥 Patch JSON messages venant du WS client
    this.onMessage("raw", (client, raw: any) => {
      try {
        const json =
          typeof raw === "string" ? JSON.parse(raw) : raw;

        if (!json?.type) return;

        // Passe le type JSON à handleMessage EXACTEMENT comme Colyseus
        this.handleMessage(client, json.type, json);

      } catch (err) {
        console.error("❌ RAW JSON parse error:", err);
      }
    });

    // Tick
    this.setSimulationInterval((delta) => this.update(delta), 33);

    this.updateInterval = this.clock.setInterval(() => {
      this.state.updateWorldTime();
    }, 1000);
  }

  // ===========================================================
  // AUTH
  // ===========================================================
  async onAuth(client: Client, options: JoinOptions): Promise<AuthData | false> {
    try {
      if (!options.token || !options.serverId || !options.characterSlot) return false;
      if (options.serverId !== this.serverId) return false;

      const valid = await validateToken(options.token);
      if (!valid.valid || !valid.playerId) return false;

      const load = await loadPlayerCharacter(
        valid.playerId,
        options.serverId,
        options.characterSlot
      );

      if (!load.success || !load.profile) return false;

      if (isCharacterAlreadyConnected(this.state.players, load.profile.profileId)) {
        console.log("❌ Personnage déjà connecté");
        return false;
      }

      const p = load.profile;

      return {
        playerId: p.playerId,
        profileId: p.profileId,
        characterName: p.characterName,
        level: p.level,
        characterClass: p.class,
        characterRace: p.race,
        characterSlot: p.characterSlot
      };

    } catch (err) {
      console.error("❌ Auth error:", err);
      return false;
    }
  }

  // ===========================================================
  // JOIN
  // ===========================================================
  async onJoin(client: Client, options: JoinOptions, auth: AuthData) {
    try {
      const player = new PlayerState(
        client.sessionId,
        auth.playerId,
        auth.profileId,
        auth.characterSlot,
        auth.characterName,
        auth.level,
        auth.characterClass,
        auth.characterRace
      );

      const profile = await ServerProfile.findById(auth.profileId);
      if (profile?.computedStats) {
        player.loadStatsFromProfile(profile.computedStats);
      }

      this.state.addPlayer(player);

      client.send("welcome", {
        message: `Bienvenue ${auth.characterName} sur ${this.serverId} !`,
        serverId: this.serverId,
        onlinePlayers: this.state.onlineCount,
        npcCount: this.npcManager.getNPCCount(),
        monsterCount: this.monsterManager.getMonsterCount(),
        stats: {
          hp: player.hp,
          maxHp: player.maxHp,
          resource: player.resource,
          maxResource: player.maxResource,
          attackPower: player.attackPower,
          spellPower: player.spellPower,
          attackSpeed: player.attackSpeed,
          moveSpeed: player.moveSpeed
        }
      });

      await this.updateLastOnline(auth.profileId);

    } catch (err) {
      console.error("❌ onJoin error:", err);
    }
  }

  // ===========================================================
  // LEAVE
  // ===========================================================
  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    try {
      if (consented) {
        await this.savePlayerStats(player.profileId, player);
        await this.updateLastOnline(player.profileId);
        this.state.removePlayer(client.sessionId);

      } else {
        try {
          await this.allowReconnection(client, 30);
        } catch {
          await this.savePlayerStats(player.profileId, player);
          await this.updateLastOnline(player.profileId);
          this.state.removePlayer(client.sessionId);
        }
      }

    } catch (err) {
      console.error("❌ onLeave error:", err);
    }
  }

  // ===========================================================
  // HANDLE MESSAGE
  // ===========================================================
  private handleMessage(client: Client, type: string, msg: any) {

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // ---------------------------------------------------------
    // PLAYER MOVE
    // ---------------------------------------------------------
    if (type === "player_move") {
      player.posX = msg.x;
      player.posY = msg.y;
      player.posZ = msg.z;
      player.lastMovementTime = Date.now();

      if (player.inCombat) {
        this.combatManager.forceStopCombat(player);
      }
      return;
    }

    // ---------------------------------------------------------
    // SPAWN TEST MONSTER (RAW JSON)
    // ---------------------------------------------------------
    if (type === "spawn_test_monster") {

      console.log("🔥 spawn_test_monster reçu :", msg);

      const MonsterState = require("../schema/MonsterState").MonsterState;

      const mon = new MonsterState(
        msg.monsterId || "test_" + Date.now(),
        msg.name || "Training Dummy",
        "test",
        1,
        30,
        30,
        5,
        0,
        1,
        "test_zone",
        msg.x || 105,
        msg.y || 0,
        msg.z || 105,
        0, 0, 0,
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

      this.state.addMonster(mon);
      console.log("🟢 Monstre ajouté :", mon.monsterId);
      return;
    }

    // ---------------------------------------------------------
    // AFK
    // ---------------------------------------------------------
    if (type === "activate_afk_mode") return this.afkManager.activateAFK(client, player);
    if (type === "deactivate_afk_mode") return this.afkManager.deactivateAFK(client, player);
    if (type === "claim_afk_summary") return this.afkManager.claimSummary(client, player);
    if (type === "get_afk_summary") return this.afkManager.sendSummaryUpdate(client, player.profileId);

    // ---------------------------------------------------------
    // QUEUE SKILL
    // ---------------------------------------------------------
    if (type === "queue_skill") {
      if (!player.inCombat) return;
      if (!msg?.skillId) return;
      if (!player.skills.has(msg.skillId)) return;

      player.queuedSkill = msg.skillId;
      console.log(`[Queue] ${player.characterName} queue skill: ${msg.skillId}`);
      return;
    }

    if (type === "clear_skill_queue") {
      player.queuedSkill = "";
      return;
    }

    // ---------------------------------------------------------
    // NPC
    // ---------------------------------------------------------
    if (type === "npc_interact") {
      return this.npcManager.handleInteraction(client, player, msg);
    }
    if (type === "dialogue_choice") {
      return this.npcManager.handleDialogueChoice(client, player, msg);
    }

    // ---------------------------------------------------------
    // RELOAD
    // ---------------------------------------------------------
    if (type === "npc_reload") {
      this.npcManager.reloadNPCs();
      return client.send("info", { message: "NPCs reloaded" });
    }

    if (type === "monster_reload") {
      this.monsterManager.reloadMonsters();
      return client.send("info", { message: "Monsters reloaded" });
    }
  }

  // ===========================================================
  // TICK
  // ===========================================================
  update(deltaTime: number) {
    this.combatManager.update(deltaTime);
    this.afkManager.update(deltaTime);
  }

  onDispose() {
    if (this.updateInterval) this.updateInterval.clear();
  }

  // ===========================================================
  // SAVE
  // ===========================================================
  private async updateLastOnline(profileId: string) {
    await ServerProfile.findByIdAndUpdate(profileId, { lastOnline: new Date() });
  }

  private async savePlayerStats(profileId: string, player: PlayerState) {
    const profile = await ServerProfile.findById(profileId);
    if (profile) {
      profile.computedStats.hp = player.hp;
      profile.computedStats.resource = player.resource;
      await profile.save();
    }
  }
}
