import { Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { NPCState } from "../schema/NPCState";
import NPC from "../../models/NPC";
import { DialogueManager } from "./DialogueManager";

/**
 * NPCManager - Gère tous les NPC d'un serveur
 * Responsabilités :
 * - Charger les NPC depuis MongoDB
 * - Ajouter/Retirer des NPC du GameState
 * - Gérer les interactions joueur → NPC
 * - Déléguer les dialogues au DialogueManager
 * - Vérifier les distances d'interaction
 * - Filtrer par zone (optionnel)
 */
export class NPCManager {
  private serverId: string;
  private gameState: GameState;
  private dialogueManager: DialogueManager;

  constructor(serverId: string, gameState: GameState) {
    this.serverId = serverId;
    this.gameState = gameState;
    this.dialogueManager = new DialogueManager(serverId);
  }

  /**
   * Charge tous les NPC actifs du serveur depuis MongoDB
   * Optionnel : filtrer par zone
   */
  async loadNPCs(zoneId?: string): Promise<void> {
    try {
      console.log(`📂 [NPCManager] Chargement des NPC pour ${this.serverId}...`);

      // Filtre optionnel par zone
      const filter: any = { 
        serverId: this.serverId, 
        isActive: true 
      };
      
      if (zoneId) {
        filter.zoneId = zoneId;
        console.log(`🗺️  [NPCManager] Filtrage par zone: ${zoneId}`);
      }

      // Récupérer les NPC depuis MongoDB
      const npcs = await NPC.find(filter);

      console.log(`✅ [NPCManager] ${npcs.length} NPC trouvé(s) pour ${this.serverId}`);

      // Ajouter chaque NPC au GameState
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
   * Recharge les NPC depuis MongoDB (utile si un NPC est créé/modifié via l'API)
   */
  async reloadNPCs(zoneId?: string): Promise<void> {
    try {
      console.log(`🔄 [NPCManager] Rechargement des NPC pour ${this.serverId}...`);

      // Vider les NPC actuels
      const currentNPCIds = Array.from(this.gameState.npcs.keys());
      for (const npcId of currentNPCIds) {
        this.gameState.removeNPC(npcId);
      }

      // Recharger depuis MongoDB
      await this.loadNPCs(zoneId);

      console.log(`✅ [NPCManager] NPC rechargés`);

    } catch (err: any) {
      console.error(`❌ [NPCManager] Erreur lors du rechargement des NPC:`, err.message);
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

    // Vérifier que le NPC existe
    const npc = this.gameState.npcs.get(npcId);
    
    if (!npc) {
      client.send("error", { message: `NPC ${npcId} not found` });
      console.log(`⚠️  [NPCManager] ${playerState.characterName} tente d'interagir avec NPC inexistant: ${npcId}`);
      return;
    }

    // Vérifier que le NPC est actif
    if (!npc.isActive) {
      client.send("error", { message: `NPC ${npcId} is not active` });
      console.log(`⚠️  [NPCManager] ${playerState.characterName} tente d'interagir avec NPC inactif: ${npcId}`);
      return;
    }

    // TODO: Vérifier la distance (interactionRadius)
    // Pour l'instant, on accepte toutes les interactions
    // const distance = this.calculateDistance(playerPosition, npcPosition);
    // if (distance > npc.interactionRadius) { ... }

    console.log(`💬 [NPCManager] ${playerState.characterName} interagit avec ${npc.name} (${npc.type})`);

    // Répondre selon le type de NPC
    this.sendInteractionResponse(client, playerState, npc);
  }

  /**
   * Envoie la réponse d'interaction selon le type de NPC
   */
  private sendInteractionResponse(client: Client, playerState: PlayerState, npc: NPCState): void {
    // Dialogue (tous les types peuvent avoir un dialogue)
    if (npc.dialogueId && (npc.type === "dialogue" || npc.type === "quest_giver" || npc.type === "hybrid")) {
      // Démarrer le dialogue via le DialogueManager
      this.dialogueManager.startDialogue(
        client,
        playerState,
        npc.npcId,
        npc.dialogueId
      );
      return;
    }

    // Merchant / Shop (si pas de dialogue)
    if ((npc.type === "merchant" || npc.type === "hybrid") && npc.shopId) {
      client.send("npc_shop_open", {
        npcId: npc.npcId,
        npcName: npc.name,
        shopId: npc.shopId
      });
      return;
    }

    // Quest Giver (si pas de dialogue)
    if (npc.type === "quest_giver" || npc.type === "hybrid") {
      // TODO: Charger les quêtes disponibles depuis la DB
      client.send("npc_quests", {
        npcId: npc.npcId,
        npcName: npc.name,
        questIds: [] // Vide pour l'instant
      });
      return;
    }

    // Fallback : NPC sans interaction
    client.send("error", { message: "NPC has no interaction configured" });
  }

  /**
   * Gère le choix d'un joueur dans un dialogue
   */
  handleDialogueChoice(client: Client, playerState: PlayerState, message: any): void {
    const { dialogueId, nodeId, choiceIndex } = message;

    if (!dialogueId || !nodeId || choiceIndex === undefined) {
      client.send("error", { message: "Missing dialogue choice parameters" });
      return;
    }

    console.log(`💬 [NPCManager] ${playerState.characterName} fait un choix dans ${dialogueId}`);

    // Déléguer au DialogueManager
    this.dialogueManager.handleDialogueChoice(
      client,
      playerState,
      dialogueId,
      nodeId,
      choiceIndex
    );
  }

  /**
   * Calcule la distance entre deux positions (à implémenter plus tard)
   */
  private calculateDistance(
    pos1: { x: number; y: number; z: number },
    pos2: { x: number; y: number; z: number }
  ): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const dz = pos2.z - pos1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Récupère un NPC par son ID
   */
  getNPC(npcId: string): NPCState | undefined {
    return this.gameState.npcs.get(npcId);
  }

  /**
   * Récupère tous les NPC d'un certain type
   */
  getNPCsByType(type: string): NPCState[] {
    const npcs: NPCState[] = [];
    
    this.gameState.npcs.forEach((npc) => {
      if (npc.type === type) {
        npcs.push(npc);
      }
    });
    
    return npcs;
  }

  /**
   * Récupère tous les NPC d'une faction
   */
  getNPCsByFaction(faction: string): NPCState[] {
    const npcs: NPCState[] = [];
    
    this.gameState.npcs.forEach((npc) => {
      if (npc.faction === faction) {
        npcs.push(npc);
      }
    });
    
    return npcs;
  }

  /**
   * Récupère tous les NPC d'une zone spécifique
   */
  getNPCsByZone(zoneId: string): NPCState[] {
    const npcs: NPCState[] = [];
    
    this.gameState.npcs.forEach((npc) => {
      if (npc.zoneId === zoneId) {
        npcs.push(npc);
      }
    });
    
    return npcs;
  }

  /**
   * Compte le nombre total de NPC chargés
   */
  getNPCCount(): number {
    return this.gameState.npcs.size;
  }

  /**
   * Compte le nombre de NPC dans une zone spécifique
   */
  getNPCCountByZone(zoneId: string): number {
    let count = 0;
    
    this.gameState.npcs.forEach((npc) => {
      if (npc.zoneId === zoneId) {
        count++;
      }
    });
    
    return count;
  }
}
