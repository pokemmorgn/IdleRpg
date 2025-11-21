import { Client } from "colyseus";
import { PlayerState } from "../schema/PlayerState";
import { QuestManager } from "./QuestManager";
import { GameState } from "../schema/GameState";
import { QuestProgress } from "../schema/QuestProgress";
import { IQuest, IQuestObjective } from "../../models/Quest";

export class QuestObjectiveManager {
  private serverId: string;
  private gameState: GameState;
  private questManager: QuestManager;

  constructor(serverId: string, gameState: GameState, questManager: QuestManager) {
    this.serverId = serverId;
    this.gameState = gameState;
    this.questManager = questManager;
  }

  /* ==========================================================================
     UTILS : Récupération de progression
     ========================================================================== */
  private getProgress(player: PlayerState, questId: string): QuestProgress | null {
    if (!player.questProgress || !player.questProgress.has(questId)) return null;
    return player.questProgress.get(questId)!;
  }

  private getCurrentObjective(quest: IQuest, progress: QuestProgress): IQuestObjective | null {
    if (!quest.objectives || progress.step >= quest.objectives.length) return null;
    return quest.objectives[progress.step];
  }

  /* ==========================================================================
     DÉCLENCHEURS D’ÉVÉNEMENTS
     ========================================================================== */

  onKill(player: PlayerState, monsterType: string, monsterRarity: string, zoneId: string) {
    this.handleEvent(player, "kill", { monsterType, monsterRarity, zoneId });
  }

  onLoot(player: PlayerState, itemId: string, amount: number) {
    this.handleEvent(player, "loot", { itemId, amount });
  }

  onTalk(player: PlayerState, npcId: string) {
    this.handleEvent(player, "talk", { npcId });
  }

  onExplore(player: PlayerState, locationId: string) {
    this.handleEvent(player, "explore", { locationId });
  }

  onCollect(player: PlayerState, resourceId: string, amount: number) {
    this.handleEvent(player, "collect", { resourceId, amount });
  }

  onActivate(player: PlayerState, mechanismId: string) {
    this.handleEvent(player, "activate", { mechanismId });
  }

  onSurvive(player: PlayerState, seconds: number) {
    this.handleEvent(player, "survive", { seconds });
  }

  onEscort(player: PlayerState, escortId: string) {
    this.handleEvent(player, "escort", { escortId });
  }

  /* ==========================================================================
     HANDLE EVENT - Le cœur du système
     ========================================================================== */

  private handleEvent(player: PlayerState, eventType: string, payload: any) {
    const questIds = this.getAllActiveQuests(player);
    if (questIds.length === 0) return;

    for (const questId of questIds) {

      const quest = this.questManager.getQuest(questId);
      if (!quest) continue;

      const progress = this.getProgress(player, questId);
      if (!progress) continue;

      const objective = this.getCurrentObjective(quest, progress);
      if (!objective) continue;

      // Type mismatch → ignore
      if (objective.type !== eventType) continue;

      // TRY APPLY OBJECTIVE
      if (this.applyObjective(player, quest, objective, progress, payload)) {

        // Vérifier si étape terminée
        if (this.isObjectiveComplete(objective, progress)) {

          // Passer à la prochaine étape
          progress.step++;

          // Dernière étape ?
          if (progress.step >= quest.objectives.length) {
            // Compléter la quête
            this.questManager.completeQuest(
              this.gameState.getClientBySessionId(player.sessionId)!,
              player,
              questId
            );
            continue;
          }

          // Reset progress pour prochaine étape
          progress.progress.clear();

          // Notification progression
          this.sendProgressUpdate(player, questId, progress);
        }
      }
    }
  }

  /* ==========================================================================
     Appliquer la progression selon le type d’objectif
     ========================================================================== */

  private applyObjective(
    player: PlayerState,
    quest: IQuest,
    objective: IQuestObjective,
    progress: QuestProgress,
    payload: any
  ): boolean {

    const objId = objective.objectiveId;

    // Init si nécessaire
    if (!progress.progress.has(objId)) {
      progress.progress.set(objId, 0);
    }

    let current = progress.progress.get(objId)!;

    switch (objective.type) {

      /* ------ KILL ------ */
      case "kill":
        if (objective.monsterType && payload.monsterType !== objective.monsterType) return false;
        if (objective.monsterRarity && payload.monsterRarity !== objective.monsterRarity) return false;
        if (objective.zoneId && payload.zoneId !== objective.zoneId) return false;

        current += 1;
        progress.progress.set(objId, current);
        return true;

      /* ------ LOOT ------ */
      case "loot":
        if (payload.itemId !== objective.itemId) return false;
        current += payload.amount ?? 1;
        progress.progress.set(objId, current);
        return true;

      /* ------ TALK ------ */
      case "talk":
        if (payload.npcId !== objective.npcId) return false;
        progress.progress.set(objId, 1);
        return true;

      /* ------ EXPLORE ------ */
      case "explore":
        if (payload.locationId !== objective.locationId) return false;
        progress.progress.set(objId, 1);
        return true;

      /* ------ COLLECT ------ */
      case "collect":
        if (payload.resourceId !== objective.resourceId) return false;
        current += payload.amount ?? 1;
        progress.progress.set(objId, current);
        return true;

      /* ------ ACTIVATE ------ */
      case "activate":
        if (payload.mechanismId !== objective.mechanismId) return false;
        progress.progress.set(objId, 1);
        return true;

      /* ------ SURVIVE ------ */
      case "survive":
        current += payload.seconds;
        progress.progress.set(objId, current);
        return true;

      /* ------ ESCORT ------ */
      case "escort":
        if (payload.escortId !== objective.escortId) return false;
        progress.progress.set(objId, 1);
        return true;

      default:
        return false;
    }
  }

  /* ==========================================================================
     Vérification si objectif terminé
     ========================================================================== */

  private isObjectiveComplete(objective: IQuestObjective, progress: QuestProgress): boolean {
    const objId = objective.objectiveId;
    const value = progress.progress.get(objId) ?? 0;

    const target = objective.amount ?? 1;

    return value >= target;
  }

  /* ==========================================================================
     Récupère toutes les quêtes actives d’un joueur
     ========================================================================== */

  private getAllActiveQuests(player: PlayerState): string[] {
    const list: string[] = [];

    if (player.activeMainQuest) list.push(player.activeMainQuest);
    if (player.activeSecondaryQuest) list.push(player.activeSecondaryQuest);

    if (player.activeRepeatableQuests) {
      for (const q of player.activeRepeatableQuests) list.push(q);
    }

    return list;
  }

  /* ==========================================================================
     Envoi de l’état de progression
     ========================================================================== */

  private sendProgressUpdate(player: PlayerState, questId: string, progress: QuestProgress) {
    const client = this.gameState.getClientBySessionId(player.sessionId);
    if (!client) return;

    client.send("quest_progress", {
      questId,
      step: progress.step,
      progress: [...progress.progress.entries()]
    });
  }
}
