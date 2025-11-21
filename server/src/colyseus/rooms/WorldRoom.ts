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
import { DialogueManager } from "../managers/DialogueManager"; // AJOUT: Import du DialogueManager
import { TestManager } from "../test/TestManager";

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
  private dialogueManager!: DialogueManager; // AJOUT: Déclaration de la propriété

  private testManager?: TestManager;

  // ===========================================================
  // onCreate
  // ===========================================================
  async onCreate(options: { serverId: string }) {
    this.serverId = options.serverId;
    console.log(`🟢 onCreate(serverId=${this.serverId})`);

    this.setState(new GameState(this.serverId));
    console.log("🧬 GameState initialisé");

    // --- CREATION QUEST SYSTEM ---
    this.questManager = new QuestManager(
      this.serverId,
      this.state,
      this.savePlayerData.bind(this)
    );

    this.questObjectiveManager = new QuestObjectiveManager(
      this.state,
      (sessionId: string, type: string, payload: any) => {
        const client = this.clients.find(c => c.sessionId === sessionId);
        if (client) client.send(type, payload);
      },
      this.savePlayerData.bind(this)
    );

    // --- DIALOGUE MANAGER (CRÉÉ ICI) ---
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
      this.dialogueManager // MODIFIÉ: On passe l'instance du DialogueManager
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

    // --- LOAD WORLD ENTITIES ---
    await this.npcManager.loadNPCs();
    await this.monsterManager.loadMonsters();

    // --- LOAD TEST ENTITIES (SI SERVEUR DE TEST) ---
    if (this.serverId === "test") {
      this.testManager = new TestManager(this.state, this.questManager, this.dialogueManager);
      this.testManager.loadAll();
    }

    console.log("📥 WORLD ROOM READY (messages setup)");

    // ===========================================================
    // GLOBAL MESSAGE HANDLER
    // ===========================================================
    this.onMessage("*", (client, type, msg) => {
      this.handleMessage(client, String(type), msg);
    });

    // Raw WebSocket debugging
    this.onMessage("raw", (client, raw) => {
      console.log("📩 RAW (exact WebSocket):", raw);
    });

    // ===========================================================
    // TICK LOOP
    // ===========================================================
    this.setSimulationInterval((dt) => {
      this.combatManager.update(dt);
    }, 33);

    // World time
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

    if (auth.stats) {
      player.loadStatsFromProfile(auth.stats);
    }

    if (auth.questData) {
      player.loadQuestsFromProfile(auth.questData);
    }

    if (this.serverId === "test") {
      player.zoneId = "test_zone";
    }

    this.state.addPlayer(player);
    client.send("welcome", { ok: true });
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

    // --- RESPAWN ---
    if (type === "respawn") {
      if (!player.isDead) return;
      this.combatManager.respawnPlayer(player);
      return;
    }

    // --- NPC Interaction ---
    if (type === "npc_interact") {
      this.npcManager.handleInteraction(client, player, msg);
      return;
    }

    // --- Accept Quest ---
    if (type === "npc_accept_quest") {
      this.npcManager.handleAcceptQuest(client, player, msg);
      return;
    }

    // --- Turn In Quest ---
    if (type === "npc_turn_in_quest") {
      this.npcManager.handleTurnInQuest(client, player, msg);
      return;
    }

    // --- Dialogue Choice ---
    if (type === "dialogue_choice") {
      this.npcManager.handleDialogueChoice(client, player, msg);
      return;
    }

    // === TEST TRIGGER (GARDÉ CAR FONCTIONNEL) ===
    if (type === "test_trigger_quest_objective") {
      if (!player) return;
      console.log(`[TEST] Triggering quest objective for ${player.characterName} with payload:`, msg);
      this.questObjectiveManager.onMonsterKilled(player, {
        enemyType: msg.enemyType || "test_wolf",
        enemyRarity: msg.enemyRarity,
        isBoss: msg.isBoss || false,
        zoneId: player.zoneId
      });
      return;
    }
    // =============================================

    // --- TEST SPAWN ---
    if (type === "spawn_test_monster") {
      this.spawnTestMonster(msg);
      return;
    }
  }

  // ===========================================================
  // PERSISTENCE
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
      console.error(`❌ Erreur lors de la sauvegarde automatique pour ${player.characterName}:`, error);
    }
  }

  // ===========================================================
  // TEMPORARY TEST MONSTER (GARDÉ POUR LES TESTS MANUELS)
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
