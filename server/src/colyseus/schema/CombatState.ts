import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class CombatState extends Schema {

  @type("number") hp: number = 100;
  @type("number") maxHp: number = 100;

  @type("number") resource: number = 100;
  @type("number") maxResource: number = 100;

  @type("number") manaRegen: number = 0;
  @type("number") rageRegen: number = 0;
  @type("number") energyRegen: number = 0;

  @type("number") attackPower: number = 10;
  @type("number") spellPower: number = 10;
  @type("number") attackSpeed: number = 2.5;

  @type("number") criticalChance: number = 0;
  @type("number") criticalDamage: number = 150;

  @type("number") armor: number = 0;
  @type("number") magicResistance: number = 0;
  @type("number") penetration: number = 0;
  @type("number") spellPenetration: number = 0;

  @type("boolean") inCombat: boolean = false;
  @type("string") targetMonsterId: string = "";

  @type("number") gcdRemaining: number = 0;
  @type("number") autoAttackTimer: number = 0;

  @type({ map: "number" }) activeBuffs = new MapSchema<number>();
  @type({ map: "number" }) cooldowns = new MapSchema<number>();
}
