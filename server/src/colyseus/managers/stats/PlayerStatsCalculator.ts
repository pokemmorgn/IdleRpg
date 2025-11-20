import { IClassStats } from "../../../models/ClassStats";
import { PlayerState } from "../../schema/PlayerState";
import {
  getRaceById,
  RaceConfig
} from "../../../config/races.config";
import {
  IPlayerPrimaryStats,
  IPlayerComputedStats
} from "../../../models/ServerProfile";

// =======================================================================
// FONCTIONS BONUS RACIAUX
// =======================================================================

/**
 * Applique les bonus raciaux sur les stats primaires
 */
function applyPrimaryRaceBonuses(
  primary: IPlayerPrimaryStats,
  race?: RaceConfig
): IPlayerPrimaryStats {
  if (!race || !race.statsModifiers?.primary) return primary;

  const result: IPlayerPrimaryStats = { ...primary };

  for (const [stat, value] of Object.entries(race.statsModifiers.primary)) {
    if (value === undefined) continue;

    // TS sait que 'stat' correspond à une clé valide de IPlayerPrimaryStats
    result[stat as keyof IPlayerPrimaryStats] += value;
  }

  return result;
}

/**
 * Applique les bonus raciaux sur les stats computed
 */
function applyComputedRaceBonuses(
  computed: IPlayerComputedStats,
  race?: RaceConfig
): IPlayerComputedStats {
  if (!race || !race.statsModifiers?.computed) return computed;

  const result: IPlayerComputedStats = { ...computed };

  for (const [stat, value] of Object.entries(race.statsModifiers.computed)) {
    if (value === undefined) continue;

    result[stat as keyof IPlayerComputedStats] += value;
  }

  return result;
}

// =======================================================================
// PLAYER STATS CALCULATOR
// =======================================================================

/**
 * PlayerStatsCalculator
 * ----------------------
 * Calcule les stats finales du joueur à partir :
 * - de sa classe (ClassStats)
 * - de son niveau
 * - de sa race (bonus raciaux)
 * 
 * ⚠️ IMPORTANT :
 * Pas encore de buffs, pas encore d'équipement.
 */
export class PlayerStatsCalculator {

  static compute(player: PlayerState, classStats: IClassStats) {

    const level = player.level;
    const race = getRaceById(player.race);

    // ============================
    // 1) STATS PRIMAIRES (BASE)
    // ============================
    let primaryStats: IPlayerPrimaryStats = {
      strength: classStats.baseStats.strength + classStats.statsPerLevel.strength * (level - 1),
      agility: classStats.baseStats.agility + classStats.statsPerLevel.agility * (level - 1),
      intelligence: classStats.baseStats.intelligence + classStats.statsPerLevel.intelligence * (level - 1),
      endurance: classStats.baseStats.endurance + classStats.statsPerLevel.endurance * (level - 1),
      spirit: classStats.baseStats.spirit + classStats.statsPerLevel.spirit * (level - 1)
    };

    // ============================
    // 1B) BONUS RACIAL PRIMAIRE
    // ============================
    primaryStats = applyPrimaryRaceBonuses(primaryStats, race);

    const STR = primaryStats.strength;
    const AGI = primaryStats.agility;
    const INT = primaryStats.intelligence;
    const END = primaryStats.endurance;
    const SPI = primaryStats.spirit;

    // ============================
    // 2) COMBAT DE BASE
    // ============================
    let computed: IPlayerComputedStats = {
      // Vie
      maxHp: 100 + END * 5,
      hp: 0, // sera remplacé à la fin

      // Ressource
      maxResource: 0,
      resource: 0,
      manaRegen: 0,
      rageRegen: 0,
      energyRegen: 0,

      // Combat
      attackPower: STR * 2,
      spellPower: INT * 2,
      attackSpeed: Math.max(
        0.3,
        (player.attackSpeed || 2.5) - AGI * 0.02
      ),

      // Critique
      criticalChance: AGI * 0.1,
      criticalDamage: 150,

      // Défense
      damageReduction: END * 0.5,
      armor: END,
      magicResistance: INT * 0.2,

      // Mobilité
      moveSpeed: classStats.baseMoveSpeed,

      // Stats avancées
      precision: 0,
      evasion: AGI * 0.5,
      penetration: 0,
      tenacity: 0,
      lifesteal: 0,
      spellPenetration: 0
    };

    // ============================
    // 3) RESSOURCE PAR TYPE
    // ============================
    switch (classStats.resourceType) {
      case "mana":
        computed.maxResource = 100 + INT * 5;
        computed.manaRegen = SPI * 2;
        break;

      case "rage":
        computed.maxResource = 100;
        computed.rageRegen = 0;
        break;

      case "energy":
        computed.maxResource = 100;
        computed.energyRegen = 10;
        break;
    }

    // ============================
    // 4) BONUS RACIAL (COMPUTED)
    // ============================
    computed = applyComputedRaceBonuses(computed, race);

    // ============================
    // 5) OUTPUT FINAL
    // ============================
    computed.hp = computed.maxHp;
    computed.resource = computed.maxResource;

    return computed;
  }
}
