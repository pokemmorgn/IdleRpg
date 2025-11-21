import { Schema, type } from "@colyseus/schema";

export class MonsterState extends Schema {
  @type("string") monsterId: string = "";
  @type("string") name: string = "";
  @type("string") type: string = "";
  @type("number") level: number = 1;
  
  // Stats de base
  @type("number") hp: number = 100;
  @type("number") maxHp: number = 100;
  @type("number") attack: number = 10;
  @type("number") defense: number = 5;
  @type("number") speed: number = 100;

  @type("string") zoneId: string = "";
  
  // Position actuelle
  @type("number") posX: number = 0;
  @type("number") posY: number = 0;
  @type("number") posZ: number = 0;

  // Position de spawn (référence)
  @type("number") spawnX: number = 0;
  @type("number") spawnY: number = 0;
  @type("number") spawnZ: number = 0;
  
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
  
  // COMBAT
  @type("number") attackTimer: number = 0;
  @type("number") respawnTimer: number = 0;
  @type("string") targetPlayerId: string = "";
  @type("boolean") isDead: boolean = false;
  
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

    this.maxHp = maxHp;
    this.attack = attack;
    this.defense = defense;
    this.speed = speed;

    this.zoneId = zoneId;

    this.posX = posX;
    this.posY = posY;
    this.posZ = posZ;

    // 🔥 Enregistre le point de spawn NOUVEAU
    this.spawnX = posX;
    this.spawnY = posY;
    this.spawnZ = posZ;

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

    // init HP
    this.setHp(hp);
  }

  setHp(value: number) {
    const wasAlive = this.isAlive;
    this.hp = Math.max(0, Math.min(value, this.maxHp));
    
    this.isAlive = this.hp > 0;
    this.isDead = !this.isAlive;

    if (wasAlive && this.isDead) {
        console.log(`[MonsterState] ${this.name} (${this.monsterId}) est mort.`);
    } else if (!wasAlive && this.isAlive) {
        console.log(`[MonsterState] ${this.name} (${this.monsterId}) a réapparu.`);
    }
  }

  get currentHp(): number {
    return this.hp;
  }
}
