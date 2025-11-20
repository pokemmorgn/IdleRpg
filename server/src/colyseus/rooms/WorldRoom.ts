import { Room, Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { validateToken } from "../utils/authHelper";
import { loadPlayerCharacter, isCharacterAlreadyConnected } from "../utils/playerLoader";
import { NPCManager } from "../managers/NPCManager";
import { MonsterManager } from "../managers/MonsterManager";
import { CombatManager } from "../managers/CombatManager";
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

  async onCreate(options: { serverId: string }) {
    console.log("======================================================");
    console.log("🧪 DEBUG WORLD ROOM START");
    console.log("======================================================");

    console.log("onCreate OPTIONS:", options);

    this.serverId = options.serverId;
    this.roomId = `world_${this.serverId}`;
    this.setState(new GameState(this.serverId));

    this.npcManager = new NPCManager(this.serverId, this.state);
    this.monsterManager = new MonsterManager(this.serverId, this.state);

    this.combatManager = new CombatManager(
      this.state,
      null as any, // on s’en fout pour debug
      (sessionId, type, data) => {
        console.log("📡 BROADCAST:", { sessionId, type, data });
        const client = this.clients.find(c => c.sessionId === sessionId);
        if (client) client.send(type, data);
      }
    );

    await this.npcManager.loadNPCs();
    await this.monsterManager.loadMonsters();

    console.log("🟢 NPC + Monsters loaded");

    // ---------------------------------------------------
    // 1) Handler COLYSEUS NORMAL
    // ---------------------------------------------------
    this.onMessage("*", (client, type, message) => {
      console.log("💬 RAW COLYSEUS * message");
      console.log("  type =", type);
      console.log("  message =", message);
      this.handleMessage(client, String(type), message);
    });

    // ---------------------------------------------------
    // 2) Handler JSON PATCH MANUEL
    // ---------------------------------------------------
    this.onMessage("json", (client, raw) => {
      console.log("💬 JSON MESSAGE RECEIVED:", raw);
      try {
        const msg = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (msg.type) {
          console.log("👉 Passing JSON type =", msg.type);
          this.handleMessage(client, msg.type, msg);
        }
      } catch (err) {
        console.log("❌ JSON parse error:", err);
      }
    });

    // ---------------------------------------------------
    // 3) Handler RAW BINAIRE (pour scripts)
    // ---------------------------------------------------
    this.onMessage("message", (client, raw) => {
      console.log("💬 MESSAGE EVENT (fallback) =", raw);
    });

    // ---------------------------------------------------
    // TICK SYSTEM
    // ---------------------------------------------------
    this.setSimulationInterval((delta) => {
      this.combatManager.update(delta);
    }, 33);

    this.updateInterval = this.clock.setInterval(() => {
      this.state.updateWorldTime();
    }, 1000);
  }

  async onAuth(client: Client, options: JoinOptions): Promise<AuthData | false> {
    console.log("======================================================");
    console.log("🔐 AUTH REQUEST");
    console.log("options =", options);

    if (!options.token) return false;

    const valid = await validateToken(options.token);
    console.log("validateToken =", valid);

    if (!valid.valid) return false;

    const load = await loadPlayerCharacter(valid.playerId, options.serverId, options.characterSlot);
    console.log("loadPlayerCharacter =", load);

    if (!load.success || !load.profile) return false;

    if (isCharacterAlreadyConnected(this.state.players, load.profile.profileId)) {
      console.log("❌ Already connected");
      return false;
    }

    const p = load.profile;

    console.log("🔓 AUTH OK :", p.characterName);

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

  async onJoin(client: Client, options: JoinOptions, auth: AuthData) {
    console.log("======================================================");
    console.log("👤 onJoin");
    console.log("client.sessionId =", client.sessionId);
    console.log("auth =", auth);

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

    console.log("🟢 PlayerState created:", player);

    this.state.addPlayer(player);
    console.log("Players in room:", this.state.players.size);

    client.send("welcome", {
      msg: "OK",
      serverId: this.serverId
    });
  }

  private handleMessage(client: Client, type: string, msg: any) {
    console.log("======================================================");
    console.log("📨 handleMessage RECEIVED:");
    console.log(" client =", client.sessionId);
    console.log(" type =", type);
    console.log(" msg =", msg);

    const player = this.state.players.get(client.sessionId);
    if (!player) {
      console.log("❌ PLAYER NOT FOUND IN STATE!");
      return;
    }

    // ---------------------------------------------
    // 🔥 SPAWN TEST MONSTER
    // ---------------------------------------------
    if (type === "spawn_test_monster") {
      console.log("🔥🔥🔥 spawn_test_monster TRIGGERED !!!");

      const MonsterState = require("../schema/MonsterState").MonsterState;

      const mon = new MonsterState(
        msg.monsterId || "test_" + Date.now(),
        msg.name || "TrainingDummy",
        "test",
        1,
        50,
        50,
        10,
        0,
        1,
        "zone",
        msg.x || 105,
        msg.y || 0,
        msg.z || 105,
        0, 0, 0,
        "aggressive",
        10,
        10,
        1,
        5,
        2,
        false,
        "dummy",
        true
      );

      console.log("🟢 ADDING MONSTER:", mon.monsterId);
      this.state.addMonster(mon);
      console.log("Total monsters =", this.state.monsters.size);

      return;
    }

    // ---------------------------------------------
    // MOVE
    // ---------------------------------------------
    if (type === "player_move") {
      console.log("MOVE:", msg);
      player.posX = msg.x;
      player.posY = msg.y;
      player.posZ = msg.z;
      return;
    }
  }

  update(deltaTime: number) {
    console.log(`🕒 TICK delta=${deltaTime}ms | players=${this.state.players.size} | monsters=${this.state.monsters.size}`);
    this.combatManager.update(deltaTime);
  }

  onDispose() {
    console.log("🗑 WorldRoom disposed");
  }
}
