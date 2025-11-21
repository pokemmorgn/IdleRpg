import { Room, Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";

import { validateToken } from "../utils/authHelper";
import { loadPlayerCharacter, isCharacterAlreadyConnected } from "../utils/playerLoader";

import { NPCManager } from "../managers/NPCManager";
import { MonsterManager } from "../managers/MonsterManager";
import { CombatManager } from "../managers/CombatManager";

import { QuestManager } from "../managers/QuestManager";
import { QuestObjectiveManager } from "../managers/QuestObjectiveManager";

import ServerProfile from "../../models/ServerProfile";

export class WorldRoom extends Room<GameState> {
  maxClients = 1000;

  private serverId = "";
  private updateInterval: any;

  private npcManager!: NPCManager;
  private monsterManager!: MonsterManager;
  private combatManager!: CombatManager;

  private questManager!: QuestManager;
  private questObjectiveManager!: QuestObjectiveManager;

  // ===========================================================
  // onCreate
  // ===========================================================
  async onCreate(options: { serverId: string }) {
    this.serverId = options.serverId;
    console.log(`🟢 onCreate(serverId=${this.serverId})`);

    this.setState(new GameState(this.serverId));
    console.log("🧬 GameState initialisé");


    // ===========================================================
    // 🔥 SYSTEMES DE QUÊTES (à créer AVANT NPC et Monster)
    // ===========================================================
    this.questObjectiveManager = new QuestObjectiveManager(
      this.state,
      (sessionId, type, payload) => {
        const client = this.clients.find(c => c.sessionId === sessionId);
        if (client) client.send(type, payload);
      }
    );

    this.questManager = new QuestManager(
      this.serverId,
      this.state,
      this.questObjectiveManager
    );


    // ===========================================================
    // 🔥 NPC + MONSTERS (branchés sur quest systems)
    // ===========================================================
    this.npcManager = new NPCManager(
      this.serverId,
      this.state,
      this.questManager,
      this.questObjectiveManager
    );

    this.monsterManager = new MonsterManager(
      this.serverId,
      this.state,
      this.questObjectiveManager
    );


    // ===========================================================
    // 🔥 COMBAT SYSTEM
    // ===========================================================
    this.combatManager = new CombatManager(
      this.state,
      (sessionId, type, data) => {
        const client = this.clients.find(c => c.sessionId === sessionId);
        if (client) client.send(type, data);
      }
    );


    // ===========================================================
    // 🔥 CHARGEMENT NPC + MONSTRES
    // ===========================================================
    await this.npcManager.loadNPCs();
    await this.monsterManager.loadMonsters();

    if (this.serverId === "test") {
        this.spawnTemporaryTestMonsters();
    }

    console.log("📥 WORLD ROOM READY (messages setup)");


    // ===========================================================
    // Colyseus Messages
    // ===========================================================
    this.onMessage("*", (client, type, msg) => {
      this.handleMessage(client, String(type), msg);
    });

    this.onMessage("raw", (client, raw) => {
      console.log("📩 RAW:", raw);
    });

    // ===========================================================
    // SIMULATION LOOP
    // ===========================================================
    this.setSimulationInterval((dt) => {
      this.combatManager.update(dt);
    }, 33);

    // world time tick
    this.updateInterval = this.clock.setInterval(() => {
      this.state.updateWorldTime();
    }, 1000);
  }

  // ===========================================================
  // AUTH
  // ===========================================================
  async onAuth(client: Client, options: any) {
    console.log("🔐 onAuth options:", options);

    if (!options.token) return false;
    if (options.serverId !== this.serverId) return false;

    const valid = await validateToken(options.token);
    if (!valid.valid) return false;

    const load = await loadPlayerCharacter(
      valid.playerId!,
      options.serverId,
      options.characterSlot
    );

    if (!load.success || !load.profile) return false;

    if (isCharacterAlreadyConnected(this.state.players, load.profile.profileId))
      return false;

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
  }

  // ===========================================================
  // JOIN
  // ===========================================================
  async onJoin(client: Client, options: any, auth: any) {
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

    if (this.serverId === "test") {
        player.zoneId = "test_zone";
    }
    
    this.state.addPlayer(player);
    client.send("welcome", { ok: true });
  }

  // ===========================================================
  // LEAVE
  // ===========================================================
  onLeave(client: Client) {
    this.state.removePlayer(client.sessionId);
  }

  // ===========================================================
  // MESSAGES
  // ===========================================================
  private handleMessage(client: Client, type: string, msg: any) {

    if (type === "respawn") {
      const player = this.state.players.get(client.sessionId);
      if (player && player.isDead) {
        this.combatManager.respawnPlayer(player);
      }
      return;
    }

    if (type === "spawn_test_monster") {
      const MonsterState = require("../schema/MonsterState").MonsterState;
      const m = new MonsterState(
        msg.monsterId,
        msg.name || "Dummy",
        "test",
        1,
        30,
        30,
        5,
        0,
        1,
        "test_zone",
        msg.x, msg.y, msg.z,
        0, 0, 0,
        "aggressive",
        12,
        20,
        2,
        5,
        3,
        false,
        "dummy",
        true
      );
      this.state.addMonster(m);
      return;
    }
  }


  // TEMP MONSTER
  private spawnTemporaryTestMonsters() {
    const MonsterState = require("../schema/MonsterState").MonsterState;
    const m = new MonsterState(
      "test_dummy_1",
      "Training Dummy",
      "dummy",
      1,
      50,
      50,
      5,
      0,
      2,
      "test_zone",
      3,0,0,
      0,0,0,
      "aggressive",
      10,
      25,
      2,
      5,
      3,
      true,
      "dummy_model",
      true
    );
    this.state.addMonster(m);
  }

}
