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
import { InventoryManager } from "../managers/InventoryManager";
import { computeFullStats } from "../managers/stats/PlayerStatsCalculator";
import { LevelManager } from "../managers/LevelManager";
// AJOUT: Importer le TalentManager et le registre de scripts
import { TalentManager } from "../managers/TalentManager";
import { talentScriptRegistry } from "../talents/TalentScriptRegistry";

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
  // AJOUT: Déclarer le TalentManager
  private talentManager!: TalentManager;

  private testManager?: TestManager;

  // ===========================================================
  // onCreate
  // ===========================================================
  async onCreate(options: { serverId: string }) {
    this.serverId = options.serverId;
    console.log(`🟢 onCreate(serverId=${this.serverId})`);

    this.setState(new GameState(this.serverId));
    console.log("🧬 GameState initialisé");

    new SkinManager();

    // AJOUT: Initialiser le registre de talents et le manager AVANT les autres
    await talentScriptRegistry.initialize();
    this.talentManager = new TalentManager(this.savePlayerData.bind(this));
    await this.talentManager.loadAllTalentsFromDB();

    // AJOUT: Initialiser le LevelManager ici pour le passer au QuestManager
    this.levelManager = new LevelManager(
      (sessionId, type, data) => {
        const c = this.clients.find(cl => cl.sessionId === sessionId);
        if (c) c.send(type, data);
      }
    );

    // MODIFIÉ: L'ordre est important. Le QuestManager a besoin du LevelManager.
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
      // AJOUT: Charger les données de talents
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

    // Load profile data
    if (auth.questData) player.loadQuestsFromProfile(auth.questData);
    if (auth.inventory) player.inventory.loadFromProfile(auth.inventory);
    // AJOUT: Charger les talents du joueur
    if (auth.talents) player.loadTalentsFromProfile(auth.talents);
    
    // S'assurer que les points de talents sont bien chargés
    player.availableSkillPoints = auth.availableSkillPoints || 0;

    // Build itemCache
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

    // Compute real stats (the ONLY correct source)
    const computed = await computeFullStats(player);

    // Apply stats
    player.loadStatsFromProfile(computed);

    if (this.serverId === "test") {
      player.zoneId = "start_zone";
    }

    client.send("welcome", { ok: true });
    this.state.addPlayer(player);
    const freshStats = await computeFullStats(player);
  client.send("stats_update", freshStats);
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

    // Skin manager
    const handledBySkin = require("../managers/SkinManager")
      .SkinManagerInstance?.handleMessage(type, client, player, msg);
    if (handledBySkin) return;

    // Inventory
    if (type.startsWith("inv_")) {
      await this.inventoryManager.handleMessage(type, client, player, msg);
      return;
    }

    // AJOUT: Gestion des messages de talents
    if (type.startsWith("talent_")) {
      if (type === "talent_learn") {
        await this.talentManager.learnTalent(player, msg.talentId);
      }
      if (type === "talent_reset") {
        await this.talentManager.resetTalents(player);
      }
      return;
    }

    if (type === "debug_give_xp") {
      const amount = msg.amount || 100;
      console.log(`[DEBUG] Giving ${amount} XP to ${player.characterName}`);
      // MODIFIÉ: On utilise le levelManager pour donner l'XP, qui lui-même va déclencher le gain de point de talent
      await this.levelManager.giveXP(player, amount);
      return;
    }

    // Stats request (force fresh compute)
    if (type === "stats_request") {
      const stats = await computeFullStats(player);
      player.loadStatsFromProfile(stats);
      client.send("stats_update", stats);
      return;
    }

    if (type === "respawn") {
      if (!player.isDead) return;
      this.combatManager.respawnPlayer(player);
      return;
    }

    // Quests and dialogue
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
  // SAVE PLAYER (MMO correct)
  // ===========================================================
  private async savePlayerData(player: PlayerState): Promise<void> {
    try {
      const computed = await computeFullStats(player);
      player.loadStatsFromProfile(computed);

      await ServerProfile.findByIdAndUpdate(player.profileId, {
        $set: {
          lastOnline: new Date(),
          level: player.level,
          xp: player.xp,
          nextLevelXp: player.nextLevelXp,
          // AJOUT: Sauvegarder les données de talents
          availableSkillPoints: player.availableSkillPoints,
          talents: player.saveTalentsToProfile(),
          stats: computed,
          questData: player.saveQuestsToProfile(),
          inventory: player.inventory.saveToProfile()
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
