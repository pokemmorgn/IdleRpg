// server/src/colyseus/managers/QuestObjectiveManager.ts
import { MapSchema } from "@colyseus/schema";

import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { IQuestObjective } from "../../models/Quest";
import Quest from "../../models/Quest";

import { QuestObjectiveMap } from "../schema/QuestObjectiveMap";

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
      1) ENTRYPOINTS
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
      2) MOTEUR CENTRAL
     ===================================================================== */
  private async processAllObjectives(
    player: PlayerState,
    type: string,
    payload: any
  ) {
    const activeQuests = this.getAllActiveQuests(player);

    for (const questId of activeQuests) {
      const step = player.quests.questStep.get(questId) || 0;

      let quest = await Quest.findOne({ questId });
      if (!quest) continue;

      const currentObj = quest.objectives[step];
      if (!currentObj) continue;

      if (currentObj.type !== type) continue;

      if (!this.validateObjectiveMatching(currentObj, payload)) continue;

      // ▶️ Progression
      const done = this.incrementObjectiveProgress(player, questId, currentObj);

      // ▶️ Récupération de la progression après incrément
      const objMap = player.quests.questObjectives.get(questId)!;
      const progressValue = objMap.objectives.get(currentObj.objectiveId) || 0;

      this.notify(player.sessionId, "quest_update", {
        questId,
        step,
        progress: progressValue
      });

      // ▶️ Étape terminée ?
      if (done) {
        await this.completeObjective(player, questId, quest);
      }
    }
  }

  /* =====================================================================
      3) VALIDATION
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
      4) PROGRESSION
     ===================================================================== */
  private incrementObjectiveProgress(
    player: PlayerState,
    questId: string,
    objective: IQuestObjective,
  ): boolean {

    const oid = objective.objectiveId;

    // ➤ récupérer (ou créer) la map d’objectifs
    let objMap = player.quests.questObjectives.get(questId);
    if (!objMap) {
      objMap = new QuestObjectiveMap();
      player.quests.questObjectives.set(questId, objMap);
    }

    const current = objMap.objectives.get(oid) || 0;
    const target = objective.count ?? 1;

    const newValue = Math.min(target, current + 1);
    objMap.objectives.set(oid, newValue);

    return newValue >= target;
  }

  /* =====================================================================
      5) FIN D'ÉTAPE
     ===================================================================== */
  private async completeObjective(
    player: PlayerState,
    questId: string,
    quest: any
  ) {
    const step = player.quests.questStep.get(questId) || 0;

    this.notify(player.sessionId, "quest_step_complete", {
      questId,
      step
    });

    const newStep = step + 1;
    player.quests.questStep.set(questId, newStep);

    if (newStep >= quest.objectives.length) {
      this.finishQuest(player, quest);
    }
  }

  /* =====================================================================
      6) FIN DE QUÊTE
     ===================================================================== */
  private finishQuest(player: PlayerState, quest: any) {
    const questId = quest.questId;

    this.notify(player.sessionId, "quest_ready_to_turn_in", {
      questId,
      questName: quest.name,
      rewards: quest.rewards
    });

    this.onSavePlayer?.(player);

    this.notify(player.sessionId, "quest_complete", {
      questId,
      rewards: quest.rewards
    });
  }

  /* =====================================================================
      7) UTILS
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

  private ensureQuestProgress(player: PlayerState, questId: string) {
    return {
      step: player.quests.questStep.get(questId) || 0,
      objectives: player.quests.questObjectives.get(questId)
    };
  }
}
