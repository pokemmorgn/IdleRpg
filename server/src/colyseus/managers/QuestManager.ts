import { GameState } from "../../schema/GameState";
import { PlayerState } from "../../schema/PlayerState";
import Quest, { IQuest } from "../../models/Quest";

import { Client } from "colyseus";

/**
 * QuestManager
 * ------------
 * - Charge les quêtes depuis MongoDB
 * - Filtre les quêtes disponibles pour un NPC
 * - Gère l'acceptation des quêtes
 * - Gère la complétion / validation
 * - Gère les resets daily / weekly / cooldown
 * - Gère les slots (main/secondary)
 * - Met à jour PlayerState (quest slots + progression)
 */
export class QuestManager {
  private serverId: string;
  private gameState: GameState;

  // Cache des quêtes en RAM
  private questCache: Map<string, IQuest> = new Map();

  constructor(serverId: string, gameState: GameState) {
    this.serverId = serverId;
    this.gameState = gameState;
  }

  /* ===========================================================
     1) Chargement de toutes les quêtes
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
     3) Quêtes disponibles chez un NPC
     =========================================================== */
  getAvailableQuestsForNPC(npcId: string, player: PlayerState): IQuest[] {
    const available: IQuest[] = [];

    for (const quest of this.questCache.values()) {
      if (quest.giverNpcId !== npcId) continue; // pas ce NPC
      if (!this.isQuestAvailableForPlayer(quest, player)) continue;

      available.push(quest);
    }

    return available;
  }

  /* ===========================================================
     4) Vérifier si une quête est disponible
     =========================================================== */
  private isQuestAvailableForPlayer(quest: IQuest, player: PlayerState): boolean {

    // Niveau requis
    if (player.level < quest.requiredLevel) return false;

    // Zone requise
    if (quest.zoneId && quest.zoneId !== player.zoneId) return false;

    // Prérequis
    if (quest.prerequisiteQuestId) {
      if (!player.completedQuests?.includes(quest.prerequisiteQuestId)) {
        return false;
      }
    }

    // Slots
    if (quest.type === "main" && player.activeMainQuest) return false;
    if (quest.type === "secondary" && player.activeSecondaryQuest) return false;

    // One-shot
    if (quest.isOneShot && player.completedQuests?.includes(quest.questId)) {
      return false;
    }

    // Daily
    if (quest.type === "daily" && this.isDailyOnCooldown(player, quest.questId)) return false;

    // Weekly
    if (quest.type === "weekly" && this.isWeeklyOnCooldown(player, quest.questId)) return false;

    // Cooldown (repeatable)
    if (quest.type === "repeatable" && this.isCooldownActive(player, quest.questId, quest.cooldownSec)) {
      return false;
    }

    return true;
  }

  /* ===========================================================
     5) Acceptation d’une quête
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

    // Enregistrer l’acceptation
    switch (quest.type) {
      case "main":
        player.activeMainQuest = questId;
        break;

      case "secondary":
        player.activeSecondaryQuest = questId;
        break;

      default:
        if (!player.activeRepeatableQuests) player.activeRepeatableQuests = [];
        if (!player.activeRepeatableQuests.includes(questId)) {
          player.activeRepeatableQuests.push(questId);
        }
        break;
    }

    // Initialisation de la progression
    if (!player.questProgress) player.questProgress = {};
    player.questProgress[questId] = {
      step: 0,
      startedAt: Date.now()
    };

    client.send("quest_accepted", { questId });

    console.log(`📗 [QuestManager] ${player.characterName} accepte quête ${questId}`);

    return true;
  }

  /* ===========================================================
     6) Compléter une quête
     =========================================================== */
  completeQuest(client: Client, player: PlayerState, questId: string): void {
    const quest = this.getQuest(questId);
    if (!quest) {
      client.send("error", { message: "Quest not found" });
      return;
    }

    console.log(`🏆 [QuestManager] ${player.characterName} termine quête ${questId}`);

    // Ajouter dans completedQuests
    if (!player.completedQuests) player.completedQuests = [];
    if (!player.completedQuests.includes(questId)) {
      player.completedQuests.push(questId);
    }

    // Récompenses
    this.applyRewards(client, player, quest);

    // Libérer les slots
    if (player.activeMainQuest === questId) player.activeMainQuest = "";
    if (player.activeSecondaryQuest === questId) player.activeSecondaryQuest = "";

    // Nettoyer progression
    if (player.questProgress?.[questId]) {
      delete player.questProgress[questId];
    }

    client.send("quest_completed", { questId });
  }

  /* ===========================================================
     7) Appliquer les récompenses
     =========================================================== */
  private applyRewards(client: Client, player: PlayerState, quest: IQuest): void {
    const r = quest.rewards;

    if (r.xp) {
      client.send("xp_gained", { amount: r.xp });
    }

    if (r.gold) {
      client.send("gold_gained", { amount: r.gold });
    }

    if (r.items && r.items.length > 0) {
      client.send("items_gained", { items: r.items });
    }

    if (r.reputation && r.reputation.length > 0) {
      client.send("reputation_gained", { rep: r.reputation });
    }
  }

  /* ===========================================================
     8) Cooldowns
     =========================================================== */
  private isDailyOnCooldown(player: PlayerState, questId: string): boolean {
    const last = player.lastDailyQuestCompletion?.[questId];
    if (!last) return false;

    const lastDate = new Date(last);
    const now = new Date();

    // Reset à 4h du matin
    if (now.getDate() !== lastDate.getDate()) return false;
    if (now.getHours() >= 4 && lastDate.getHours() < 4) return false;

    return true;
  }

  private isWeeklyOnCooldown(player: PlayerState, questId: string): boolean {
    const last = player.lastWeeklyQuestCompletion?.[questId];
    if (!last) return false;

    const lastWeek = new Date(last).getWeekNumber();
    const currentWeek = new Date().getWeekNumber();

    return lastWeek === currentWeek;
  }

  private isCooldownActive(player: PlayerState, questId: string, cdSec?: number): boolean {
    if (!cdSec) return false;

    const last = player.lastRepeatableQuestCompletion?.[questId];
    if (!last) return false;

    const elapsed = (Date.now() - last) / 1000;

    return elapsed < cdSec;
  }
}
