import { Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";

import Quest, { IQuest } from "../../models/Quest";

import { QuestState } from "../schema/QuestState";

/**
 * QuestManager
 * ------------
 * Version alignée avec le nouveau QuestState :
 * - questStep
 * - questStartedAt
 * - questObjectives
 *
 * Plus aucun usage de `progress`.
 */
export class QuestManager {
  private serverId: string;
  private gameState: GameState;
  private questCache: Map<string, IQuest> = new Map();
  private onSavePlayer?: (player: PlayerState) => Promise<void>;

  constructor(
    serverId: string,
    gameState: GameState,
    onSavePlayer?: (player: PlayerState) => Promise<void>
  ) {
    this.serverId = serverId;
    this.gameState = gameState;
    this.onSavePlayer = onSavePlayer;
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
    const qs = this.getQuestState(player);
    const available: IQuest[] = [];

    for (const quest of this.questCache.values()) {
      if (quest.giverNpcId !== npcId) continue;
      if (!this.isQuestAvailableForPlayer(quest, player, qs)) continue;

      available.push(quest);
    }

    return available;
  }

  /**
   * Récupère les quêtes qu’un joueur peut rendre à un NPC
   */
  getCompletableQuestsForNPC(npcId: string, player: PlayerState): IQuest[] {
    const qs = this.getQuestState(player);
    const completable: IQuest[] = [];

    const activeQuests = [
      qs.activeMain,
      qs.activeSecondary,
      ...qs.activeRepeatables
    ].filter(Boolean);

    for (const questId of activeQuests) {
      const quest = this.getQuest(questId);
      if (!quest) continue;
      if (quest.giverNpcId !== npcId) continue;

      const step = qs.questStep.get(questId) || 0;

      if (this.isQuestFullyCompleted(quest, step)) {
        completable.push(quest);
      }
    }

    return completable;
  }

  /* ===========================================================
     4) Conditions d'accès
     =========================================================== */
  private isQuestAvailableForPlayer(
    quest: IQuest,
    player: PlayerState,
    qs: QuestState
  ): boolean {

    if (player.level < quest.requiredLevel) return false;

    if (quest.zoneId && quest.zoneId !== player.zoneId) return false;

    if (qs.completed.includes(quest.questId)) return false;

    if (quest.prerequisiteQuestId) {
      if (!qs.completed.includes(quest.prerequisiteQuestId)) return false;
    }

    if (quest.type === "main" && qs.activeMain !== "") return false;
    if (quest.type === "secondary" && qs.activeSecondary !== "") return false;

    if (quest.type === "daily") {
      const ts = qs.dailyCooldown.get(quest.questId);
      if (ts && Date.now() < ts) return false;
    }

    if (quest.type === "weekly") {
      const ts = qs.weeklyCooldown.get(quest.questId);
      if (ts && Date.now() < ts) return false;
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

    const qs = this.getQuestState(player);

    if (!this.isQuestAvailableForPlayer(quest, player, qs)) {
      client.send("error", { message: "Quest not available" });
      return false;
    }

    if (quest.type === "main") {
      qs.activeMain = questId;
    } else if (quest.type === "secondary") {
      qs.activeSecondary = questId;
    } else {
      if (!qs.activeRepeatables.includes(questId)) {
        qs.activeRepeatables.push(questId);
      }
    }

    /* === NOUVEAU SYSTÈME === */
    qs.questStep.set(questId, 0);
    qs.questStartedAt.set(questId, Date.now());
    qs.questObjectives.set(questId, Object.create(null));

    client.send("quest_accepted", { questId });

    console.log(`📗 [QuestManager] ${player.characterName} accepte ${questId}`);

    this.onSavePlayer?.(player);
    return true;
  }

  /* ===========================================================
     6) Complétion interne d’une quête
     =========================================================== */
  completeQuest(client: Client, player: PlayerState, questId: string): void {
    const quest = this.getQuest(questId);
    if (!quest) {
      client.send("error", { message: "Quest not found" });
      return;
    }

    const qs = this.getQuestState(player);

    console.log(`🏆 [QuestManager] ${player.characterName} complète ${questId}`);

    if (!qs.completed.includes(questId)) {
      qs.completed.push(questId);
    }

    if (qs.activeMain === questId) qs.activeMain = "";
    if (qs.activeSecondary === questId) qs.activeSecondary = "";

    const idx = qs.activeRepeatables.indexOf(questId);
    if (idx !== -1) qs.activeRepeatables.splice(idx, 1);

    qs.questStep.delete(questId);
    qs.questStartedAt.delete(questId);
    qs.questObjectives.delete(questId);

    if (quest.type === "daily") {
      qs.dailyCooldown.set(questId, Date.now() + 24 * 3600 * 1000);
    }
    if (quest.type === "weekly") {
      qs.weeklyCooldown.set(questId, Date.now() + 7 * 24 * 3600 * 1000);
    }

    this.applyRewards(client, player, quest);

    this.onSavePlayer?.(player);
    client.send("quest_completed", { questId });
  }

  /**
   * Rendre une quête (turn in)
   */
  turnInQuest(client: Client, player: PlayerState, questId: string): void {
    const quest = this.getQuest(questId);
    if (!quest) {
      client.send("error", { message: "Quest not found" });
      return;
    }

    const qs = this.getQuestState(player);

    const step = qs.questStep.get(questId) || 0;
    if (!this.isQuestFullyCompleted(quest, step)) {
      client.send("error", { message: "This quest is not ready to be turned in." });
      return;
    }

    console.log(`🏁 [QuestManager] ${player.characterName} rend ${questId}`);

    if (!qs.completed.includes(questId)) {
      qs.completed.push(questId);
    }

    if (qs.activeMain === questId) qs.activeMain = "";
    if (qs.activeSecondary === questId) qs.activeSecondary = "";

    const idx = qs.activeRepeatables.indexOf(questId);
    if (idx !== -1) qs.activeRepeatables.splice(idx, 1);

    qs.questStep.delete(questId);
    qs.questStartedAt.delete(questId);
    qs.questObjectives.delete(questId);

    if (quest.type === "daily") {
      qs.dailyCooldown.set(questId, Date.now() + 24 * 3600 * 1000);
    }
    if (quest.type === "weekly") {
      qs.weeklyCooldown.set(questId, Date.now() + 7 * 24 * 3600 * 1000);
    }

    this.applyRewards(client, player, quest);
    this.onSavePlayer?.(player);

    client.send("quest_turned_in", { questId });
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

  /* ===========================================================
     UTIL
     =========================================================== */
  private getQuestState(player: PlayerState): QuestState {
    return player.quests;
  }

  /**
   * Vérifie si tous les objectifs sont complétés
   */
  private isQuestFullyCompleted(quest: IQuest, step: number): boolean {
    return step >= quest.objectives.length;
  }
}
