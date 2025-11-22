// server/src/colyseus/test/TestManager.ts

import { GameState } from "../schema/GameState";
import { QuestManager } from "../managers/QuestManager";
import { QuestObjectiveManager } from "../managers/QuestObjectiveManager";
import { DialogueManager } from "../managers/DialogueManager";
import { PlayerState } from "../schema/PlayerState";

/**
 * TestManager
 * ----------
 * Permet de SIMULER les actions de gameplay pour tester les quêtes.
 *
 * ⚠️ ACTIVÉ UNIQUEMENT si serverId === "test"
 * ⚠️ Aucun impact pour Unity ou les serveurs de production.
 */
export class TestManager {
  constructor(
    private readonly gameState: GameState,
    private readonly questManager: QuestManager,
    private readonly dialogueManager: DialogueManager,
    private readonly objectiveManager: QuestObjectiveManager
  ) {}

  /**
   * Chargement des éléments de test (PNJ + dialogues)
   * Les quêtes NE SONT PLUS gérées ici → seed via MongoDB
   */
  public loadAll() {
    console.log("🧪 Chargement des éléments de test...");
    this.spawnTestNPC();
    this.loadTestDialogue();
    console.log("✅ Éléments de test chargés.");
  }

  // =====================================================================
  //  SIMULATEURS D’OBJECTIFS (API DE TEST)
  // =====================================================================

  /** Simule un "parler à un NPC" */
  public simulateTalk(player: PlayerState, npcId: string) {
    console.log("🧪 simulateTalk →", npcId);
    this.objectiveManager.onTalk(player, { npcId });
  }

  /** Simule un "collecter une ressource" */
  public simulateCollect(player: PlayerState, resourceId: string, amount = 1) {
    console.log("🧪 simulateCollect →", resourceId, "x", amount);
    for (let i = 0; i < amount; i++) {
      this.objectiveManager.onCollect(player, { resourceId });
    }
  }

  /** Simule un "explorer une zone" */
  public simulateExplore(player: PlayerState, locationId: string) {
    console.log("🧪 simulateExplore →", locationId);
    this.objectiveManager.onExplore(player, { locationId });
  }

  /** Simule un kill */
  public simulateKill(player: PlayerState, enemyType: string) {
    console.log("🧪 simulateKill →", enemyType);
    this.objectiveManager.onMonsterKilled(player, {
      enemyType,
      isBoss: false,
      zoneId: player.zoneId
    });
  }

  /** Simule le kill d’un boss */
  public simulateBossKill(player: PlayerState, enemyType: string) {
    console.log("🧪 simulateBossKill →", enemyType);
    this.objectiveManager.onMonsterKilled(player, {
      enemyType,
      isBoss: true,
      zoneId: player.zoneId
    });
  }

  /** Simule un "loot" */
  public simulateLoot(player: PlayerState, itemId: string, amount = 1) {
    console.log("🧪 simulateLoot →", itemId, "x", amount);
    this.objectiveManager.onLoot(player, { itemId, amount });
  }

  // =====================================================================
  //  NPC & DIALOGUE DE TEST
  // =====================================================================

  private spawnTestNPC() {
    const NPCState = require("../schema/NPCState").NPCState;

    const npc = new NPCState(
      "npc_test_01",
      "Maître des Quêtes Test",
      "quest_giver",
      99,
      "neutral",
      "test_zone",
      5, 0, 5,
      0, 180, 0,
      "quest_giver_model",
      "dialogue_test_01",
      "",
      5,
      true
    );

    this.gameState.addNPC(npc);
    console.log("🤖 PNJ de test 'npc_test_01' spawné.");
  }

  private loadTestDialogue() {
    const testDialogue = {
      dialogueId: "dialogue_test_01",
      nodes: [
        {
          nodeId: "start",
          text: "Bonjour aventurier. Ceci est un dialogue de test.",
          choices: []
        }
      ],
      spamProtection: { enabled: false }
    };

    this.dialogueManager.addTestDialogue("dialogue_test_01", testDialogue);
    console.log("💬 Dialogue test chargé.");
  }
}
