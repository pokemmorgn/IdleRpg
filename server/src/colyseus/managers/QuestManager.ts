import { Client } from "colyseus";
import { MapSchema } from "@colyseus/schema";

import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";

import Quest, { IQuest } from "../../models/Quest";
import { QuestState } from "../schema/QuestState";

/**
 * QuestManager
 * Version adaptée pour une structure d'objectifs "plate" (IQuestObjective[])
 */
export class QuestManager {
  private serverId: string;
  private gameState: GameState;

  // Cache mémoire des quêtes MongoDB
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
     CHARGEMENT DB
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
      console.error("❌ [QuestManager] Erreur :", err);
    }
  }

  /* ===========================================================
     GET QUEST
     =========================================================== */
  getQuest(questId: string): IQuest | undefined {
    return this.questCache.get(questId);
  }

  /* ===========================================================
     QUÊTES DISPONIBLES POUR NPC
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

  /* ===========================================================
     QUÊTES PRÊTES À ÊTRE RENDUES (LOGIQUE "PLATE")
     =========================================================== */
  getCompletableQuestsForNPC(npcId: string, player: PlayerState): IQuest[] {
    const qs = this.getQuestState(player);
    const completable: IQuest[] = [];

    const active = [
      qs.activeMain,
      qs.activeSecondary,
      ...qs.activeRepeatables
    ].filter(Boolean);

    for (const questId of active) {
      // Si la quête est déjà marquée comme complétée, on l'ignore
      if (qs.completed.includes(questId)) continue;

      const quest = this.getQuest(questId);
      if (!quest || quest.giverNpcId !== npcId) continue;

      // 🚨 NOUVELLE LOGIQUE :
      // Une quête est prête si TOUS ses objectifs sont complétés.
      if (this.isQuestFullyCompleted(player, quest)) {
        completable.push(quest);
      }
    }

    return completable;
  }

  /* ===========================================================
     CONDITIONS D’ACCÈS (CORRIGÉ)
     =========================================================== */
  private isQuestAvailableForPlayer(
    quest: IQuest,
    player: PlayerState,
    qs: QuestState
  ): boolean {
    // 🚨 NOUVELLE LOGIQUE PLUS ROBUSTE :
    // Une quête n'est pas disponible si elle est déjà active ou terminée.
    if (qs.activeMain === quest.questId) return false;
    if (qs.activeSecondary === quest.questId) return false;
    if (qs.activeRepeatables.includes(quest.questId)) return false;
    if (qs.completed.includes(quest.questId)) return false;

    // Conditions classiques
    if (player.level < quest.requiredLevel) return false;
    if (quest.zoneId && quest.zoneId !== player.zoneId) return false;
    if (quest.prerequisiteQuestId && !qs.completed.includes(quest.prerequisiteQuestId)) return false;

    // Logique d'exclusivité par type (si nécessaire)
    if (quest.type === "main" && qs.activeMain !== "" && qs.activeMain !== quest.questId) return false;
    if (quest.type === "secondary" && qs.activeSecondary !== "" && qs.activeSecondary !== quest.questId) return false;
    
    // ... (logique pour daily/weekly inchangée)
    return true;
  }

  /* ===========================================================
     ACCEPTATION
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

    // Initialisation : step 0 (plus vraiment nécessaire mais conservé pour compatibilité)
    qs.questStep.set(questId, 0);
    qs.questStartedAt.set(questId, Date.now());
    qs.questObjectives.set(questId, new MapSchema<number>());

    // 🚨 CORRECTION : On itère sur le tableau plat d'objectifs
    for (const objective of quest.objectives) {
      const objectivesMap = qs.questObjectives.get(questId)!;
      objectivesMap.set(objective.objectiveId, 0);
    }

    console.log(`📗 [QuestManager] ${player.characterName} accepte ${questId}`);
    client.send("quest_accepted", { questId });

    this.onSavePlayer?.(player);
    return true;
  }

  /* ===========================================================
     RENDRE LA QUÊTE
     =========================================================== */
  turnInQuest(client: Client, player: PlayerState, questId: string): void {
    const quest = this.getQuest(questId);
    if (!quest) {
      client.send("error", { message: "Quest not found" });
      return;
    }

    const qs = this.getQuestState(player);

    // 🚨 NOUVELLE LOGIQUE DE VÉRIFICATION
    if (!this.isQuestFullyCompleted(player, quest)) {
      client.send("error", { message: "Not ready" });
      return;
    }

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
     RÉCOMPENSES
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
   * 🚨 NOUVELLE MÉTHODE : Vérifie si tous les objectifs d'une quête sont complétés.
   */
  private isQuestFullyCompleted(player: PlayerState, quest: IQuest): boolean {
    const qs = this.getQuestState(player);
    const objectivesMap = qs.questObjectives.get(quest.questId);

    if (!objectivesMap || quest.objectives.length === 0) {
      return false;
    }

    for (const objective of quest.objectives) {
      const progress = objectivesMap.get(objective.objectiveId) || 0;
      const required = objective.count ?? 1;
      if (progress < required) {
        return false; // Si un seul objectif n'est pas complété, la quête ne l'est pas.
      }
    }

    return true; // Tous les objectifs sont complétés.
  }
}
