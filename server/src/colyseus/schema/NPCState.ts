import { Schema, type } from "@colyseus/schema";

export class NPCState extends Schema {
  @type("string") npcId: string = "";
  @type("string") name: string = "";
  @type("string") type: string = "";
  @type("number") level: number = 1;
  @type("string") faction: string = "";
  
  // Zone (optionnel)
  @type("string") zoneId: string = "";  // ← AJOUT (vide si null)
  
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
  
  // Fonctionnalités
  @type("string") dialogueId: string = "";
  @type("string") shopId: string = "";
  
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
    zoneId: string,  // ← AJOUT
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
    this.zoneId = zoneId || "";  // ← AJOUT
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
