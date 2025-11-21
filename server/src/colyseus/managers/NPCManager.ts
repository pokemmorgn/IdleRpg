// server/src/colyseus/managers/NPCManager.ts
import { Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { NPCState } from "../schema/NPCState";

import NPC from "../../models/NPC";

import { DialogueManager } from "./DialogueManager";
import { QuestManager } from "./QuestManager";
import { QuestObjectiveManager } from "./QuestObjectiveManager";

/**
 * NPCManager - Gère tous les NPC d'un serveur
 * Connecté aux systèmes :
 *  - DialogueManager (dialogues)
 *  - QuestManager (accepter/afficher/rendre quêtes)
 *  - QuestObjectiveManager (TALK objective)
 */
export class NPCManager {
  private serverId: string;
  private gameState: GameState;

  private dialogueManager: DialogueManager;
  private questManager: QuestManager;
  private questObjectiveManager: QuestObjectiveManager;

  constructor(
    serverId: string,
    gameState: GameState,
    questManager: QuestManager,
    questObjectiveManager: QuestObjectiveManager
  ) {
    this.serverId = serverId;
    this.gameState = gameState;

    this.questManager = questManager;
    this.questObjectiveManager = questObjectiveManager;

    // On injecte QuestObjectiveManager, QuestManager et GameState dans DialogueManager
    this.dialogueManager = new DialogueManager(
      serverId, 
      questObjectiveManager,
      questManager,
      gameState
    );
  }

  /**
   * Charge tous les NPC actifs du serveur depuis MongoDB
   */
  async loadNPCs(zoneId?: string): Promise<void> {
    try {
      console.log(`📂 [NPCManager] Chargement des NPC pour ${this.serverId}...`);

      const filter: any = { 
        serverId: this.serverId, 
        isActive: true 
      };

      if (zoneId) {
        filter.zoneId = zoneId;
        console.log(`🗺️  [NPCManager] Filtrage par zone: ${zoneId}`);
      }

      const npcs = await NPC.find(filter);

      console.log(`✅ [NPCManager] ${npcs.length} NPC trouvé(s)`);

      for (const npc of npcs) {
        const npcState = new NPCState(
          npc.npcId,
          npc.name,
          npc.type,
          npc.level,
          npc.faction,
          npc.zoneId || "",
          npc.position.x,
          npc.position.y,
          npc.position.z,
          npc.rotation.x,
          npc.rotation.y,
          npc.rotation.z,
          npc.modelId,
          npc.dialogueId || "",
          npc.shopId || "",
          npc.interactionRadius,
          npc.isActive
        );

        this.gameState.addNPC(npcState);
      }

      console.log(`🤖 [NPCManager] Tous les NPC ont été chargés dans GameState`);

    } catch (err: any) {
      console.error(`❌ [NPCManager] Erreur lors du chargement des NPC:`, err.message);
    }
  }

  /**
   * Interaction du joueur avec un NPC
   */
  handleInteraction(client: Client, playerState: PlayerState, message: any): void {
    const { npcId } = message;

    if (!npcId) {
      client.send("error", { message: "NPC ID missing" });
      return;
    }

    const npc = this.gameState.npcs.get(npcId);
    
    if (!npc) {
      client.send("error", { message: `NPC ${npcId} not found` });
      return;
    }

    if (!npc.isActive) {
      client.send("error", { message: `NPC ${npcId} is not active` });
      return;
    }

    console.log(`💬 [NPCManager] ${playerState.characterName} interagit avec ${npc.name} (${npc.type})`);

    this.sendInteractionResponse(client, playerState, npc);
  }

  /**
   * Détermine le type d'interaction (dialogue / boutique / quêtes)
   */
  private sendInteractionResponse(client: Client, playerState: PlayerState, npc: NPCState): void {

    // Dialogue → priorité
    if (npc.dialogueId && 
      (npc.type === "dialogue" || npc.type === "quest_giver" || npc.type === "hybrid")) 
    {
      this.dialogueManager.startDialogue(client, playerState, npc.npcId, npc.dialogueId);
      return;
    }

    // Boutique
    if ((npc.type === "merchant" || npc.type === "hybrid") && npc.shopId) {
      client.send("npc_shop_open", {
        npcId: npc.npcId,
        npcName: npc.name,
        shopId: npc.shopId
      });
      return;
    }

    // NPC donneur de quêtes
    if (npc.type === "quest_giver" || npc.type === "hybrid") {

      const availableQuests = this.questManager.getAvailableQuestsForNPC(
        npc.npcId,
        playerState
      );

      // NOUVEAU: Récupérer les quêtes prêtes à être rendues
      const completableQuests = this.questManager.getCompletableQuestsForNPC(
        npc.npcId,
        playerState
      );

      // MODIFIÉ: On envoie les deux listes
      client.send("npc_quests", {
        npcId: npc.npcId,
        npcName: npc.name,
        availableQuests: availableQuests.map(q => ({
          questId: q.questId,
          name: q.name,
          description: q.description,
          type: q.type,
          requiredLevel: q.requiredLevel,
          rewards: q.rewards
        })),
      completableQuests: completableQuests.map((q: IQuest) => ({ // On ajoute le type IQuest
        questId: q.questId,
        name: q.name,
        rewards: q.rewards
      }))
      });

      return;
    }

    client.send("error", { message: "NPC has no interaction configured" });
  }

  /**
   * Acceptation d'une quête par le joueur
   */
  handleAcceptQuest(client: Client, playerState: PlayerState, message: any): void {
    const { questId, npcId } = message;

    if (!questId || !npcId) {
      client.send("error", { message: "Missing questId or npcId" });
      return;
    }

    const success = this.questManager.acceptQuest(client, playerState, questId);

    if (success) {
      console.log(`📘 [NPCManager] Quête ${questId} acceptée par ${playerState.characterName}`);
    }
  }

  /**
   * NOUVEAU: Rendre une quête par le joueur
   */
  handleTurnInQuest(client: Client, playerState: PlayerState, message: any): void {
    const { questId, npcId } = message;

    if (!questId || !npcId) {
      client.send("error", { message: "Missing questId or npcId" });
      return;
    }

    // Le QuestManager se chargera de valider que la quête est bien complétée
    // et que le PNJ est le bon (si nécessaire)
    this.questManager.turnInQuest(client, playerState, questId);

    console.log(`🏁 [NPCManager] Tentative de rendre la quête ${questId} par ${playerState.characterName}`);
  }

  /**
   * Gestion des choix de dialogue
   */
  handleDialogueChoice(
    client: Client,
    playerState: PlayerState,
    message: any
  ): void {
    const { dialogueId, currentNodeId, choiceIndex, npcId } = message;

    if (!dialogueId || currentNodeId === undefined || choiceIndex === undefined) {
      client.send("error", { message: "Missing dialogue parameters" });
      return;
    }

    this.dialogueManager.handleDialogueChoice(
      client,
      playerState,
      dialogueId,
      currentNodeId,
      choiceIndex,
      npcId
    );
  }
}
