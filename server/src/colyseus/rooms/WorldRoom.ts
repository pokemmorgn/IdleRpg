// server/src/colyseus/rooms/WorldRoom.ts

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
import { DialogueManager } from "../managers/DialogueManager";
import { TestManager } from "../test/TestManager";

import { SkinManager } from "../managers/SkinManager";
import { computeFullStats } from "../managers/stats/PlayerStatsCalculator";

import { InventoryManager } from "../managers/InventoryManager";    // 🔥 AJOUT

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
  private dialogueManager!: DialogueManager;

  private inventoryManager!: InventoryManager;        // 🔥 AJOUT

  private testManager?: TestManager;

  // ===========================================================
  // onCreate
  // ===========================================================
  async onCreate(options: { serverId: string }) {
    this.serverId = options.serverId;
    console.log(`🟢 onCreate(serverId=${this.serverId})`);

    this.setState(new GameState(this.serverId));
    console.log("🧬 GameState initialisé");

    // --- SKIN MANAGER ---
    new SkinManager(); // instance globale

    // --- QUEST SYSTEM ---
    this.questManager = new QuestManager(
      this.serverId,
      this.state,
      this.savePlayerData.bind(this)
    );

    await this.questManager.loadAllQuestsFromDB();

    this.questObjectiveManager = new QuestObjectiveManager(
      this.state,
      (sessionId: string, type: string, payload: any) => {
        const client = this.clients.find(c => c.sessionId === sessionId);
        if (client) client.send(type, payload);
      },
      this.savePlayerData.bind(this)
    );

    this.dialogueManager = new DialogueManager(
      this.serverId,
      this.questObjectiveManager,
      this.questManager,
      this.state
    );

    // --- NPC + MONSTERS ---
    this.npcManager = new NPCManager(
      this.serverId,
      this.state,
      this.questManager,
      this.questObjectiveManager,
      this.dialogueManager
    );

    this.monsterManager = new MonsterManager(
      this.serverId,
      this.state
    );

    // --- COMBAT MANAGER ---
    this.combatManager = new CombatManager(
      this.state,
      (sessionId, type, data) => {
        const client = this.clients.find(c => c.sessionId === sessionId);
        if (client) client.send(type, data);
      },
      this.questObjectiveManager
    );

    // --- INVENTORY MANAGER ---
    this.inventoryManager = new InventoryManager(
      this.state,
      (sessionId, type, payload) => {
        const c = this.clients.find(cl => cl.sessionId === sessionId);
        if (c) c.send(type, payload);
      },
      this.savePlayerData.bind(this)
    );

    // --- LOAD WORLD ENTITIES ---
    await this.npcManager.loadNPCs();
    await this.monsterManager.loadMonsters();

    // --- TEST ENV ---
    if (this.serverId === "test") {
      this.testManager = new TestManager(
        this.state,
        this.questManager,
        this.dialogueManager,
        this.questObjectiveManager
      );
      this.testManager.loadAll();
    }

    console.log("📥 WORLD ROOM READY (message handlers setup)");

    // ===========================================================
    // MESSAGE HANDLING
    // ===========================================================
    this.onMessage("*", (client, type, msg) => {
      this.handleMessage(client, String(type), msg);
    });

    // ===========================================================
    // SIMULATION LOOP
    // ===========================================================
    this.setSimulationInterval((dt) => {
      this.combatManager.update(dt);
    }, 33);

    // Time loop
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

    if (isCharacterAlreadyConnected(this.state.players, load.profile.profileId)) {
      console.log("❌ Player already connected");
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
      characterSlot: p.characterSlot,
      stats: p.stats,
      questData: p.questData,
      inventory: p.inventory
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

    if (auth.questData) player.loadQuestsFromProfile(auth.questData);

    // LOAD INVENTORY
    if (auth.inventory) {
      player.inventory.loadFromProfile(auth.inventory);
    }

    // STATS
    const computed = computeFullStats(player);
    player.loadStatsFromProfile(computed);

    client.send("welcome", { ok: true });
    this.state.addPlayer(player);
  }

  // ===========================================================
  // LEAVE
  // ===========================================================
  async onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) await this.savePlayerData(player);
    this.state.removePlayer(client.sessionId);
  }

  // ===========================================================
  // HANDLE MESSAGES  (🔥 async ajouté)
  // ===========================================================
  private async handleMessage(client: Client, type: string, msg: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // ---- SKINS ----
    const handledBySkin = require("../managers/SkinManager")
      .SkinManagerInstance
      ?.handleMessage(type, client, player, msg);
    if (handledBySkin) return;

    // ---- INVENTORY ----
    if (type.startsWith("inv_")) {
      await this.inventoryManager.handleMessage(type, client, player, msg);
      return;
    }

    // ---- RESPAWN ----
    if (type === "respawn") {
      if (!player.isDead) return;
      this.combatManager.respawnPlayer(player);
      return;
    }

    // ---- NPC ----
    if (type === "npc_interact") return this.npcManager.handleInteraction(client, player, msg);
    if (type === "npc_accept_quest") return this.npcManager.handleAcceptQuest(client, player, msg);
    if (type === "npc_turn_in_quest") return this.npcManager.handleTurnInQuest(client, player, msg);
    if (type === "dialogue_choice") return this.npcManager.handleDialogueChoice(client, player, msg);

    // ---- QUEST OBJECTIVES ----
    if (type === "quest_talk") return this.questObjectiveManager.onTalk(player, msg);
    if (type === "quest_collect") return this.questObjectiveManager.onCollect(player, msg);
    if (type === "quest_explore") return this.questObjectiveManager.onExplore(player, msg);

    // ---- TEST ----
    if (type === "test_trigger_quest_objective") {
      this.questObjectiveManager.onMonsterKilled(player, {
        enemyType: msg.enemyType || "test_wolf",
        enemyRarity: msg.enemyRarity,
        isBoss: msg.isBoss || false,
        zoneId: player.zoneId
      });
      return;
    }

    if (type === "spawn_test_monster") {
      this.spawnTestMonster(msg);
      return;
    }
  }

  // ===========================================================
  // SAVE PLAYER
  // ===========================================================
  private async savePlayerData(player: PlayerState): Promise<void> {
    try {
      console.log(`💾 Saving data for ${player.characterName}...`);

      const computed = computeFullStats(player);

      await ServerProfile.findByIdAndUpdate(player.profileId, {
        $set: {
          lastOnline: new Date(),
          stats: computed,
          questData: player.saveQuestsToProfile(),
          inventory: player.inventory.saveToProfile()
        }
      });

      console.log(`✅ Saved ${player.characterName}`);
    } catch (error) {
      console.error("❌ Save error:", error);
    }
  }

  // ===========================================================
  // TEST MONSTER
  // ===========================================================
  private spawnTestMonster(msg: any) {
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
  }
}
