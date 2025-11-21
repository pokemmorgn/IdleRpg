import { Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import Quest, { IQuest } from "../../models/Quest";

import { QuestProgress } from "../schema/QuestProgress";
import { ArraySchema, MapSchema } from "@colyseus/schema";

/**
 * QuestManager
 * ------------
 * - Charge les quêtes depuis MongoDB
 * - Filtre les quêtes disponibles chez un NPC
 * - Gestion des acceptations
 * - Gestion des validations
 * - Gestion des resets daily/weekly/repeat
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
     1) Chargement des quêtes
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

    // Niveau requis
    if (player.level < quest.requiredLevel) return false;

    // Zone
    if (quest.zoneId && quest.zoneId !== player.zoneId) return false;

    // Prérequis
    if (quest.prerequisiteQuestId) {
      if (!player.completedQuests?.includes(quest.prerequisiteQuestId)) return false;
    }

    // Slots
    if (quest.type === "main" && player.activeMainQuest) return false;
    if (quest.type === "secondary" && player.activeSecondaryQuest) return false;

    // One-shot
    if (quest.isOneShot && player.completedQuests?.includes(quest.questId)) {
      return false;
    }

    return true;
  }

  /* ===========================================================
     5) Acceptation d'une quête
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

    // Slots
    if (quest.type === "main") {
      player.activeMainQuest = questId;
    } else if (quest.type === "secondary") {
      player.activeSecondaryQuest = questId;
    } else {
      // Repeatable, daily, weekly
      if (!player.activeRepeatableQuests) {
        player.activeRepeatableQuests = new ArraySchema<string>();
      }

      if (!player.activeRepeatableQuests.includes(questId)) {
        player.activeRepeatableQuests.push(questId);
      }
    }

    // Progression
    if (!player.questProgress) {
      player.questProgress = new MapSchema<QuestProgress>();
    }

    const progress = new QuestProgress();
    progress.step = 0;
    progress.startedAt = Date.now();

    player.questProgress.set(questId, progress);

    client.send("quest_accepted", { questId });

    console.log(`📗 [QuestManager] ${player.characterName} accepte ${questId}`);

    return true;
  }

  /* ===========================================================
     6) Complétion d'une quête
     =========================================================== */
  completeQuest(client: Client, player: PlayerState, questId: string): void {
    const quest = this.getQuest(questId);
    if (!quest) {
      client.send("error", { message: "Quest not found" });
      return;
    }

    console.log(`🏆 [QuestManager] ${player.characterName} complète ${questId}`);

    // Ajout dans completedQuests
    if (!player.completedQuests) {
      player.completedQuests = new ArraySchema<string>();
    }

    if (!player.completedQuests.includes(questId)) {
      player.completedQuests.push(questId);
    }

    // Libérer les slots
    if (player.activeMainQuest === questId) player.activeMainQuest = "";
    if (player.activeSecondaryQuest === questId) player.activeSecondaryQuest = "";

    // Nettoyer activeRepeatableQuests
    if (player.activeRepeatableQuests?.includes(questId)) {
      const index = player.activeRepeatableQuests.indexOf(questId);
      if (index !== -1) player.activeRepeatableQuests.splice(index, 1);
    }

    // Supprimer progression
    if (player.questProgress?.has(questId)) {
      player.questProgress.delete(questId);
    }

    // Récompenses
    this.applyRewards(client, player, quest);

    client.send("quest_completed", { questId });
  }

  /* ===========================================================
     7) Récompenses
     =========================================================== */
  private applyRewards(client: Client, player: PlayerState, quest: IQuest): void {
    const r = quest.rewards;

    if (r.xp) client.send("xp_gained", { amount: r.xp });
    if (r.gold) client.send("gold_gained", { amount: r.gold });
    if (r.items?.length) client.send("items_gained", { items: r.items });
    if (r.reputation?.length) client.send("reputation_gained", { rep: r.reputation });
  }

}
