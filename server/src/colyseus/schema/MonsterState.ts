import { Schema, type } from "@colyseus/schema";

export class MonsterState extends Schema {
  @type("string") monsterId: string = "";
  @type("string") name: string = "";
  @type("string") type: string = "";
  @type("number") level: number = 1;
  
  @type("number") hp: number = 100;
  @type("number") maxHp: number = 100;
  @type("number") attack: number = 10;
  @type("number") defense: number = 5;
  @type("number") speed: number = 100;
  
  @type("string") zoneId: string = "";
  
  @type("number") posX: number = 0;
  @type("number") posY: number = 0;
  @type("number") posZ: number = 0;
  
  @type("number") rotX: number = 0;
  @type("number") rotY: number = 0;
  @type("number") rotZ: number = 0;
  
  @type("string") behaviorType: string = "";
  @type("number") aggroRange: number = 10;
  @type("number") leashRange: number = 30;
  @type("number") attackRange: number = 2;
  
  @type("number") xpReward: number = 10;
  @type("number") respawnTime: number = 30;
  @type("boolean") respawnOnDeath: boolean = true;
  
  @type("string") modelId: string = "";
  @type("boolean") isActive: boolean = true;
  @type("boolean") isAlive: boolean = true;
  
  constructor(
    monsterId: string,
    name: string,
    type: string,
    level: number,
    hp: number,
    maxHp: number,
    attack: number,
    defense: number,
    speed: number,
    zoneId: string,
    posX: number,
    posY: number,
    posZ: number,
    rotX: number,
    rotY: number,
    rotZ: number,
    behaviorType: string,
    aggroRange: number,
    leashRange: number,
    attackRange: number,
    xpReward: number,
    respawnTime: number,
    respawnOnDeath: boolean,
    modelId: string,
    isActive: boolean
  ) {
    super();
    this.monsterId = monsterId;
    this.name = name;
    this.type = type;
    this.level = level;
    this.hp = hp;
    this.maxHp = maxHp;
    this.attack = attack;
    this.defense = defense;
    this.speed = speed;
    this.zoneId = zoneId || "";
    this.posX = posX;
    this.posY = posY;
    this.posZ = posZ;
    this.rotX = rotX;
    this.rotY = rotY;
    this.rotZ = rotZ;
    this.behaviorType = behaviorType;
    this.aggroRange = aggroRange;
    this.leashRange = leashRange;
    this.attackRange = attackRange;
    this.xpReward = xpReward;
    this.respawnTime = respawnTime;
    this.respawnOnDeath = respawnOnDeath;
    this.modelId = modelId;
    this.isActive = isActive;
    this.isAlive = true;
  }
}
