import { Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";

import Quest, { IQuest } from "../../models/Quest";
import { QuestState } from "../schema/QuestState";

/**
 * QuestManager
 * Version alignée avec le nouveau QuestState
 */
export class QuestManager {
  private serverId: string;
  private gameState: GameState;

  // 🟦 Cache mémoire des quêtes
  public questCache: Map<string, IQuest> = new Map();

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
     1) CHARGEMENT DB AU DÉMARRAGE
     =========================================================== */
  async loadAllQuestsFromDB() {
    console.log("📥 [QuestManager] Chargement des quêtes depuis MongoDB...");

    try {
      const quests = await Quest.find({});
      console.log(`📥 ${quests.length} quêtes trouvées.`);

      this.questCache.clear();

      for (const q of quests) {
        this.questCache.set(q.questId, q.toObject());
        console.log(`  ➕ Loaded quest: ${q.questId}`);
      }

      console.log("✅ [QuestManager] Toutes les quêtes sont chargées !");
    } catch (err) {
      console.error("❌ [QuestManager] Erreur lors du chargement des quêtes :", err);
    }
  }

  /* ===========================================================
     2) GET QUEST
     =========================================================== */
  getQuest(questId: string): IQuest | undefined {
    return this.questCache.get(questId);
  }

  /* ===========================================================
     3) QUÊTES DISPONIBLES POUR UN NPC
     =========================================================== */
  getAvailableQuestsForNPC(npcId: string, player: PlayerState): IQuest[] {
    const qs = this.getQuestState(player);
    const available: IQuest[] = [];

    console.log("🧪 DEBUG getAvailableQuestsForNPC()");
    console.log("NPC:", npcId);
    console.log("Player zone:", player.zoneId);
    console.log("Quest cache:", Array.from(this.questCache.keys()));
    console.log("Completed:", qs.completed);
    console.log("activeMain:", qs.activeMain);
    console.log("activeSecondary:", qs.activeSecondary);
    console.log("Repeatables:", qs.activeRepeatables);

    for (const quest of this.questCache.values()) {
      console.log("➡️ Checking quest:", quest.questId);

      // Mauvais NPC ?
      if (quest.giverNpcId !== npcId) {
        console.log("❌ NPC mismatch");
        continue;
      }

      // Conditions d'accès
      if (!this.isQuestAvailableForPlayer(quest, player, qs)) {
        console.log("❌ isQuestAvailableForPlayer → FALSE");
        continue;
      }

      console.log("✅ QUEST AVAILABLE:", quest.questId);
      available.push(quest);
    }

    return available;
  }

  /* ===========================================================
     4) QUÊTES PRÊTES À ÊTRE RENDUES
     =========================================================== */
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
     5) Conditions d'accès
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
     6) Acceptation d'une quête
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

    if (quest.type === "main") qs.activeMain = questId;
    else if (quest.type === "secondary") qs.activeSecondary = questId;
    else if (!qs.activeRepeatables.includes(questId)) qs.activeRepeatables.push(questId);

    qs.questStep.set(questId, 0);
    qs.questStartedAt.set(questId, Date.now());
    qs.questObjectives.set(questId, new MapSchema<number>());

    client.send("quest_accepted", { questId });

    console.log(`📗 [QuestManager] ${player.characterName} accepte ${questId}`);

    this.onSavePlayer?.(player);
    return true;
  }

  /* ===========================================================
     7) Tournée de quête (turn in)
     =========================================================== */
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

    if (!qs.completed.includes(questId)) qs.completed.push(questId);

    if (qs.activeMain === questId) qs.activeMain = "";
    if (qs.activeSecondary === questId) qs.activeSecondary = "";

    const idx = qs.activeRepeatables.indexOf(questId);
    if (idx !== -1) qs.activeRepeatables.splice(idx, 1);

    qs.questStep.delete(questId);
    qs.questStartedAt.delete(questId);
    qs.questObjectives.delete(questId);

    this.applyRewards(client, player, quest);
    this.onSavePlayer?.(player);

    client.send("quest_turned_in", { questId });
  }

  /* ===========================================================
     8) Récompenses
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

  private isQuestFullyCompleted(quest: IQuest, step: number): boolean {
    return step >= quest.objectives.length;
  }
}
