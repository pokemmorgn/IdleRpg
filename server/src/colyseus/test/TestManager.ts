// server/src/colyseus/test/TestManager.ts

import { GameState } from "../schema/GameState";
import { QuestManager } from "../managers/QuestManager";
import { DialogueManager } from "../managers/DialogueManager";

/**
 * TestManager - Gère tous les éléments de test pour le serveur de test
 * (PNJ, quêtes, dialogues, monstres)
 */
export class TestManager {
  private gameState: GameState;
  private questManager: QuestManager;
  private dialogueManager: DialogueManager;

  constructor(
    gameState: GameState,
    questManager: QuestManager,
    dialogueManager: DialogueManager
  ) {
    this.gameState = gameState;
    this.questManager = questManager;
    this.dialogueManager = dialogueManager;
  }

  /**
   * Point d'entrée principal pour charger tous les éléments de test
   */
  public loadAll() {
    console.log("🧪 Chargement des éléments de test...");
    this.spawnTemporaryTestMonsters();
    this.spawnTemporaryTestNPC();
    this.loadTestQuests();
    this.loadTestDialogues();
    console.log("✅ Éléments de test chargés.");
  }

  /* =====================================================================
      MONSTRES
     ===================================================================== */
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
      3, 0, 0,
      0, 0, 0,
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

    this.gameState.addMonster(m);
    console.log("👾 Monstre de test 'test_dummy_1' a été spawn.");
  }

  /* =====================================================================
      NPC
     ===================================================================== */
  private spawnTemporaryTestNPC() {
    const NPCState = require("../schema/NPCState").NPCState;

    const npc = new NPCState(
      "npc_test_01",
      "Maître des Quêtes Test",
      "quest_giver",
      99,
      "neutral",
      "test_zone",
      5, 0, 5,
      0, 0, 0,
      "quest_giver_model",
      "dialogue_test_01",
      "",
      5,
      true
    );

    this.gameState.addNPC(npc);
    console.log("🤖 PNJ de test 'npc_test_01' a été spawn.");
  }

  /* =====================================================================
      QUÊTES
     ===================================================================== */
  private loadTestQuests() {
    const testQuest: any = {
      questId: "quest_test_01",
      name: "Quête du Loup Test",
      description: "Va tuer un loup de test pour le maître des quêtes.",
      giverNpcId: "npc_test_01",
      type: "secondary",
      requiredLevel: 1,
      prerequisiteQuestId: "",
      zoneId: "test_zone",
      isActive: true,
      objectives: [
        {
          objectiveId: "kill_wolf_obj",
          type: "kill",
          count: 1,
          enemyType: "test_wolf"
        }
      ],
      rewards: {
        xp: 100,
        gold: 50,
        items: [],
        reputation: []
      }
    };

this.questManager["questCache"].set(testQuest.questId, {
  questId: "quest_test_01",
  name: "Quête du Loup Test",
  description: "Va tuer un loup de test pour le maître des quêtes.",
  giverNpcId: "npc_test_01",
  type: "secondary",
  requiredLevel: 1,
  prerequisiteQuestId: "",
  zoneId: "test_zone",
  isActive: true,
  objectives: [
    {
      objectiveId: "kill_wolf_obj",
      type: "kill",
      count: 1,
      enemyType: "test_wolf"
    }
  ],
  rewards: {
    xp: 100,
    gold: 50,
    items: [],
    reputation: []
  }
});

    console.log("📜 Quête de test 'quest_test_01' chargée en mémoire.");
  }

  /* =====================================================================
      DIALOGUES
     ===================================================================== */
  private loadTestDialogues() {
    const testDialogue = {
      dialogueId: "dialogue_test_01",
      nodes: [
        {
          nodeId: "start",
          text: "Bonjour, aventurier ! J'ai une petite quête pour toi si tu es intéressé.",
          choices: []
        }
      ],
      spamProtection: {
        enabled: false
      }
    };

    this.dialogueManager.addTestDialogue("dialogue_test_01", testDialogue);
    console.log("💬 Dialogue de test 'dialogue_test_01' chargé en mémoire.");
  }
}
