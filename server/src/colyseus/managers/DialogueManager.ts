// server/src/colyseus/managers/DialogueManager.ts
import { Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import Dialogue, { IDialogue, IDialogueCondition, IDialogueAction, IDialogueChoice } from "../../models/Dialogue";
import DialogueInteraction from "../../models/DialogueInteraction";
import ServerProfile from "../../models/ServerProfile";
import { GameplayTagManager } from "../../managers/GameplayTagManager";
import { QuestObjectiveManager } from "./QuestObjectiveManager";
import { QuestManager } from "./QuestManager";

/**
 * DialogueManager - Gère toute la logique des dialogues
 */
export class DialogueManager {
  private serverId: string;
  private questObjectiveManager?: QuestObjectiveManager;
  private questManager?: QuestManager;
  private gameState?: GameState;

  // AJOUT: Une petite map pour stocker les dialogues de test
  private testDialogues: Map<string, any> = new Map();

  constructor(
    serverId: string,
    questObjectiveManager?: QuestObjectiveManager,
    questManager?: QuestManager,
    gameState?: GameState
  ) {
    this.serverId = serverId;
    this.questObjectiveManager = questObjectiveManager;
    this.questManager = questManager;
    this.gameState = gameState;
  }

  /**
   * AJOUT: Permet d'ajouter un dialogue de test en mémoire
   */
  public addTestDialogue(dialogueId: string, dialogueData: any): void {
    this.testDialogues.set(dialogueId, dialogueData);
  }

  /**
   * Démarre une interaction avec un NPC
   */
  async startDialogue(
    client: Client,
    playerState: PlayerState,
    npcId: string,
    dialogueId: string
  ): Promise<void> {
    try {
      console.log(`💬 [DialogueManager] ${playerState.characterName} démarre dialogue ${dialogueId} avec ${npcId}`);

      // MODIFIÉ: On regarde d'abord dans notre cache de test
      let dialogue = this.testDialogues.get(dialogueId);

      // Si on ne trouve pas en test, on cherche dans la BDD normale
      if (!dialogue) {
        dialogue = await Dialogue.findOne({ dialogueId });
      }

      if (!dialogue) {
        client.send("error", { message: `Dialogue ${dialogueId} not found` });
        return;
      }

      const profile = await ServerProfile.findById(playerState.profileId);
      if (!profile) {
        client.send("error", { message: "Player profile not found" });
        return;
      }

      const interactionCount = await this.updateInteractionCounters(
        playerState.profileId,
        npcId,
        dialogue
      );

      const startNodeId = this.determineStartNode(dialogue, interactionCount);
      const startNode = dialogue.nodes.find(n => n.nodeId === startNodeId);

      if (!startNode) {
        client.send("error", { message: `Node ${startNodeId} not found` });
        return;
      }

      const nodeValid = await this.evaluateConditions(startNode.conditions || [], playerState.profileId, profile);
      if (!nodeValid) {
        client.send("error", { message: "Dialogue conditions not met" });
        return;
      }

      await this.executeActions(startNode.actions || [], client, playerState.profileId, profile);

      // 🔥 Hook quêtes : objectif TALK
      this.questObjectiveManager?.onTalk(playerState, { npcId });

      const choices = await this.filterChoices(startNode.choices, playerState.profileId, profile);

      client.send("dialogue_node", {
        dialogueId: dialogue.dialogueId,
        npcId,
        nodeId: startNode.nodeId,
        text: startNode.text,
        choices: choices.map(c => ({
          text: c.choiceText,
          nextNode: c.nextNode
        }))
      });

    } catch (err: any) {
      console.error(`❌ [DialogueManager] startDialogue error:`, err.message);
      client.send("error", { message: "Dialogue error" });
    }
  }

  /**
   * Quand le joueur fait un choix
   */
  async handleDialogueChoice(
    client: Client,
    playerState: PlayerState,
    dialogueId: string,
    currentNodeId: string,
    choiceIndex: number,
    npcId?: string
  ): Promise<void> {
    try {
      // MODIFIÉ: On regarde d'abord dans notre cache de test
      let dialogue = this.testDialogues.get(dialogueId);

      if (!dialogue) {
        dialogue = await Dialogue.findOne({ dialogueId });
      }
      
      if (!dialogue) return;

      const currentNode = dialogue.nodes.find(n => n.nodeId === currentNodeId);
      if (!currentNode) return;

      const choice = currentNode.choices[choiceIndex];
      if (!choice) return;

      const nextNode = dialogue.nodes.find(n => n.nodeId === choice.nextNode);
      if (!nextNode) return;

      const profile = await ServerProfile.findById(playerState.profileId);
      if (!profile) return;

      const nodeValid = await this.evaluateConditions(nextNode.conditions || [], playerState.profileId, profile);
      if (!nodeValid) return;

      await this.executeActions(nextNode.actions || [], client, playerState.profileId, profile);

      // 🔥 Hook quêtes TALK (même dans une réponse)
      if (npcId) {
        this.questObjectiveManager?.onTalk(playerState, { npcId });
      }

      const choices = await this.filterChoices(nextNode.choices, playerState.profileId, profile);

      if (choices.length === 0) {
        client.send("dialogue_end", {
          dialogueId,
          nodeId: nextNode.nodeId,
          text: nextNode.text
        });
        return;
      }

      client.send("dialogue_node", {
        dialogueId,
        nodeId: nextNode.nodeId,
        text: nextNode.text,
        choices: choices.map(c => ({
          text: c.choiceText,
          nextNode: c.nextNode
        }))
      });

    } catch (err: any) {
      console.error(`❌ [DialogueManager] handleDialogueChoice error:`, err.message);
      client.send("error", { message: "Dialogue choice error" });
    }
  }

  /**
   * Méthode utilitaire pour retrouver le PlayerState depuis le profileId
   */
  private getPlayerStateByProfileId(profileId: string): PlayerState | undefined {
    if (!this.gameState) return undefined;
    for (const player of this.gameState.players.values()) {
      if (player.profileId === profileId) {
        return player;
      }
    }
    return undefined;
  }

  /**
   * Anti-spam court terme et total
   */
  private async updateInteractionCounters(
    profileId: string,
    npcId: string,
    dialogue: IDialogue
  ): Promise<{ short: number; total: number }> {
    try {
      const now = new Date();
      let interaction = await DialogueInteraction.findOne({ profileId, npcId });

      if (!interaction) {
        interaction = await DialogueInteraction.create({
          profileId,
          npcId,
          totalInteractions: 1,
          shortTermCount: 1,
          shortTermResetAt: new Date(now.getTime() + (dialogue.spamProtection?.resetDelay || 300) * 1000),
          lastInteractionAt: now
        });

        return { short: 1, total: 1 };
      }

      if (now > interaction.shortTermResetAt) {
        interaction.shortTermCount = 1;
        interaction.shortTermResetAt = new Date(now.getTime() + (dialogue.spamProtection?.resetDelay || 300) * 1000);
      } else {
        interaction.shortTermCount++;
      }

      interaction.totalInteractions++;
      interaction.lastInteractionAt = now;

      await interaction.save();

      return {
        short: interaction.shortTermCount,
        total: interaction.totalInteractions
      };

    } catch {
      return { short: 0, total: 0 };
    }
  }

  /**
   * Détermine le noeud de départ selon le spam
   */
  private determineStartNode(
    dialogue: IDialogue,
    interactionCount: { short: number; total: number }
  ): string {
    if (!dialogue.spamProtection?.enabled) return "start";

    const count = interactionCount.short;

    for (const tier of dialogue.spamProtection.tiers) {
      if (count >= tier.minCount && (tier.maxCount === null || count <= tier.maxCount)) {
        return tier.startNode;
      }
    }

    return "start";
  }

  /**
   * Vérifie toutes les conditions (AND logique)
   */
  private async evaluateConditions(
    conditions: IDialogueCondition[],
    profileId: string,
    profile: any
  ): Promise<boolean> {
    for (const c of conditions) {
      if (!(await this.evaluateCondition(c, profileId, profile))) {
        return false;
      }
    }
    return true;
  }

  /**
   * Vérifie une seule condition
   */
  private async evaluateCondition(
    condition: IDialogueCondition,
    profileId: string,
    profile: any
  ): Promise<boolean> {
    switch (condition.type) {
      case "level_min":
        return profile.level >= (condition.value || 0);

      case "level_max":
        return profile.level <= (condition.value || 999);

      case "has_tag":
        return condition.tag ? GameplayTagManager.hasTag(profileId, condition.tag) : false;

      case "has_all_tags":
        return condition.tags?.length ? GameplayTagManager.hasAllTags(profileId, condition.tags) : false;

      case "has_any_tag":
        return condition.tags?.length ? GameplayTagManager.hasAnyTag(profileId, condition.tags) : false;

      case "has_tag_matching":
        return condition.tag ? GameplayTagManager.hasTagMatching(profileId, condition.tag) : false;

      case "has_item":
        console.warn("⚠ has_item non implémenté");
        return true;

      case "quest_completed":
        if (!condition.questId) return false;
        const playerStateForCondition = this.getPlayerStateByProfileId(profileId);
        if (playerStateForCondition) {
          return playerStateForCondition.quests.completed.includes(condition.questId);
        }
        return false;

      default:
        console.warn("⚠ Condition inconnue:", condition.type);
        return false;
    }
  }

  /**
   * Filtrage dynamique des choix
   */
  private async filterChoices(
    choices: IDialogueChoice[],
    profileId: string,
    profile: any
  ): Promise<IDialogueChoice[]> {
    const result: IDialogueChoice[] = [];

    for (const choice of choices) {
      if (!choice.conditions?.length || await this.evaluateConditions(choice.conditions, profileId, profile)) {
        result.push(choice);
      }
    }

    return result;
  }

  /**
   * Exécute toutes les actions d'un noeud
   */
  private async executeActions(
    actions: IDialogueAction[],
    client: Client,
    profileId: string,
    profile: any
  ): Promise<void> {
    for (const a of actions) {
      await this.executeAction(a, client, profileId, profile);
    }
  }

  /**
   * Exécute une seule action
   */
  private async executeAction(
    action: IDialogueAction,
    client: Client,
    profileId: string,
    profile: any
  ): Promise<void> {
    switch (action.type) {
      case "add_tag":
        if (action.tag) await GameplayTagManager.addTag(profileId, action.tag);
        break;

      case "remove_tag":
        if (action.tag) await GameplayTagManager.removeTag(profileId, action.tag);
        break;

      case "give_xp":
        if (action.amount) client.send("xp_gained", { amount: action.amount });
        break;

      case "open_shop":
        if (action.shopId) client.send("shop_open", { shopId: action.shopId });
        break;

      case "give_item":
        console.warn("⚠ give_item non implémenté");
        break;

      case "learn_recipe":
        console.warn("⚠ learn_recipe non implémenté");
        break;

      case "learn_skill":
        console.warn("⚠ learn_skill non implémenté");
        break;

      case "start_quest":
        if (action.questId && this.questManager && this.gameState) {
          const playerStateForAction = this.getPlayerStateByProfileId(profileId);
          if (playerStateForAction) {
            this.questManager.acceptQuest(client, playerStateForAction, action.questId);
            console.log(`[DialogueManager] Quête ${action.questId} démarrée via le dialogue pour ${playerStateForAction.characterName}`);
          } else {
            console.error(`[DialogueManager] Impossible de trouver le PlayerState pour le profileId ${profileId} lors du démarrage de quête.`);
          }
        } else {
          console.error(`[DialogueManager] Manque questId, questManager ou gameState pour démarrer la quête.`);
        }
        break;

      default:
        console.warn("⚠ Action inconnue:", action.type);
        break;
    }
  }
}
