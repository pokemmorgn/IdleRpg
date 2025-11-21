// server/src/colyseus/managers/QuestObjectiveManager.ts
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { IQuestObjective } from "../../models/Quest";
import { QuestProgress } from "../schema/QuestProgress";
import Quest from "../../models/Quest";

/**
 * Callback signature envoyée depuis WorldRoom
 */
export type QuestNotify = (sessionId: string, type: string, payload: any) => void;

/**
 * QuestObjectiveManager
 * ----------------------
 * Gère la progression des objectifs de quêtes :
 * - Kills
 * - Loots
 * - Talk to NPC
 * - Explore zone
 * - Activate object
 * - Collect
 * - Escort
 * - Survive
 */
export class QuestObjectiveManager {
  private gameState: GameState;
  private notify: QuestNotify;

  constructor(gameState: GameState, notifyCallback: QuestNotify) {
    this.gameState = gameState;
    this.notify = notifyCallback;
  }

  /* =====================================================================
      1) ENTRYPOINTS APPELÉS PAR LE SERVEUR (MonsterManager / NPCManager…)
     ===================================================================== */

  /** Monstre tué */
  onMonsterKilled(player: PlayerState, payload: { enemyType: string; enemyRarity: string; isBoss: boolean }) {
    this.processAllObjectives(player, "kill", payload);
  }

  /** Objet ramassé / loot obtenu */
  onLoot(player: PlayerState, payload: { itemId: string; dropSource?: string }) {
    this.processAllObjectives(player, "loot", payload);
  }

  /** Dialogue fini */
  onTalk(player: PlayerState, payload: { npcId: string }) {
    this.processAllObjectives(player, "talk", payload);
  }

  /** Zone explorée */
  onExplore(player: PlayerState, payload: { locationId?: string; x?: number; y?: number; z?: number }) {
    this.processAllObjectives(player, "explore", payload);
  }

  /** Activation d'un mécanisme */
  onActivate(player: PlayerState, payload: { activationType: string; order?: number }) {
    this.processAllObjectives(player, "activate", payload);
  }

  /** Collecte */
  onCollect(player: PlayerState, payload: { resourceId: string }) {
    this.processAllObjectives(player, "collect", payload);
  }

  /** Escort — update */
  onEscort(player: PlayerState, payload: { escortNpcId: string; targetLocationId: string }) {
    this.processAllObjectives(player, "escort", payload);
  }

  /** Survive (tick ou fin d’événement) */
  onSurvive(player: PlayerState, payload: { durationSec?: number; wave?: number }) {
    this.processAllObjectives(player, "survive", payload);
  }

  /* =====================================================================
      2) MOTEUR CENTRAL DE PROGRESSION
     ===================================================================== */

  private async processAllObjectives(
    player: PlayerState,
    type: string,
    payload: any
  ) {
    const activeQuests = this.getAllActiveQuests(player);

    for (const questId of activeQuests) {
      const progress = this.ensureQuestProgress(player, questId);

      const quest = await Quest.findOne({ questId });
      if (!quest) continue;

      const currentObj = quest.objectives[progress.step];
      if (!currentObj) continue;

      // L'objectif ne correspond pas au type
      if (currentObj.type !== type) continue;

      // Condition de matching
      const valid = this.validateObjectiveMatching(currentObj, payload);
      if (!valid) continue;

      // Mise à jour de progression (selon type)
      const done = this.incrementObjectiveProgress(progress, currentObj, payload);

      // Notification client : mise à jour progression
      this.notify(player.sessionId, "quest_update", {
        questId,
        step: progress.step,
        progress: progress.progress.get(currentObj.objectiveId) || 0
      });

      // Si terminé, on passe à l’objectif suivant
      if (done) {
        await this.completeObjective(player, questId, quest, progress);
      }
    }
  }

  /* =====================================================================
      3) VALIDATION DES OBJETS SELON LE TYPE
     ===================================================================== */

  private validateObjectiveMatching(objective: IQuestObjective, payload: any): boolean {
    switch (objective.type) {
      case "kill":
        if (objective.enemyType && payload.enemyType !== objective.enemyType) return false;
        if (objective.enemyRarity && payload.enemyRarity !== objective.enemyRarity) return false;
        if (objective.isBoss && !payload.isBoss) return false;
        return true;

      case "loot":
        if (objective.itemId && payload.itemId !== objective.itemId) return false;
        if (objective.dropSource && payload.dropSource !== objective.dropSource) return false;
        return true;

      case "talk":
        return payload.npcId === objective.npcId;

      case "explore":
        if (objective.locationId && payload.locationId !== objective.locationId) return false;
        return true;

      case "activate":
        if (objective.activationType && payload.activationType !== objective.activationType) return false;
        if (objective.order !== undefined && payload.order !== objective.order) return false;
        return true;

      case "collect":
        return payload.resourceId === objective.resourceId;

      case "escort":
        if (payload.escortNpcId !== objective.escortNpcId) return false;
        if (objective.targetLocationId && payload.targetLocationId !== objective.targetLocationId) return false;
        return true;

      case "survive":
        if (objective.durationSec && payload.durationSec < objective.durationSec) return false;
        if (objective.waveCount && payload.wave < objective.waveCount) return false;
        return true;

      default:
        return false;
    }
  }

  /* =====================================================================
      4) INCREMENT PROGRESSIONS
     ===================================================================== */

  private incrementObjectiveProgress(
    progress: QuestProgress,
    objective: IQuestObjective,
    payload: any
  ): boolean {
    const oid = objective.objectiveId;

    if (!progress.progress.has(oid)) progress.progress.set(oid, 0);

    const current = progress.progress.get(oid)!;

    // Si type = kill / loot / collect… => +1
    const target = objective.count ?? 1;
    const newValue = Math.min(target, current + 1);

    progress.progress.set(oid, newValue);

    return newValue >= target;
  }

  /* =====================================================================
      5) FIN D’OBJECTIF → FIN DE QUÊTE ?
     ===================================================================== */

  private async completeObjective(
    player: PlayerState,
    questId: string,
    quest: any,
    progress: QuestProgress
  ) {
    const step = progress.step;

    this.notify(player.sessionId, "quest_step_complete", {
      questId,
      step
    });

    // Passer au next step
    progress.step++;

    const finalStep = quest.objectives.length;

    // Si fin complète de la quête
    if (progress.step >= finalStep) {
      this.finishQuest(player, quest);
    }
  }

  /* =====================================================================
      6) FIN DE QUÊTE
     ===================================================================== */

  private finishQuest(player: PlayerState, quest: any) {
    const questId = quest.questId;

    // Ajouter aux completed
    if (!player.completedQuests.includes(questId)) {
      player.completedQuests.push(questId);
    }

    // Nettoyer les progressions
    player.questProgress.delete(questId);

    // Notifier le client
    this.notify(player.sessionId, "quest_complete", {
      questId,
      rewards: quest.rewards
    });
  }

  /* =====================================================================
      7) UTILS
     ===================================================================== */

  /** Toutes les quêtes actives (main + secondaires + daily/repeatables) */
  private getAllActiveQuests(player: PlayerState): string[] {
    const list: string[] = [];

    if (player.activeMainQuest) list.push(player.activeMainQuest);
    if (player.activeSecondaryQuest) list.push(player.activeSecondaryQuest);
    if (player.activeRepeatableQuests.length > 0) {
      list.push(...player.activeRepeatableQuests);
    }

    return list;
  }

  /** Initialise la progression si absente */
  private ensureQuestProgress(player: PlayerState, questId: string): QuestProgress {
    if (!player.questProgress.has(questId)) {
      const p = new QuestProgress();
      p.step = 0;
      p.startedAt = Date.now();
      player.questProgress.set(questId, p);
      return p;
    }
    return player.questProgress.get(questId)!;
  }
}
