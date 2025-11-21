import { Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import Quest, { IQuest } from "../../models/Quest";

/**
 * QuestManager
 * ------------
 * - Charge les quêtes
 * - Filtre par NPC
 * - Gère acceptation, progression, validation
 */
export class QuestManager {
  private serverId: string;
  private gameState: GameState;

  private questCache: Map<string, IQuest> = new Map();

  constructor(serverId: string, gameState: GameState) {
    this.serverId = serverId;
    this.gameState = gameState;
  }

  /* ===========================================================
     1) Chargement de toutes les quêtes depuis MongoDB
     =========================================================== */
  async loadQuests(): Promise<void> {
    try {
      console.log(`📘 [QuestManager] Chargement des quêtes...`);

      const quests = await Quest.find({ isActive: true });

      this.questCache.clear();
      quests.forEach(q => this.questCache.set(q.questId, q));

      console.log(`✅ [QuestManager] ${quests.length} quêtes chargées`);
    } catch (err: any) {
      console.error("❌ [QuestManager] Erreur loadQuests:", err);
    }
  }

  /* ===========================================================
     2) Récupérer une quête
     =========================================================== */
  getQuest(questId: string): IQuest | undefined {
    return this.questCache.get(questId);
  }

  /* ===========================================================
     3) Quêtes disponibles pour un NPC
     =========================================================== */
  getAvailableQuestsForNPC(npcId: string, player: PlayerState): IQuest[] {
    const available: IQuest[] = [];

    for (const quest of this.questCache.values()) {
      if (quest.giverNpcId !== npcId) continue;
      if (!this.isQuestAvailableForPlayer(quest, player)) continue;
      available.push(quest);
    }

    return available;
  }

  /* ===========================================================
     4) Conditions d’accès
     =========================================================== */
  private isQuestAvailableForPlayer(quest: IQuest, player: PlayerState): boolean {
    if (player.level < quest.requiredLevel) return false;

    if (quest.zoneId && quest.zoneId !== player.zoneId) return false;

    if (quest.prerequisiteQuestId) {
      if (!player.completedQuests?.includes(quest.prerequisiteQuestId)) return false;
    }

    if (quest.type === "main" && player.activeMainQuest) return false;
    if (quest.type === "secondary" && player.activeSecondaryQuest) return false;

    if (quest.isOneShot && player.completedQuests?.includes(quest.questId)) {
      return false;
    }

    return true;
  }

  /* ===========================================================
     5) Acceptation
     =========================================================== */
  acceptQuest(client: Client, player: PlayerState, questId: string): boolean {
    const quest = this.getQuest(questId);
    if (!quest) {
      client.send("error", { message: "Quest not found" });
      return false;
    }

    if (!this.isQuestAvailableForPlayer(quest, player)) {
      client.send("error", { message: "Quest not available" });
      return false;
    }

    if (quest.type === "main") player.activeMainQuest = questId;
    else if (quest.type === "secondary") player.activeSecondaryQuest = questId;

    if (!player.questProgress) player.questProgress = {};
    player.questProgress[questId] = {
      step: 0,
      startedAt: Date.now()
    };

    client.send("quest_accepted", { questId });

    console.log(`📗 [QuestManager] ${player.characterName} accepte ${questId}`);

    return true;
  }

  /* ===========================================================
     6) Complétion
     =========================================================== */
  completeQuest(client: Client, player: PlayerState, questId: string): void {
    const quest = this.getQuest(questId);
    if (!quest) {
      client.send("error", { message: "Quest not found" });
      return;
    }

    console.log(`🏆 [QuestManager] ${player.characterName} complète ${questId}`);

    if (!player.completedQuests) player.completedQuests = [];
    if (!player.completedQuests.includes(questId)) {
      player.completedQuests.push(questId);
    }

    if (player.activeMainQuest === questId) player.activeMainQuest = "";
    if (player.activeSecondaryQuest === questId) player.activeSecondaryQuest = "";

    if (player.questProgress?.[questId]) {
      delete player.questProgress[questId];
    }

    client.send("quest_completed", { questId });
  }
}
