import { Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";

import Quest, { IQuest } from "../../models/Quest";

import { QuestState } from "../schema/QuestState";
import { QuestProgress } from "../schema/QuestProgress";

/**
 * QuestManager
 * ------------
 * Version compatible avec le nouveau système QuestState et le callback de sauvegarde.
 */
export class QuestManager {
  private serverId: string;
  private gameState: GameState;
  private questCache: Map<string, IQuest> = new Map();
  private onSavePlayer?: (player: PlayerState) => Promise<void>; // AJOUT: Callback de sauvegarde

  // MODIFIÉ: Le constructeur accepte maintenant le callback de sauvegarde
  constructor(
    serverId: string,
    gameState: GameState,
    onSavePlayer?: (player: PlayerState) => Promise<void>
  ) {
    this.serverId = serverId;
    this.gameState = gameState;
    this.onSavePlayer = onSavePlayer; // Stocker le callback
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
   * Récupère les quêtes qu'un joueur peut rendre à un NPC
   * (quêtes actives dont les objectifs sont complétés)
   */
  getCompletableQuestsForNPC(npcId: string, player: PlayerState): IQuest[] {
    const qs = this.getQuestState(player);
    const completable: IQuest[] = [];
  
    // On parcourt les quêtes ACTIVES du joueur
    const activeQuests = [
      qs.activeMain,
      qs.activeSecondary,
      ...qs.activeRepeatables
    ].filter(Boolean); // Filtre les chaînes vides
  
    for (const questId of activeQuests) {
      const quest = this.getQuest(questId);
      if (!quest) continue;
  
      // La quête doit être rendue à ce PNJ spécifique
      if (quest.giverNpcId !== npcId) continue;
  
      // On vérifie si tous les objectifs sont complétés
      const progress = qs.progress.get(questId);
      if (progress && this.isQuestFullyCompleted(quest, progress)) {
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

    // Niveau requis
    if (player.level < quest.requiredLevel) return false;

    // Zone
    if (quest.zoneId && quest.zoneId !== player.zoneId) return false;

    // Déjà complétée ?
    if (qs.completed.includes(quest.questId)) return false;

    // Prérequis ?
    if (quest.prerequisiteQuestId) {
      if (!qs.completed.includes(quest.prerequisiteQuestId)) return false;
    }

    // Slots uniques
    if (quest.type === "main" && qs.activeMain !== "") return false;
    if (quest.type === "secondary" && qs.activeSecondary !== "") return false;

    // Daily / Weekly déjà faite ?
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

    // Affectation dans QuestState
    if (quest.type === "main") {
      qs.activeMain = questId;
    } else if (quest.type === "secondary") {
      qs.activeSecondary = questId;
    } else {
      if (!qs.activeRepeatables.includes(questId)) {
        qs.activeRepeatables.push(questId);
      }
    }

    // Progression
    const progress = new QuestProgress();
    progress.step = 0;
    progress.startedAt = Date.now();
    qs.progress.set(questId, progress);

    client.send("quest_accepted", { questId });
    console.log(`📗 [QuestManager] ${player.characterName} accepte ${questId}`);

    // NOUVEAU: Déclencher la sauvegarde après l'acceptation
    this.onSavePlayer?.(player);

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

    const qs = this.getQuestState(player);

    console.log(`🏆 [QuestManager] ${player.characterName} complète ${questId}`);

    // Ajouter au completed
    if (!qs.completed.includes(questId)) {
      qs.completed.push(questId);
    }

    // Libérer les slots
    if (qs.activeMain === questId) qs.activeMain = "";
    if (qs.activeSecondary === questId) qs.activeSecondary = "";

    // Retirer des repeatables
    const idx = qs.activeRepeatables.indexOf(questId);
    if (idx !== -1) qs.activeRepeatables.splice(idx, 1);

    // Supprimer progression
    if (qs.progress.has(questId)) qs.progress.delete(questId);

    // Marquer cooldown
    if (quest.type === "daily") {
      qs.dailyCooldown.set(questId, Date.now() + 24 * 3600 * 1000);
    }
    if (quest.type === "weekly") {
      qs.weeklyCooldown.set(questId, Date.now() + 7 * 24 * 3600 * 1000);
    }

    // Récompenses
    this.applyRewards(client, player, quest);

    // NOUVEAU: Déclencher la sauvegarde après la complétion
    this.onSavePlayer?.(player);

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

  /* ===========================================================
     UTIL: récupérer le QuestState du joueur
     =========================================================== */
  private getQuestState(player: PlayerState): QuestState {
    return player.quests;
  }
  /**
 * Termine une quête et donne les récompenses.
 * Appelé quand le joueur rend la quête au PNJ.
 */
turnInQuest(client: Client, player: PlayerState, questId: string): void {
  const quest = this.getQuest(questId);
  if (!quest) {
    client.send("error", { message: "Quest not found" });
    return;
  }

  const qs = this.getQuestState(player);

  // Vérifier que la quête est bien active et que tous les objectifs sont faits
  // (Cette logique est déjà dans finishQuest, mais une double vérification ne fait pas de mal)
  const progress = qs.progress.get(questId);
  if (!progress || !this.isQuestFullyCompleted(quest, progress)) {
    client.send("error", { message: "This quest is not ready to be turned in." });
    return;
  }

  console.log(`🏁 [QuestManager] ${player.characterName} rend la quête ${questId}`);

  // Ajouter au completed
  if (!qs.completed.includes(questId)) {
    qs.completed.push(questId);
  }

  // Libérer les slots
  if (qs.activeMain === questId) qs.activeMain = "";
  if (qs.activeSecondary === questId) qs.activeSecondary = "";

  // Retirer des repeatables
  const idx = qs.activeRepeatables.indexOf(questId);
  if (idx !== -1) qs.activeRepeatables.splice(idx, 1);

  // Supprimer progression
  if (qs.progress.has(questId)) qs.progress.delete(questId);

  // Marquer cooldown
  if (quest.type === "daily") {
    qs.dailyCooldown.set(questId, Date.now() + 24 * 3600 * 1000);
  }
  if (quest.type === "weekly") {
    qs.weeklyCooldown.set(questId, Date.now() + 7 * 24 * 3600 * 1000);
  }

  // Récompenses
  this.applyRewards(client, player, quest);

  // NOUVEAU: Déclencher la sauvegarde après la remise de la quête
  this.onSavePlayer?.(player);

  client.send("quest_turned_in", { questId });
}

// Méthode utilitaire pour vérifier si tous les objectifs sont faits
private isQuestFullyCompleted(quest: any, progress: QuestProgress): boolean {
  return progress.step >= quest.objectives.length;
}
}
