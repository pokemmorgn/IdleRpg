// server/src/colyseus/test/TestManager.ts

import { GameState } from "../schema/GameState";
import { QuestManager } from "../managers/QuestManager";
import { DialogueManager } from "../managers/DialogueManager";

/**
 * TestManager - Gère tous les éléments de test pour le serveur de test
 * (PNJ, dialogues, monstres)
 *
 * ⚠️ NOTE : Les quêtes test NE SONT PLUS CRÉÉES ICI.
 * Elles doivent être seedées dans MongoDB.
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
    // ❌ loadTestQuests supprimé (quêtes maintenant seedées dans la BDD)
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
