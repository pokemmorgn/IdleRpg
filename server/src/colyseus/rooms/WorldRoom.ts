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
import { PlayerStatsCalculator } from "../managers/stats/PlayerStatsCalculator";
import { SkinManager } from "../managers/SkinManager"; // ← IMPORT SKINS

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

  private skinManager!: SkinManager; // ← AJOUT SKINS

  private testManager?: TestManager;

  // ===========================================================
  // onCreate
  // ===========================================================
  async onCreate(options: { serverId: string }) {
    this.serverId = options.serverId;
    console.log(`🟢 onCreate(serverId=${this.serverId})`);

    this.setState(new GameState(this.serverId));
    console.log("🧬 GameState initialisé");

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

    // --- NPC + MONSTER ---
    this.npcManager = new NPCManager(
      this.serverId,
      this.state,
      this.questManager,
      this.questObjectiveManager,
      this.dialogueManager
    );

    this.monsterManager = new MonsterManager(this.serverId, this.state);

    // --- COMBAT MANAGER ---
    this.combatManager = new CombatManager(
      this.state,
      (sessionId, type, data) => {
        const client = this.clients.find(c => c.sessionId === sessionId);
        if (client) client.send(type, data);
      },
      this.questObjectiveManager
    );

    // --- SKIN MANAGER ---
    this.skinManager = new SkinManager(); // ← INSTANCIATION SKINS

    // --- LOAD WORLD ENTITIES ---
    await this.npcManager.loadNPCs();
    await this.monsterManager.loadMonsters();

    // --- TEST ENVIRONMENT ---
    if (this.serverId === "test") {
      this.testManager = new TestManager(this.state, this.questManager, this.dialogueManager);
      this.testManager.loadAll();
    }

    console.log("📥 WORLD ROOM READY (messages setup)");

    // ===========================================================
    // MESSAGE HANDLING
    // ===========================================================
    this.onMessage("*", (client, type, msg) => {
      this.handleMessage(client, String(type), msg);
    });

    this.onMessage("raw", (client, raw) => {
      console.log("📩 RAW (exact WebSocket):", raw);
    });

    // ===========================================================
    // SIMULATION LOOP (combat)
    // ===========================================================
    this.setSimulationInterval((dt) => {
      this.combatManager.update(dt);
    }, 33);

    // World time update
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
      questData: p.questData
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

    if (auth.stats) player.loadStatsFromProfile(auth.stats);
    if (auth.questData) player.loadQuestsFromProfile(auth.questData);

    if (this.serverId === "test") player.zoneId = "test_zone";

    this.state.addPlayer(player);
    client.send("welcome", { ok: true });

    // === ENVOI DES STATS INITIALES ===
    const classStats = require("../../config/classes.config").getStatsForClass(
      player.class
    );
    const computed = PlayerStatsCalculator.compute(player, classStats);
    
    player.loadStatsFromProfile(computed);
    
    client.send("stats_update", {
      hp: player.hp,
      maxHp: player.maxHp,
      resource: player.resource,
      maxResource: player.maxResource,
      manaRegen: player.manaRegen,
      attackPower: player.attackPower,
      spellPower: player.spellPower,
      armor: player.armor,
      magicResistance: player.magicResistance,
      criticalChance: player.criticalChance,
      attackSpeed: player.attackSpeed,
      damageReduction: player.damageReduction
    });

  }

  // ===========================================================
  // LEAVE
  // ===========================================================
  async onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);

    if (player) {
      await this.savePlayerData(player);
    }

    this.state.removePlayer(client.sessionId);
  }

  // ===========================================================
  // HANDLE MESSAGES
  // ===========================================================
  private handleMessage(client: Client, type: string, msg: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // === SKIN MANAGER intercept ===
    if (this.skinManager.handleMessage(type, client, player, msg)) return;

    // RESPAWN
    if (type === "respawn") {
      if (!player.isDead) return;
      this.combatManager.respawnPlayer(player);
      return;
    }

    // NPC interaction
    if (type === "npc_interact") {
      this.npcManager.handleInteraction(client, player, msg);
      return;
    }

    // Accept quest
    if (type === "npc_accept_quest") {
      this.npcManager.handleAcceptQuest(client, player, msg);
      return;
    }

    // Turn in quest
    if (type === "npc_turn_in_quest") {
      this.npcManager.handleTurnInQuest(client, player, msg);
      return;
    }

    // Dialogue choice
    if (type === "dialogue_choice") {
      this.npcManager.handleDialogueChoice(client, player, msg);
      return;
    }

    // TEST → Trigger objective
    if (type === "test_trigger_quest_objective") {
      this.questObjectiveManager.onMonsterKilled(player, {
        enemyType: msg.enemyType || "test_wolf",
        enemyRarity: msg.enemyRarity,
        isBoss: msg.isBoss || false,
        zoneId: player.zoneId
      });
      return;
    }

    // TEST → spawn monster
    if (type === "spawn_test_monster") {
      this.spawnTestMonster(msg);
      return;
    }
  }

  // ===========================================================
  // SAVE PLAYER DATA
  // ===========================================================
  private async savePlayerData(player: PlayerState): Promise<void> {
    try {
      console.log(`💾 Sauvegarde automatique pour ${player.characterName}...`);
      await ServerProfile.findByIdAndUpdate(player.profileId, {
        $set: {
          lastOnline: new Date(),
          stats: player.saveStatsToProfile(),
          questData: player.saveQuestsToProfile()
        }
      });
      console.log(`✅ Sauvegarde automatique réussie pour ${player.characterName}`);
    } catch (error) {
      console.error(`❌ Erreur lors de la sauvegarde:`, error);
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
