import { Client } from "colyseus";
import { PlayerState } from "../schema/PlayerState";
import Dialogue, { IDialogue, IDialogueNode, IDialogueCondition, IDialogueAction, IDialogueChoice } from "../../models/Dialogue";
import DialogueInteraction, { IDialogueInteraction } from "../../models/DialogueInteraction";
import ServerProfile from "../../models/ServerProfile";
import { GameplayTagManager } from "../../managers/GameplayTagManager";
import { QuestObjectiveManager } from "./QuestObjectiveManager";
/**
 * DialogueManager - Gère tous les dialogues du jeu
 * Responsabilités :
 * - Charger les dialogues depuis MongoDB
 * - Évaluer les conditions (tags, level, etc.)
 * - Exécuter les actions (add_tag, give_xp, etc.)
 * - Gérer le spam protection (compteurs court/long terme)
 * - Déterminer le bon noeud de départ selon le contexte
 */
export class DialogueManager {
  private serverId: string;
  private questObjectiveManager?: QuestObjectiveManager;
  constructor(serverId: string) {
    this.serverId = serverId;
    this.questObjectiveManager = questObjectiveManager;
  }

  /**
   * Démarre une interaction de dialogue avec un NPC
   */
  async startDialogue(
    client: Client,
    playerState: PlayerState,
    npcId: string,
    dialogueId: string
  ): Promise<void> {
    try {
      console.log(`💬 [DialogueManager] ${playerState.characterName} démarre dialogue ${dialogueId} avec ${npcId}`);

      // 1. Charger le dialogue depuis MongoDB
      const dialogue = await Dialogue.findOne({ dialogueId });

      if (!dialogue) {
        client.send("error", { message: `Dialogue ${dialogueId} not found` });
        console.error(`❌ [DialogueManager] Dialogue ${dialogueId} introuvable`);
        return;
      }

      // 2. Charger le profil du joueur (pour level, etc.)
      const profile = await ServerProfile.findById(playerState.profileId);

      if (!profile) {
        client.send("error", { message: "Player profile not found" });
        console.error(`❌ [DialogueManager] Profil ${playerState.profileId} introuvable`);
        return;
      }

      // 3. Gérer les compteurs d'interaction (spam protection)
      const interactionCount = await this.updateInteractionCounters(
        playerState.profileId,
        npcId,
        dialogue
      );

      // 4. Déterminer le noeud de départ selon le spam
      const startNodeId = this.determineStartNode(dialogue, interactionCount);

      console.log(`📍 [DialogueManager] Noeud de départ: ${startNodeId} (interactions: ${interactionCount.short}/${interactionCount.total})`);

      // 5. Charger le noeud
      const startNode = dialogue.nodes.find(node => node.nodeId === startNodeId);

      if (!startNode) {
        client.send("error", { message: `Start node ${startNodeId} not found` });
        console.error(`❌ [DialogueManager] Noeud ${startNodeId} introuvable`);
        return;
      }

      // 6. Évaluer les conditions du noeud
      const nodeValid = await this.evaluateConditions(
        startNode.conditions || [],
        playerState.profileId,
        profile
      );

      if (!nodeValid) {
        client.send("error", { message: "Dialogue conditions not met" });
        console.log(`⚠️  [DialogueManager] Conditions du noeud ${startNodeId} non satisfaites`);
        return;
      }

      // 7. Exécuter les actions du noeud
      await this.executeActions(
        startNode.actions || [],
        client,
        playerState.profileId,
        profile
      );

      // 8. Filtrer les choix selon les conditions
      const availableChoices = await this.filterChoices(
        startNode.choices,
        playerState.profileId,
        profile
      );

      // 9. Envoyer le dialogue au client
      // 🔥 Hook quêtes : objectif TALK
      this.questObjectiveManager?.onTalk(playerState, { npcId });
      client.send("dialogue_node", {
        dialogueId: dialogue.dialogueId,
        npcId: npcId,
        nodeId: startNode.nodeId,
        text: startNode.text,
        choices: availableChoices.map(choice => ({
          text: choice.choiceText,
          nextNode: choice.nextNode
        }))
      });

      console.log(`✅ [DialogueManager] Dialogue envoyé: ${startNode.nodeId} avec ${availableChoices.length} choix`);

    } catch (err: any) {
      console.error(`❌ [DialogueManager] Erreur startDialogue:`, err.message);
      client.send("error", { message: "Dialogue error" });
    }
  }

  /**
   * Gère le choix d'un joueur dans un dialogue
   */
  async handleDialogueChoice(
  client: Client,
  playerState: PlayerState,
  npcId: string,       // <-- AJOUT
  dialogueId: string,
  currentNodeId: string,
  choiceIndex: number
): Promise<void> {
    try {
      console.log(`💬 [DialogueManager] ${playerState.characterName} choix ${choiceIndex} sur noeud ${currentNodeId}`);

      // 1. Charger le dialogue
      const dialogue = await Dialogue.findOne({ dialogueId });

      if (!dialogue) {
        client.send("error", { message: `Dialogue ${dialogueId} not found` });
        return;
      }

      // 2. Trouver le noeud actuel
      const currentNode = dialogue.nodes.find(node => node.nodeId === currentNodeId);

      if (!currentNode) {
        client.send("error", { message: `Node ${currentNodeId} not found` });
        return;
      }

      // 3. Vérifier que le choix existe
      if (choiceIndex < 0 || choiceIndex >= currentNode.choices.length) {
        client.send("error", { message: "Invalid choice index" });
        return;
      }

      const choice = currentNode.choices[choiceIndex];

      // 4. Charger le noeud suivant
      const nextNode = dialogue.nodes.find(node => node.nodeId === choice.nextNode);

      if (!nextNode) {
        client.send("error", { message: `Next node ${choice.nextNode} not found` });
        return;
      }

      // 5. Charger le profil
      const profile = await ServerProfile.findById(playerState.profileId);

      if (!profile) {
        client.send("error", { message: "Player profile not found" });
        return;
      }

      // 6. Évaluer les conditions du noeud suivant
      const nodeValid = await this.evaluateConditions(
        nextNode.conditions || [],
        playerState.profileId,
        profile
      );

      if (!nodeValid) {
        client.send("error", { message: "Next node conditions not met" });
        console.log(`⚠️  [DialogueManager] Conditions du noeud ${nextNode.nodeId} non satisfaites`);
        return;
      }

      // 7. Exécuter les actions du noeud suivant
      await this.executeActions(
        nextNode.actions || [],
        client,
        playerState.profileId,
        profile
      );
      // 🔥 Hook quêtes : objectif TALK (dans un choix)
      this.questObjectiveManager?.onTalk(playerState, { npcId });
      
      // 8. Filtrer les choix selon les conditions
      const availableChoices = await this.filterChoices(
        nextNode.choices,
        playerState.profileId,
        profile
      );

      // 9. Si pas de choix, c'est la fin du dialogue
      if (availableChoices.length === 0) {
        client.send("dialogue_end", {
          dialogueId: dialogue.dialogueId,
          nodeId: nextNode.nodeId,
          text: nextNode.text
        });
        console.log(`✅ [DialogueManager] Dialogue terminé sur noeud ${nextNode.nodeId}`);
        return;
      }

      // 10. Envoyer le noeud suivant
      client.send("dialogue_node", {
        dialogueId: dialogue.dialogueId,
        nodeId: nextNode.nodeId,
        text: nextNode.text,
        choices: availableChoices.map(choice => ({
          text: choice.choiceText,
          nextNode: choice.nextNode
        }))
      });

      console.log(`✅ [DialogueManager] Noeud suivant envoyé: ${nextNode.nodeId}`);

    } catch (err: any) {
      console.error(`❌ [DialogueManager] Erreur handleDialogueChoice:`, err.message);
      client.send("error", { message: "Dialogue choice error" });
    }
  }

  /**
   * Met à jour les compteurs d'interaction et retourne les compteurs actuels
   */
  private async updateInteractionCounters(
    profileId: string,
    npcId: string,
    dialogue: IDialogue
  ): Promise<{ short: number; total: number }> {
    try {
      const now = new Date();

      // Récupérer ou créer l'entrée d'interaction
      let interaction = await DialogueInteraction.findOne({ profileId, npcId });

      if (!interaction) {
        // Première interaction avec ce NPC
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

      // Vérifier si le compteur court terme doit être réinitialisé
      if (now > interaction.shortTermResetAt) {
        interaction.shortTermCount = 1;
        interaction.shortTermResetAt = new Date(now.getTime() + (dialogue.spamProtection?.resetDelay || 300) * 1000);
      } else {
        interaction.shortTermCount++;
      }

      // Incrémenter le compteur total
      interaction.totalInteractions++;
      interaction.lastInteractionAt = now;

      await interaction.save();

      return {
        short: interaction.shortTermCount,
        total: interaction.totalInteractions
      };

    } catch (err: any) {
      console.error(`❌ [DialogueManager] Erreur updateInteractionCounters:`, err.message);
      return { short: 0, total: 0 };
    }
  }

  /**
   * Détermine le noeud de départ selon la spam protection
   */
  private determineStartNode(
    dialogue: IDialogue,
    interactionCount: { short: number; total: number }
  ): string {
    // Si pas de spam protection, utiliser "start"
    if (!dialogue.spamProtection || !dialogue.spamProtection.enabled) {
      return "start";
    }

    const tiers = dialogue.spamProtection.tiers;

    if (tiers.length === 0) {
      return "start";
    }

    // Utiliser le compteur court terme pour déterminer le tier
    const count = interactionCount.short;

    // Trouver le tier correspondant
    for (const tier of tiers) {
      if (count >= tier.minCount) {
        if (tier.maxCount === null || count <= tier.maxCount) {
          return tier.startNode;
        }
      }
    }

    // Fallback: utiliser "start"
    return "start";
  }

  /**
   * Évalue toutes les conditions (ET logique)
   */
  private async evaluateConditions(
    conditions: IDialogueCondition[],
    profileId: string,
    profile: any
  ): Promise<boolean> {
    if (conditions.length === 0) {
      return true;
    }

    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, profileId, profile);
      if (!result) {
        return false;
      }
    }

    return true;
  }

  /**
   * Évalue une seule condition
   */
  private async evaluateCondition(
    condition: IDialogueCondition,
    profileId: string,
    profile: any
  ): Promise<boolean> {
    try {
      switch (condition.type) {
        case "level_min":
          return profile.level >= (condition.value || 0);

        case "level_max":
          return profile.level <= (condition.value || 999);

        case "has_tag":
          if (!condition.tag) return false;
          return await GameplayTagManager.hasTag(profileId, condition.tag);

        case "has_all_tags":
          if (!condition.tags || condition.tags.length === 0) return false;
          return await GameplayTagManager.hasAllTags(profileId, condition.tags);

        case "has_any_tag":
          if (!condition.tags || condition.tags.length === 0) return false;
          return await GameplayTagManager.hasAnyTag(profileId, condition.tags);

        case "has_tag_matching":
          if (!condition.tag) return false;
          return await GameplayTagManager.hasTagMatching(profileId, condition.tag);

        case "has_item":
          // PLACEHOLDER - Inventaire pas encore implémenté
          console.warn(`⚠️  [DialogueManager] Condition has_item non implémentée (itemId: ${condition.itemId})`);
          return true; // Toujours vrai pour l'instant

        case "quest_completed":
          // PLACEHOLDER - Quêtes pas encore implémentées
          console.warn(`⚠️  [DialogueManager] Condition quest_completed non implémentée (questId: ${condition.questId})`);
          return true; // Toujours vrai pour l'instant

        default:
          console.warn(`⚠️  [DialogueManager] Type de condition inconnu: ${condition.type}`);
          return false;
      }
    } catch (err: any) {
      console.error(`❌ [DialogueManager] Erreur evaluateCondition:`, err.message);
      return false;
    }
  }

  /**
   * Filtre les choix selon leurs conditions
   */
  private async filterChoices(
    choices: IDialogueChoice[],
    profileId: string,
    profile: any
  ): Promise<IDialogueChoice[]> {
    const availableChoices: IDialogueChoice[] = [];

    for (const choice of choices) {
      // Si pas de conditions, le choix est disponible
      if (!choice.conditions || choice.conditions.length === 0) {
        availableChoices.push(choice);
        continue;
      }

      // Évaluer les conditions du choix
      const valid = await this.evaluateConditions(choice.conditions, profileId, profile);
      if (valid) {
        availableChoices.push(choice);
      }
    }

    return availableChoices;
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
    for (const action of actions) {
      await this.executeAction(action, client, profileId, profile);
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
    try {
      switch (action.type) {
        case "add_tag":
          if (!action.tag) break;
          await GameplayTagManager.addTag(profileId, action.tag);
          console.log(`🏷️  [DialogueManager] Tag ajouté: ${action.tag}`);
          break;

        case "remove_tag":
          if (!action.tag) break;
          await GameplayTagManager.removeTag(profileId, action.tag);
          console.log(`🗑️  [DialogueManager] Tag retiré: ${action.tag}`);
          break;

        case "give_xp":
          if (!action.amount) break;
          // TODO: Implémenter le système d'XP
          console.log(`⭐ [DialogueManager] XP donné: ${action.amount} (non implémenté)`);
          // profile.xp += action.amount;
          // await profile.save();
          client.send("xp_gained", { amount: action.amount });
          break;

        case "open_shop":
          if (!action.shopId) break;
          console.log(`🛒 [DialogueManager] Ouverture shop: ${action.shopId}`);
          client.send("shop_open", { shopId: action.shopId });
          break;

        case "give_item":
          // PLACEHOLDER - Inventaire pas encore implémenté
          console.warn(`⚠️  [DialogueManager] Action give_item non implémentée (itemId: ${action.itemId})`);
          break;

        case "learn_recipe":
          // PLACEHOLDER - Crafting pas encore implémenté
          console.warn(`⚠️  [DialogueManager] Action learn_recipe non implémentée (recipeId: ${action.recipeId})`);
          break;

        case "learn_skill":
          // PLACEHOLDER - Skills pas encore implémentés
          console.warn(`⚠️  [DialogueManager] Action learn_skill non implémentée (skillId: ${action.skillId})`);
          break;

        case "start_quest":
          // PLACEHOLDER - Quêtes pas encore implémentées
          console.warn(`⚠️  [DialogueManager] Action start_quest non implémentée (questId: ${action.questId})`);
          break;

        default:
          console.warn(`⚠️  [DialogueManager] Type d'action inconnu: ${action.type}`);
          break;
      }
    } catch (err: any) {
      console.error(`❌ [DialogueManager] Erreur executeAction:`, err.message);
    }
  }
}
