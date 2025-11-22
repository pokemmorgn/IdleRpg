// server/src/colyseus/managers/QuestManager.ts
import { Client } from "colyseus";
import { MapSchema } from "@colyseus/schema";

import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";

import Quest, { IQuest } from "../../models/Quest";
import { QuestState } from "../schema/QuestState";
import { QuestObjectiveMap } from "../schema/QuestObjectiveMap";
// AJOUT: Importer le LevelManager
import { LevelManager } from "./LevelManager";

/**
 * QuestManager
 * Aligné avec QuestState utilisant MapSchema<QuestObjectiveMap>
 */
export class QuestManager {
  private serverId: string;
  private gameState: GameState;

  // Cache mémoire des quêtes MongoDB
  public questCache: Map<string, IQuest> = new Map();

  private onSavePlayer?: (player: PlayerState) => Promise<void>;
  // AJOUT: Déclarer une propriété pour le LevelManager
  private levelManager: LevelManager;

  // MODIFIÉ: Ajouter LevelManager au constructeur
  constructor(
    serverId: string,
    gameState: GameState,
    onSavePlayer?: (player: PlayerState) => Promise<void>,
    levelManager: LevelManager // N'est plus optionnel, car requis pour les récompenses
  ) {
    this.serverId = serverId;
    this.gameState = gameState;
    this.onSavePlayer = onSavePlayer;
    this.levelManager = levelManager;
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

    console.log("🧪 DEBUG getAvailableQuestsForNPC()");
    console.log("NPC:", npcId);
    console.log("Player zone:", player.zoneId);
    console.log("Quest cache:", Array.from(this.questCache.keys()));
    console.log("Completed:", qs.completed);

    for (const quest of this.questCache.values()) {
      console.log("➡️ Checking quest:", quest.questId);

      if (quest.giverNpcId !== npcId) continue;

      if (!this.isQuestAvailableForPlayer(quest, player, qs)) {
        continue;
      }

      console.log("✅ QUEST AVAILABLE:", quest.questId);
      available.push(quest);
    }

    return available;
  }

  /* ===========================================================
     QUÊTES PRÊTES À ÊTRE RENDUES
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
      const quest = this.getQuest(questId);
      if (!quest) continue;

      if (quest.giverNpcId !== npcId) continue;

      const step = qs.questStep.get(questId) || 0;

      if (this.isQuestFullyCompleted(quest, step)) completable.push(quest);
    }

    return completable;
  }

  /* ===========================================================
     CONDITIONS D’ACCÈS
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
      const until = qs.dailyCooldown.get(quest.questId);
      if (until && Date.now() < until) return false;
    }

    if (quest.type === "weekly") {
      const until = qs.weeklyCooldown.get(quest.questId);
      if (until && Date.now() < until) return false;
    }

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
    else if (!qs.activeRepeatables.includes(questId))
      qs.activeRepeatables.push(questId);

    // Initialisation : step 0
    qs.questStep.set(questId, 0);
    qs.questStartedAt.set(questId, Date.now());

    // 🚀 IMPORTANT : maintenant on crée un QuestObjectiveMap, pas un MapSchema
    const objMap = new QuestObjectiveMap();
    qs.questObjectives.set(questId, objMap);

    console.log(`📗 [QuestManager] ${player.characterName} accepte ${questId}`);
    client.send("quest_accepted", { questId });

    this.onSavePlayer?.(player);
    return true;
  }

  /* ===========================================================
     RENDRE LA QUÊTE
     =========================================================== */
  async turnInQuest(client: Client, player: PlayerState, questId: string): Promise<void> { // Rendu async
    const quest = this.getQuest(questId);
    if (!quest) {
      client.send("error", { message: "Quest not found" });
      return;
    }

    const qs = this.getQuestState(player);
    const step = qs.questStep.get(questId) || 0;

    if (!this.isQuestFullyCompleted(quest, step)) {
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

    // MODIFIÉ: Appliquer les récompenses de manière asynchrone
    await this.applyRewards(client, player, quest);
    
    this.onSavePlayer?.(player);

    client.send("quest_turned_in", { questId });
  }

  /* ===========================================================
     RÉCOMPENSES
     =========================================================== */
  // MODIFIÉ: La méthode est maintenant async pour gérer le gain d'XP
  private async applyRewards(client: Client, player: PlayerState, quest: IQuest): Promise<void> {
    const r = quest.rewards;

    // MODIFIÉ: Utiliser LevelManager pour donner l'XP de manière centralisée
    if (r.xp && r.xp > 0) {
      console.log(`[QuestManager] Giving ${r.xp} XP to ${player.characterName} for quest ${quest.questId}`);
      await this.levelManager.giveXP(player, r.xp);
    }

    // Les autres récompenses restent des notifications directes pour l'instant
    if (r.gold) client.send("gold_gained", { amount: r.gold });
    if (r.items?.length) client.send("items_gained", { items: r.items });
    if (r.reputation?.length)
      client.send("reputation_gained", { rep: r.reputation });
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
