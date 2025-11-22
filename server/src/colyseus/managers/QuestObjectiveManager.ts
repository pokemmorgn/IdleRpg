// server/src/colyseus/managers/QuestObjectiveManager.ts
import { MapSchema } from "@colyseus/schema";

import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { IQuestObjective } from "../../models/Quest";
import Quest from "../../models/Quest";

export type QuestNotify = (sessionId: string, type: string, payload: any) => void;

export class QuestObjectiveManager {
  private gameState: GameState;
  private notify: QuestNotify;
  private onSavePlayer?: (player: PlayerState) => Promise<void>;

  constructor(
    gameState: GameState,
    notifyCallback: QuestNotify,
    onSavePlayer?: (player: PlayerState) => Promise<void>
  ) {
    this.gameState = gameState;
    this.notify = notifyCallback;
    this.onSavePlayer = onSavePlayer;
  }

  /* =====================================================================
      1) ENTRYPOINTS (inchangés)
     ===================================================================== */
  onMonsterKilled(player: PlayerState, payload: any) {
    this.processAllObjectives(player, "kill", payload);
  }

  onLoot(player: PlayerState, payload: any) {
    this.processAllObjectives(player, "loot", payload);
  }

  onTalk(player: PlayerState, payload: any) {
    this.processAllObjectives(player, "talk", payload);
  }

  onExplore(player: PlayerState, payload: any) {
    this.processAllObjectives(player, "explore", payload);
  }

  onActivate(player: PlayerState, payload: any) {
    this.processAllObjectives(player, "activate", payload);
  }

  onCollect(player: PlayerState, payload: any) {
    this.processAllObjectives(player, "collect", payload);
  }

  onEscort(player: PlayerState, payload: any) {
    this.processAllObjectives(player, "escort", payload);
  }

  onSurvive(player: PlayerState, payload: any) {
    this.processAllObjectives(player, "survive", payload);
  }

  /* =====================================================================
      2) MOTEUR CENTRAL (MODIFIÉ)
     ===================================================================== */
  private async processAllObjectives(
    player: PlayerState,
    type: string,
    payload: any
  ) {
    const activeQuests = this.getAllActiveQuests(player);

    for (const questId of activeQuests) {
      // Vérifier si la quête est déjà terminée
      if (player.quests.completed.includes(questId)) continue;

      let quest = await Quest.findOne({ questId });
      if (!quest) continue;

      let questUpdated = false;

      // 🚨 NOUVELLE LOGIQUE : Parcourir TOUS les objectifs de la quête
      for (const objective of quest.objectives) {
        if (objective.type !== type) continue;

        if (!this.validateObjectiveMatching(objective, payload)) continue;

        // ▶️ Mise à jour progression
        const wasCompleted = this.incrementObjectiveProgress(player, questId, objective);

        if (wasCompleted) {
          questUpdated = true;
        }

        // ▶️ Notif progression
        const progressMap = player.quests.questObjectives.get(questId)!;
        const progressValue = progressMap.get(objective.objectiveId) || 0;

        this.notify(player.sessionId, "quest_update", {
          questId,
          objectiveId: objective.objectiveId,
          progress: progressValue,
          required: objective.count || 1
        });
      }

      // ▶️ Si un objectif a été complété, vérifier si la quête entière est terminée
      if (questUpdated) {
        if (this.isQuestFullyCompleted(player, quest)) {
          this.finishQuest(player, quest);
        }
        
        // Sauvegarder les données du joueur
        this.onSavePlayer?.(player);
      }
    }
  }

  /* =====================================================================
      3) VALIDATION (inchangée)
     ===================================================================== */
  private validateObjectiveMatching(objective: IQuestObjective, payload: any): boolean {
    switch (objective.type) {
      case "kill":
        if (objective.enemyType && payload.enemyType !== objective.enemyType) return false;
        if (objective.enemyRarity && payload.enemyRarity !== objective.enemyRarity) return false;
        if (objective.isBoss && !payload.isBoss) return false;
        if (objective.zoneId && payload.zoneId !== objective.zoneId) return false;
        return true;

      case "loot":
        return (!objective.itemId || payload.itemId === objective.itemId);

      case "talk":
        return payload.npcId === objective.npcId;

      case "explore":
        return !objective.locationId || payload.locationId === objective.locationId;

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
      4) PROGRESSION (inchangée)
     ===================================================================== */
  private incrementObjectiveProgress(
    player: PlayerState,
    questId: string,
    objective: IQuestObjective,
  ): boolean {
    const oid = objective.objectiveId;

    let objectivesMap = player.quests.questObjectives.get(questId);
    if (!objectivesMap) {
      objectivesMap = new MapSchema<number>();
      player.quests.questObjectives.set(questId, objectivesMap);
    }

    const current = objectivesMap.get(oid) || 0;
    const target = objective.count ?? 1;

    if (current >= target) {
      return false; // L'objectif est déjà complété
    }

    const newValue = Math.min(target, current + 1);
    objectivesMap.set(oid, newValue);

    return newValue >= target; // Retourne true si l'objectif vient d'être complété
  }

  /* =====================================================================
      5) FIN DE QUÊTE (remplace les anciennes méthodes par étape)
     ===================================================================== */
  private finishQuest(player: PlayerState, quest: any) {
    const questId = quest.questId;

    // Marquer la quête comme prête à être rendue
    this.notify(player.sessionId, "quest_ready_to_turn_in", {
      questId,
      questName: quest.name,
      rewards: quest.rewards
    });

    // Notifier que la quête est terminée (mais pas encore rendue)
    this.notify(player.sessionId, "quest_complete", {
      questId,
      questName: quest.name,
      rewards: quest.rewards
    });
  }

  /* =====================================================================
      6) UTILS
     ===================================================================== */
  private getAllActiveQuests(player: PlayerState): string[] {
    const list: string[] = [];
    if (player.quests.activeMain) list.push(player.quests.activeMain);
    if (player.quests.activeSecondary) list.push(player.quests.activeSecondary);
    if (player.quests.activeRepeatables.length) {
      list.push(...player.quests.activeRepeatables);
    }
    return list;
  }

  /**
   * 🚨 NOUVELLE MÉTHODE : Vérifie si tous les objectifs d'une quête sont complétés.
   * (Logique identique à celle ajoutée dans QuestManager)
   */
  private isQuestFullyCompleted(player: PlayerState, quest: any): boolean {
    const objectivesMap = player.quests.questObjectives.get(quest.questId);

    if (!objectivesMap || quest.objectives.length === 0) {
      return false;
    }

    for (const objective of quest.objectives) {
      const progress = objectivesMap.get(objective.objectiveId) || 0;
      const required = objective.count ?? 1;
      if (progress < required) {
        return false;
      }
    }

    return true;
  }
}
