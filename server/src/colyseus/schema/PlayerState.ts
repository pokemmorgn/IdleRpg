// server/src/colyseus/schema/PlayerState.ts
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { QuestState } from "./QuestState";
import { SkinState } from "./SkinState";
import { QuestObjectiveMap } from "./QuestObjectiveMap";

/**
 * État d'un joueur connecté + stats synchronisées.
 */
export class PlayerState extends Schema {

  // ===== IDENTITÉ =====
  @type("string") sessionId: string = "";
  @type("string") playerId: string = "";
  @type("string") profileId: string = "";
  @type("number") characterSlot: number = 1;

  // ===== INFO =====
  @type("string") characterName: string = "";
  @type("number") level: number = 1;
  @type("string") class: string = "";
  @type("string") race: string = "";
  @type(SkinState)
  skins: SkinState = new SkinState();

  // ===== CONNEXION =====
  @type("number") connectedAt: number = 0;
  @type("number") lastActivity: number = 0;

  // ===== VIE =====
  @type("number") hp: number = 100;
  @type("number") maxHp: number = 100;

  // ===== RESSOURCE =====
  @type("number") resource: number = 100;
  @type("number") maxResource: number = 100;
  @type("number") manaRegen: number = 0;
  @type("number") rageRegen: number = 0;
  @type("number") energyRegen: number = 0;

  // ===== COMBAT BASE =====
  @type("number") attackPower: number = 10;
  @type("number") spellPower: number = 10;
  @type("number") attackSpeed: number = 2.5;

  @type("number") criticalChance: number = 0;
  @type("number") criticalDamage: number = 150;

  @type("number") damageReduction: number = 0;
  @type("number") armor: number = 0;
  @type("number") magicResistance: number = 0;
  @type("number") penetration: number = 0;
  @type("number") spellPenetration: number = 0;
  @type("number") precision: number = 0;
  @type("number") evasion: number = 0;
  @type("number") tenacity: number = 0;
  @type("number") lifesteal: number = 0;

  // ===== COMBAT =====
  @type("boolean") inCombat: boolean = false;
  @type("string") targetMonsterId: string = "";
  @type("string") lastAttackerId: string = "";

  @type("number") attackTimer: number = 0;
  @type("number") gcdRemaining: number = 0;
  @type("number") autoAttackTimer: number = 0;
  @type("number") castLockRemaining: number = 0;
  @type("number") animationLockRemaining: number = 0;

  @type("string") currentCastingSkillId: string = "";
  @type("string") currentAnimationLockType: string = "none";

  @type({ map: "number" }) cooldowns = new MapSchema<number>();
  @type({ map: "number" }) activeBuffs = new MapSchema<number>();

  @type(["string"]) skillBar = new ArraySchema<string>();
  @type({ map: "json" }) skills = new MapSchema<any>();
  @type("string") queuedSkill: string = "";

  // ===== MOUVEMENT =====
  @type("string") zoneId: string = "default";
  @type("number") posX: number = 0;
  @type("number") posY: number = 0;
  @type("number") posZ: number = 0;

  @type("number") lastMovementTime: number = 0;

  // ===== AFK =====
  @type("number") afkRefX: number = 0;
  @type("number") afkRefY: number = 0;
  @type("number") afkRefZ: number = 0;

  @type("boolean") isAFK: boolean = false;
  @type("boolean") isDead: boolean = false;
  @type("number") deathTimer: number = 0;

  @type("number") lastAFKCombatCheck: number = 0;

  // ===== QUÊTES =====
  @type(QuestState) quests: QuestState = new QuestState();

  // ===== CONSOMMABLES =====
  @type("number") potionHP: number = 10;
  @type("number") food: number = 20;

  constructor(
    sessionId: string,
    playerId: string,
    profileId: string,
    characterSlot: number,
    characterName: string,
    level: number,
    characterClass: string,
    characterRace: string
  ) {
    super();
    this.sessionId = sessionId;
    this.playerId = playerId;
    this.profileId = profileId;
    this.characterSlot = characterSlot;
    this.characterName = characterName;
    this.level = level;
    this.class = characterClass;
    this.race = characterRace;
    this.connectedAt = Date.now();
    this.lastActivity = Date.now();
  }

  // ===========================================================
  // COMBAT UPDATE
  // ===========================================================
  updateCombatTimers(dt: number) {
    if (this.isDead || this.isAFK) return;

    if (this.gcdRemaining > 0)
      this.gcdRemaining = Math.max(0, this.gcdRemaining - dt);

    if (this.castLockRemaining > 0) {
      this.castLockRemaining = Math.max(0, this.castLockRemaining - dt);
      if (this.castLockRemaining === 0) this.currentCastingSkillId = "";
    }

    if (this.animationLockRemaining > 0) {
      this.animationLockRemaining = Math.max(0, this.animationLockRemaining - dt);
      if (this.animationLockRemaining === 0) this.currentAnimationLockType = "none";
    }

    if (this.autoAttackTimer < this.attackSpeed * 1000)
      this.autoAttackTimer += dt;
  }

  // ===========================================================
  // LOAD STATS
  // ===========================================================
  loadStatsFromProfile(stats: any) {
    if (!stats) return;

    this.hp = stats.hp;
    this.maxHp = stats.maxHp;

    this.resource = stats.resource;
    this.maxResource = stats.maxResource;

    this.manaRegen = stats.manaRegen;
    this.rageRegen = stats.rageRegen;
    this.energyRegen = stats.energyRegen;

    this.attackPower = stats.attackPower;
    this.spellPower = stats.spellPower;
    this.attackSpeed = stats.attackSpeed;

    this.criticalChance = stats.criticalChance;
    this.criticalDamage = stats.criticalDamage;

    this.damageReduction = stats.damageReduction;

    this.armor = stats.armor;
    this.magicResistance = stats.magicResistance;
    this.precision = stats.precision;
    this.evasion = stats.evasion;
    this.penetration = stats.penetration;
    this.tenacity = stats.tenacity;
    this.lifesteal = stats.lifesteal;
    this.spellPenetration = stats.spellPenetration;
  }

  // ===========================================================
  // LOAD QUESTS
  // ===========================================================
  loadQuestsFromProfile(questData: any): void {

    if (!questData) {
      this.quests = new QuestState();
      return;
    }

    this.quests = new QuestState();

    // LISTS
    questData.completed?.forEach((id: string) =>
      this.quests.completed.push(id)
    );

    this.quests.activeMain = questData.activeMain || "";
    this.quests.activeSecondary = questData.activeSecondary || "";

    questData.activeRepeatables?.forEach((id: string) =>
      this.quests.activeRepeatables.push(id)
    );

    // MAPS
    Object.entries(questData.questStep || {}).forEach(([k, v]) =>
      this.quests.questStep.set(k, v as number)
    );

    Object.entries(questData.questStartedAt || {}).forEach(([k, v]) =>
      this.quests.questStartedAt.set(k, v as number)
    );

    Object.entries(questData.dailyCooldown || {}).forEach(([k, v]) =>
      this.quests.dailyCooldown.set(k, v as number)
    );

    Object.entries(questData.weeklyCooldown || {}).forEach(([k, v]) =>
      this.quests.weeklyCooldown.set(k, v as number)
    );

    // OBJECTIVES MAP
    Object.entries(questData.questObjectives || {}).forEach(([questId, raw]) => {
      
      const objMap = new QuestObjectiveMap();

      if (raw && typeof raw === "object") {
        Object.entries(raw as Record<string, number>).forEach(([objectiveId, count]) => {
          objMap.objectives.set(objectiveId, count ?? 0);
        });
      }

      this.quests.questObjectives.set(questId, objMap);
    });
  }

  // ===========================================================
  // SAVE QUESTS
  // ===========================================================
  saveQuestsToProfile(): any {
    return {
      completed: [...this.quests.completed],
      activeMain: this.quests.activeMain,
      activeSecondary: this.quests.activeSecondary,
      activeRepeatables: [...this.quests.activeRepeatables],

      questStep: Object.fromEntries(this.quests.questStep),
      questStartedAt: Object.fromEntries(this.quests.questStartedAt),

      questObjectives: Object.fromEntries(
        [...this.quests.questObjectives].map(([qid, objMap]) => [
          qid,
          Object.fromEntries(objMap.objectives)
        ])
      ),

      dailyCooldown: Object.fromEntries(this.quests.dailyCooldown),
      weeklyCooldown: Object.fromEntries(this.quests.weeklyCooldown),
    };
  }

  // ===========================================================
  // SAVE STATS
  // ===========================================================
  saveStatsToProfile(): any {
    return {
      hp: this.hp,
      maxHp: this.maxHp,
      resource: this.resource,
      maxResource: this.maxResource,
      manaRegen: this.manaRegen,
      rageRegen: this.rageRegen,
      energyRegen: this.energyRegen,
      attackPower: this.attackPower,
      spellPower: this.spellPower,
      attackSpeed: this.attackSpeed,
      criticalChance: this.criticalChance,
      criticalDamage: this.criticalDamage,
      damageReduction: this.damageReduction,
      armor: this.armor,
      magicResistance: this.magicResistance,
      precision: this.precision,
      evasion: this.evasion,
      penetration: this.penetration,
      tenacity: this.tenacity,
      lifesteal: this.lifesteal,
      spellPenetration: this.spellPenetration
    };
  }
}
