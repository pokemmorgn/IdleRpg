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
import { TitleManager } from "../managers/TitleManager";
import { MountManager } from "../managers/MountManager";
import { CurrencyManager } from "../managers/CurrencyManager";
import { CurrencyHandler } from "../handlers/CurrencyHandler";
import { InventoryManager } from "../managers/InventoryManager";
import { computeFullStats } from "../managers/stats/PlayerStatsCalculator";
import { LevelManager } from "../managers/LevelManager";
import { TalentManager } from "../managers/TalentManager";
import { talentScriptRegistry } from "../talents/TalentScriptRegistry";

import { handleCosmeticsMessage } from "../handlers/cosmetics.handler";

import ServerProfile from "../../models/ServerProfile";
import ItemModel from "../../models/Item";

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
  private inventoryManager!: InventoryManager;
  private levelManager!: LevelManager;
  private talentManager!: TalentManager;
  private currencyManager!: CurrencyManager;
  private currencyHandler!: CurrencyHandler;
  private testManager?: TestManager;

  // ===========================================================
  // onCreate
  // ===========================================================
  async onCreate(options: { serverId: string }) {
    this.serverId = options.serverId;
    console.log(`🟢 onCreate(serverId=${this.serverId})`);

    this.setState(new GameState(this.serverId));
    console.log("🧬 GameState initialisé");

    // Initialize cosmetic managers
    new SkinManager();
    new TitleManager();
    new MountManager();
    // === CURRENCIES ===
    this.currencyManager = new CurrencyManager();
    this.currencyHandler = new CurrencyHandler(this.currencyManager);
    // Talents
    await talentScriptRegistry.initialize();
    this.talentManager = new TalentManager(
      this.savePlayerData.bind(this),
      (sessionId, type, data) => {
        const c = this.clients.find(cl => cl.sessionId === sessionId);
        if (c) c.send(type, data);
      }
    );
    await this.talentManager.loadAllTalentsFromDB();

    // Level Manager
    this.levelManager = new LevelManager(
      (sessionId, type, data) => {
        const c = this.clients.find(cl => cl.sessionId === sessionId);
        if (c) c.send(type, data);
      },
      this.talentManager
    );

    // Quests
    this.questManager = new QuestManager(
      this.serverId,
      this.state,
      this.levelManager,
      this.savePlayerData.bind(this)
    );
    await this.questManager.loadAllQuestsFromDB();

    this.questObjectiveManager = new QuestObjectiveManager(
      this.state,
      (sessionId, type, payload) => {
        const c = this.clients.find(cl => cl.sessionId === sessionId);
        if (c) c.send(type, payload);
      },
      this.savePlayerData.bind(this)
    );

    this.dialogueManager = new DialogueManager(
      this.serverId,
      this.questObjectiveManager,
      this.questManager,
      this.state
    );

    this.npcManager = new NPCManager(
      this.serverId,
      this.state,
      this.questManager,
      this.questObjectiveManager,
      this.dialogueManager
    );

    this.monsterManager = new MonsterManager(this.serverId, this.state);

    this.combatManager = new CombatManager(
      this.state,
      (sessionId, type, data) => {
        const c = this.clients.find(cl => cl.sessionId === sessionId);
        if (c) c.send(type, data);
      },
      this.levelManager,
      this.questObjectiveManager
    );

    this.inventoryManager = new InventoryManager(
      this.state,
      (sessionId, type, data) => {
        const c = this.clients.find(cl => cl.sessionId === sessionId);
        if (c) c.send(type, data);
      },
      this.savePlayerData.bind(this)
    );

    await this.npcManager.loadNPCs();
    await this.monsterManager.loadMonsters();

    if (this.serverId === "test") {
      this.testManager = new TestManager(
        this.state,
        this.questManager,
        this.dialogueManager,
        this.questObjectiveManager
      );
      this.testManager.loadAll();
    }

    console.log("📥 WORLD ROOM READY");

    // COSMETICS MESSAGES
    this.onMessage("skin_unlock", (client, msg) =>
      this.handleMessage(client, "skin_unlock", msg));
    this.onMessage("skin_equip", (client, msg) =>
      this.handleMessage(client, "skin_equip", msg));
    this.onMessage("skin_level_up", (client, msg) =>
      this.handleMessage(client, "skin_level_up", msg));

    this.onMessage("title_unlock", (client, msg) =>
      this.handleMessage(client, "title_unlock", msg));
    this.onMessage("title_equip", (client, msg) =>
      this.handleMessage(client, "title_equip", msg));

    this.onMessage("mount_unlock", (client, msg) =>
      this.handleMessage(client, "mount_unlock", msg));
    this.onMessage("mount_equip", (client, msg) =>
      this.handleMessage(client, "mount_equip", msg));

    // CATCH-ALL message router:
    this.onMessage("*", (client, type, msg) => {
      this.handleMessage(client, String(type), msg);
    });

    this.setSimulationInterval(dt => this.combatManager.update(dt), 33);

    this.updateInterval = this.clock.setInterval(() => {
      this.state.updateWorldTime();
    }, 1000);
  }

  // ===========================================================
  // AUTH
  // ===========================================================
  async onAuth(client: Client, options: any) {
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
      xp: p.xp || 0,
      nextLevelXp: p.nextLevelXp || this.levelManager.computeNextLevelXp(p.level || 1),

      availableSkillPoints: p.availableSkillPoints || 0,
      talents: p.talents || {},

      characterClass: p.class,
      characterRace: p.race,
      characterSlot: p.characterSlot,
      questData: p.questData,
      inventory: p.inventory
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
        auth.characterRace,
        auth.xp,
        auth.nextLevelXp
    );

    // ============================
    // 🔥 LOAD DATA FROM PROFILE
    // ============================

    if (auth.questData)
        player.loadQuestsFromProfile(auth.questData);

    if (auth.inventory)
        player.inventory.loadFromProfile(auth.inventory);

    if (auth.talents)
        player.loadTalentsFromProfile(auth.talents);

    // Skill points
    player.availableSkillPoints = auth.availableSkillPoints || 0;

    // ============================
    // 🔥 LOAD ITEM CACHE
    // ============================

    player.itemCache = {};

    for (const [slot, invSlot] of player.inventory.equipment.entries()) {
        if (!invSlot.itemId) continue;
        const model = await ItemModel.findOne({ itemId: invSlot.itemId });
        if (model) player.itemCache[invSlot.itemId] = { stats: model.stats || {} };
    }

    for (const [itemId] of Object.keys(player.inventory.personalItems)) {
        const model = await ItemModel.findOne({ itemId });
        if (model) player.itemCache[itemId] = { stats: model.stats || {} };
    }

    // ============================
    // 🔥 COMPUTE FULL STATS
    // ============================

    const stats = await computeFullStats(player);
    player.loadStatsFromProfile(stats);

    // TEST SERVER = spawn obligatoire
    if (this.serverId === "test") {
        player.zoneId = "start_zone";
    }

    // ============================
    // 🔥 SEND WELCOME
    // ============================

    client.send("welcome", { ok: true });

    // ============================
    // 💰 SEND ALL CURRENCIES FIRST
    // ============================

    client.send("currency_full_update", {
        values: Object.fromEntries(player.currencies.values)
    });

    // ============================
    // 🔥 ADD PLAYER TO GAME STATE
    // ============================

    this.state.addPlayer(player);

    // ============================
    // 🔥 SEND PLAYER DATA
    // ============================

    client.send("player_update", {
        level: player.level,
        xp: player.xp,
        nextLevelXp: player.nextLevelXp,
        stats,
        availableSkillPoints: player.availableSkillPoints,
        talents: player.saveTalentsToProfile()
    });
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
  // HANDLE MESSAGES
  // ===========================================================
  private async handleMessage(client: Client, type: string, msg: any) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    // ===== CURRENCIES =====
    if (this.currencyHandler.handle(type, client, player, msg)) return;
    
    // ===== COSMETICS (SKINS + TITLES + MOUNTS) =====
    if (handleCosmeticsMessage(type, client, player, msg)) return;

    // Inventory
    if (type.startsWith("inv_")) {
      await this.inventoryManager.handleMessage(type, client, player, msg);
      return;
    }

    // TALENT
    if (type === "talent_learn") {
      await this.talentManager.learnTalent(player, msg.talentId);
      return;
    }

    if (type === "talent_reset") {
      await this.talentManager.resetTalents(player);
      return;
    }

    // DEBUG XP
    if (type === "debug_give_xp") {
      const amount = msg.amount || 100;
      console.log(`[DEBUG] Giving ${amount} XP to ${player.characterName}`);
      await this.levelManager.giveXP(player, amount);
      return;
    }

    // STATS REQUEST
    if (type === "stats_request") {
      const stats = await computeFullStats(player);
      player.loadStatsFromProfile(stats);

      client.send("player_update", {
        level: player.level,
        xp: player.xp,
        nextLevelXp: player.nextLevelXp,
        stats,
        availableSkillPoints: player.availableSkillPoints,
        talents: player.saveTalentsToProfile()
      });
      return;
    }

    if (type === "respawn") {
      if (!player.isDead) return;
      this.combatManager.respawnPlayer(player);
      return;
    }

    // Quests
    if (type === "npc_interact") return this.npcManager.handleInteraction(client, player, msg);
    if (type === "npc_accept_quest") return this.npcManager.handleAcceptQuest(client, player, msg);
    if (type === "npc_turn_in_quest") return this.npcManager.handleTurnInQuest(client, player, msg);

    if (type === "dialogue_choice") {
      return this.dialogueManager.handleDialogueChoice(
        client, player,
        msg.npcId, msg.currentNodeId, msg.choiceId
      );
    }

    if (type === "quest_talk") return this.questObjectiveManager.onTalk(player, msg);
    if (type === "quest_collect") return this.questObjectiveManager.onCollect(player, msg);
    if (type === "quest_explore") return this.questObjectiveManager.onExplore(player, msg);

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
    const stats = await computeFullStats(player);
    player.loadStatsFromProfile(stats);

    await ServerProfile.findByIdAndUpdate(player.profileId, {
      $set: {
        lastOnline: new Date(),
        level: player.level,
        xp: player.xp,
        nextLevelXp: player.nextLevelXp,
        availableSkillPoints: player.availableSkillPoints,

        // Talents persistants
        talents: player.saveTalentsToProfile(),

        // 💰 Currency persistante
        currencies: player.currencies,

        // Quêtes
        questData: player.saveQuestsToProfile(),

        // Inventaire
        inventory: player.inventory.saveToProfile(),
      }
    });
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
      30, 30,
      5, 0, 1,
      "test_zone",
      msg.x, msg.y, msg.z,
      0, 0, 0,
      "aggressive",
      12, 20,
      2, 5, 3,
      false, "dummy", true
    );

    this.state.addMonster(m);
  }
}
