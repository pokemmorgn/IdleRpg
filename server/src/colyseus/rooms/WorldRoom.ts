import { Room, Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { validateToken } from "../utils/authHelper";
import { loadPlayerCharacter, isCharacterAlreadyConnected } from "../utils/playerLoader";
import { NPCManager } from "../managers/NPCManager";
import { MonsterManager } from "../managers/MonsterManager";
import { CombatManager } from "../managers/CombatManager";
import ServerProfile from "../../models/ServerProfile";

export class WorldRoom extends Room<GameState> {
  maxClients = 1000;

  private serverId = "";
  private updateInterval: any;

  private npcManager!: NPCManager;
  private monsterManager!: MonsterManager;
  private combatManager!: CombatManager;

  // ===========================================================
  // onCreate
  // ===========================================================
  async onCreate(options: { serverId: string }) {
    this.serverId = options.serverId;
    console.log(`🟢 onCreate(serverId=${this.serverId})`);

    this.setState(new GameState(this.serverId));
    console.log("🧬 GameState initialisé");

    this.npcManager = new NPCManager(this.serverId, this.state);
    this.monsterManager = new MonsterManager(this.serverId, this.state);

    this.combatManager = new CombatManager(
      this.state,
      (sessionId, type, data) => {
        console.log("📡 BROADCAST:", { sessionId, type, data });
        const client = this.clients.find(c => c.sessionId === sessionId);
        if (client) client.send(type, data);
      }
    );

    await this.npcManager.loadNPCs();
    await this.monsterManager.loadMonsters();
    
    // 🔥 Ajout temporaire pour le serveur "test"
    if (this.serverId === "test") {
        this.spawnTemporaryTestMonsters();
    }
    
    console.log("📥 WORLD ROOM READY (messages setup)");

    // Colyseus messages (room.send)
    this.onMessage("*", (client, type, msg) => {
      console.log("📨 RAW onMessage(*):");
      console.log("   type =", type);
      console.log("   msg  =", msg);
      console.log("   typeof type =", typeof type);
      console.log("   typeof msg =", typeof msg);
      this.handleMessage(client, String(type), msg);
    });


    // WebSocket brut (JSON)
   this.onMessage("raw", (client, raw) => {
  console.log("📩 RAW (exact WebSocket):", raw);
});

    // Tick
    this.setSimulationInterval((dt) => {
      console.log(`🕒 TICK dt=${dt}ms | players=${this.state.players.size} | monsters=${this.state.monsters.size}`);
      this.combatManager.update(dt);
    }, 33);

    // WorldTime
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
    console.log("🔐 Token validation:", valid);

    if (!valid.valid) return false;

    const load = await loadPlayerCharacter(
      valid.playerId!,
      options.serverId,
      options.characterSlot
    );

    console.log("📥 loadPlayerCharacter:", load);

    if (!load.success || !load.profile) return false;

    if (isCharacterAlreadyConnected(this.state.players, load.profile.profileId)) {
      console.log("❌ Player already connected");
      return false;
    }

    const p = load.profile;

    console.log("🔓 Auth OK for:", p.characterName);

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
    console.log("🚪 onJoin:", { sessionId: client.sessionId, auth });

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

    this.state.addPlayer(player);
    console.log("🟢 Player added to state:", player.characterName);

    client.send("welcome", { ok: true });
  }

  // ===========================================================
  // LEAVE
  // ===========================================================
  onLeave(client: Client) {
    console.log("👋 Player left:", client.sessionId);
    this.state.removePlayer(client.sessionId);
  }

  // ===========================================================
  // HANDLE MESSAGES
  // ===========================================================
  private handleMessage(client: Client, type: string, msg: any) {
    console.log("🎯 handleMessage:", { type, msg });

    if (type === "spawn_test_monster") {
      console.log("🔥 SPAWN MONSTER TRIGGERED:", msg);

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

      console.log("🟢 MONSTER ADDED:", m.monsterId);
    }
  }
  private spawnTemporaryTestMonsters() {
    console.log("🔥 Seed de monstres temporaires pour serveur test...");

    const MonsterState = require("../schema/MonsterState").MonsterState;

    const monster1 = new MonsterState(
        "test_dummy_1",
        "Training Dummy 1",
        "test_zone",
        1,
        50,     // max HP
        50,     // HP
        5,      // attack
        0,      // spellPower
        1,      // attackSpeed
        "test_zone",
        0, 0, 0, // position
        0, 0, 0,     // rotation
        "aggressive",
        10,     // detectionRange
        20,     // chaseRange
        2,      // attackRange
        5,      // wanderRadius
        3,      // respawnTime
        false,
        "dummy_model",
        true
    );

    const monster2 = new MonsterState(
        "test_dummy_2",
        "Training Dummy 2",
        "test_zone",
        1,
        55,
        55,
        6,
        0,
        1,
        "test_zone",
        1, 0, 1,
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

    this.state.addMonster(monster1);
    this.state.addMonster(monster2);

    console.log("🟢 Monstres temporaires ajoutés !");
}

}
