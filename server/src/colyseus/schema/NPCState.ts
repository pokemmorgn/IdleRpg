import { Schema, type } from "@colyseus/schema";

/**
 * État d'un NPC dans le monde (synchronisé avec tous les clients)
 * Représente un NPC actif dans le WorldRoom
 */
export class NPCState extends Schema {
  @type("string") npcId: string = "";           // ID logique du NPC (ex: "npc_blacksmith_01")
  @type("string") name: string = "";            // Nom affiché
  @type("string") type: string = "";            // "quest_giver", "merchant", "dialogue", "hybrid"
  @type("number") level: number = 1;            // Niveau du NPC
  @type("string") faction: string = "";         // "AURION", "OMBRE", "NEUTRAL"
  
  // Position dans le monde
  @type("number") posX: number = 0;
  @type("number") posY: number = 0;
  @type("number") posZ: number = 0;
  
  // Rotation
  @type("number") rotX: number = 0;
  @type("number") rotY: number = 0;
  @type("number") rotZ: number = 0;
  
  // Référence modèle 3D Unity
  @type("string") modelId: string = "";
  
  // Fonctionnalités (références)
  @type("string") dialogueId: string = "";      // Peut être vide
  @type("string") shopId: string = "";          // Peut être vide
  // Note: questIds sera géré plus tard quand le système de quêtes sera implémenté
  
  // Interaction
  @type("number") interactionRadius: number = 3;
  
  // Status
  @type("boolean") isActive: boolean = true;
  
  constructor(
    npcId: string,
    name: string,
    type: string,
    level: number,
    faction: string,
    posX: number,
    posY: number,
    posZ: number,
    rotX: number,
    rotY: number,
    rotZ: number,
    modelId: string,
    dialogueId: string,
    shopId: string,
    interactionRadius: number,
    isActive: boolean
  ) {
    super();
    this.npcId = npcId;
    this.name = name;
    this.type = type;
    this.level = level;
    this.faction = faction;
    this.posX = posX;
    this.posY = posY;
    this.posZ = posZ;
    this.rotX = rotX;
    this.rotY = rotY;
    this.rotZ = rotZ;
    this.modelId = modelId;
    this.dialogueId = dialogueId || "";
    this.shopId = shopId || "";
    this.interactionRadius = interactionRadius;
    this.isActive = isActive;
  }
}
