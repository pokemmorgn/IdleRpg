import { Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { NPCState } from "../schema/NPCState";
import NPC from "../../models/NPC";
import { DialogueManager } from "./DialogueManager";
import { QuestManager } from "./QuestManager";

/**
 * NPCManager - Gère tous les NPC d'un serveur
 */
export class NPCManager {
  private serverId: string;
  private gameState: GameState;
  private dialogueManager: DialogueManager;
  private questManager: QuestManager;

  constructor(serverId: string, gameState: GameState) {
    this.serverId = serverId;
    this.gameState = gameState;
    this.dialogueManager = new DialogueManager(serverId);
    this.questManager = new QuestManager(serverId, gameState);
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

      console.log(`✅ [NPCManager] ${npcs.length} NPC trouvé(s) pour ${this.serverId}`);

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

      console.log(`🤖 [NPCManager] ${npcs.length} NPC chargé(s) dans le GameState`);

    } catch (err: any) {
      console.error(`❌ [NPCManager] Erreur lors du chargement des NPC:`, err.message);
    }
  }

  /**
   * Gestion des interactions avec les NPC
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
   * Envoie la réponse d'interaction selon le type de NPC
   */
  private sendInteractionResponse(client: Client, playerState: PlayerState, npc: NPCState): void {

    // Dialogue (priorité)
    if (npc.dialogueId && 
      (npc.type === "dialogue" || npc.type === "quest_giver" || npc.type === "hybrid")) 
    {
      this.dialogueManager.startDialogue(client, playerState, npc.npcId, npc.dialogueId);
      return;
    }

    // Merchant
    if ((npc.type === "merchant" || npc.type === "hybrid") && npc.shopId) {
      client.send("npc_shop_open", {
        npcId: npc.npcId,
        npcName: npc.name,
        shopId: npc.shopId
      });
      return;
    }

    // Quest giver
    if (npc.type === "quest_giver" || npc.type === "hybrid") {

      const availableQuests = this.questManager.getAvailableQuestsForNPC(
        npc.npcId,
        playerState
      );

      client.send("npc_quests", {
        npcId: npc.npcId,
        npcName: npc.name,
        quests: availableQuests.map(q => ({
          questId: q.questId,
          name: q.name,
          description: q.description,
          type: q.type,
          requiredLevel: q.requiredLevel,
          rewards: q.rewards
        }))
      });

      return;
    }

    client.send("error", { message: "NPC has no interaction configured" });
  }

  /**
   * Appelé quand le client demande d’accepter une quête
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
}
