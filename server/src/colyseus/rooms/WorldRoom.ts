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
import PlayerServerProfile from "../../models/PlayerServerProfile";
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

    console.log(`🟢 [WorldRoom] onCreate(serverId=${this.serverId})`);

    this.setState(new GameState(this.serverId));
    console.log("🧬 GameState initialisé");

    // Cosmetics
    new SkinManager();
    new TitleManager();
    new MountManager();

    // Currency
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

    this.onMessage("currency", (client, msg) =>
      this.handleMessage(client, "currency", msg)
    );

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

    // Cosmetics
    this.onMessage("skin_unlock", (c, m) => this.handleMessage(c, "skin_unlock", m));
    this.onMessage("skin_equip", (c, m) => this.handleMessage(c, "skin_equip", m));
    this.onMessage("skin_level_up", (c, m) => this.handleMessage(c, "skin_level_up", m));
    this.onMessage("title_unlock", (c, m) => this.handleMessage(c, "title_unlock", m));
    this.onMessage("title_equip", (c, m) => this.handleMessage(c, "title_equip", m));
    this.onMessage("mount_unlock", (c, m) => this.handleMessage(c, "mount_unlock", m));
    this.onMessage("mount_equip", (c, m) => this.handleMessage(c, "mount_equip", m));

    // Catch-all
    this.onMessage("*", (client, type, msg) => {
      this.handleMessage(client, String(type), msg);
    });

    this.setSimulationInterval(dt => this.combatManager.update(dt), 33);

    this.updateInterval = this.clock.setInterval(() => {
      this.state.updateWorldTime();
    }, 1000);
  }

  // ===========================================================
  // onAuth
  // ===========================================================
  async onAuth(client: Client, options: any) {
console.log("📥 onAuth RECEIVED:", options);
    if (!options.token || options.serverId !== this.serverId)
      return false;

    const valid = await validateToken(options.token);
    if (!valid.valid) return false;

    const load = await loadPlayerCharacter(
      valid.playerId!,
      options.serverId,
      options.characterSlot
    );

    if (!load.success || !load.profile)
      return false;

    if (isCharacterAlreadyConnected(this.state.players, load.profile.profileId))
      return false;

    const p = load.profile;

    return {
      playerId: p.playerId,
      profileId: p.profileId,
      characterName: p.characterName,
      level: p.level,
      xp: p.xp || 0,
      nextLevelXp: p.nextLevelXp,
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
  // onJoin
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

    // Load quests
    if (auth.questData)
      player.loadQuestsFromProfile(auth.questData);

    // Load inventory
    if (auth.inventory)
      player.inventory.loadFromProfile(auth.inventory);

    // Load talents
    if (auth.talents)
      player.loadTalentsFromProfile(auth.talents);

    player.availableSkillPoints = auth.availableSkillPoints || 0;

    // Load item stats
    player.itemCache = {};
    for (const [slot, invSlot] of player.inventory.equipment.entries()) {
      if (!invSlot.itemId) continue;
      const model = await ItemModel.findOne({ itemId: invSlot.itemId });
      if (model) player.itemCache[invSlot.itemId] = { stats: model.stats || {} };
    }

    for (const itemId of Object.keys(player.inventory.personalItems)) {
      const model = await ItemModel.findOne({ itemId });
      if (model) player.itemCache[itemId] = { stats: model.stats || {} };
    }

    // FULL STATS
    const stats = await computeFullStats(player);
    player.loadStatsFromProfile(stats);

    // Load shared currencies (PlayerServerProfile)
    const psp = await PlayerServerProfile.findOne({
      playerId: auth.playerId,
      serverId: this.serverId
    });

    if (psp) {

      // Synchronise la monnaie globale → PlayerState
      player.sharedCurrencies = {
        gold: psp.sharedCurrencies.gold,
        diamondBound: psp.sharedCurrencies.diamondBound,
        diamondUnbound: psp.sharedCurrencies.diamondUnbound
      };

      // Conversion pour le client Colyseus (CurrencyState)
      player.currencies.values.set("gold", psp.sharedCurrencies.gold);
      player.currencies.values.set("diamonds", psp.sharedCurrencies.diamondUnbound);
      player.currencies.values.set("diamonds_bound", psp.sharedCurrencies.diamondBound);
      
      client.send("currency_full_update", {
        values: {
          gold: psp.sharedCurrencies.gold,
          diamonds: psp.sharedCurrencies.diamondUnbound, // 💎 unbound
          diamonds_bound: psp.sharedCurrencies.diamondBound // 💎 bound
        }
      });
    }

    if (this.serverId === "test") player.zoneId = "start_zone";

    // Welcome
    client.send("welcome", { ok: true });

    this.state.addPlayer(player);
    client.send("player_update", {
      level: player.level,
      xp: player.xp,
      nextLevelXp: player.nextLevelXp,
      stats,
      availableSkillPoints: player.availableSkillPoints,
      talents: player.saveTalentsToProfile()
    });

    console.log(`🟢 Player joined: ${player.characterName}`);
  }

  // ===========================================================
  // HANDLE MESSAGE
  // ===========================================================
  private async handleMessage(client: Client, type: string, msg: any) {

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Currency
    if (this.currencyHandler.handle(type, client, player, msg)) return;

    // Cosmetics
    if (handleCosmeticsMessage(type, client, player, msg)) return;

    // Inventory
    if (type.startsWith("inv_")) {
      await this.inventoryManager.handleMessage(type, client, player, msg);
      return;
    }

    // Talents
    if (type === "talent_learn") {
      await this.talentManager.learnTalent(player, msg.talentId);
      return;
    }
    if (type === "talent_reset") {
      await this.talentManager.resetTalents(player);
      return;
    }

    // Debug XP
    if (type === "debug_give_xp") {
      const amount = msg.amount || 100;
      await this.levelManager.giveXP(player, amount);
      return;
    }

    // Stats request
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

    // Quests / Dialogues
    if (type === "npc_interact") return this.npcManager.handleInteraction(client, player, msg);
    if (type === "npc_accept_quest") return this.npcManager.handleAcceptQuest(client, player, msg);
    if (type === "npc_turn_in_quest") return this.npcManager.handleTurnInQuest(client, player, msg);

    if (type === "dialogue_choice") {
      return this.dialogueManager.handleDialogueChoice(
        client, player, msg.npcId, msg.currentNodeId, msg.choiceId
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
  // SAVE PLAYER DATA
  // ===========================================================
  private async savePlayerData(player: PlayerState): Promise<void> {
    try {
      const stats = await computeFullStats(player);
      player.loadStatsFromProfile(stats);

      // 1️⃣ SAUVEGARDE DU PERSONNAGE
      await ServerProfile.findByIdAndUpdate(player.profileId, {
        $set: {
          lastOnline: new Date(),
          level: player.level,
          xp: player.xp,
          nextLevelXp: player.nextLevelXp,
          availableSkillPoints: player.availableSkillPoints,
          talents: player.saveTalentsToProfile(),
          questData: player.saveQuestsToProfile(),
          inventory: player.inventory.saveToProfile(),
        }
      });

      // 2️⃣ SAUVEGARDE DES MONNAIES DU COMPTE
      await PlayerServerProfile.findOneAndUpdate(
        { playerId: player.playerId, serverId: this.serverId },
        {
          $set: {
            sharedCurrencies: {
              gold: player.sharedCurrencies.gold,
              diamondBound: player.sharedCurrencies.diamondBound,
              diamondUnbound: player.sharedCurrencies.diamondUnbound
            }
          }
        }
      );

    } catch (err) {
      console.error("❌ Save error:", err);
    }
  }

  // ===========================================================
  // SPAWN TEST MONSTER
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
      false,
      "dummy",
      true
    );

    this.state.addMonster(m);
  }
}
