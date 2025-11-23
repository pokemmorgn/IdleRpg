import { PlayerState } from "../../schema/PlayerState";
import { getRaceById } from "../../../config/races.config";
import { IPlayerPrimaryStats, IPlayerComputedStats } from "../../../models/ServerProfile";
import { SkinManagerInstance } from "../SkinManager";
import { TitleManagerInstance } from "../TitleManager";
import { MountManagerInstance } from "../MountManager";
import ItemModel from "../../../models/Item";
import { getStatsForClass } from "../../../config/classes.config";

type BonusType = {
    primaryPercent?: Record<string, number>;
    computedPercent?: Record<string, number>;
};

export async function computeFullStats(player: PlayerState): Promise<IPlayerComputedStats> {

    const classStats = getStatsForClass(player.class);
    const level = player.level;

    // ==========================================================
    // 1) BONUS RACE + SKIN + TITLE + MOUNT
    // ==========================================================
    const race = getRaceById(player.race);
    const skinBonus: BonusType = SkinManagerInstance?.getSkinStatBonus(player) || {};
    const titleBonus: BonusType = TitleManagerInstance?.getTitleStatBonus(player) || {};
    const mountBonus: BonusType = MountManagerInstance?.getMountStatBonus(player) || {};

    const primaryPercent: Record<string, number> = {};
    const computedPercent: Record<string, number> = {};

    // --- Race PRIMARY %
    if (race?.statsModifiers?.primaryPercent) {
        for (const k in race.statsModifiers.primaryPercent) {
            primaryPercent[k] = (primaryPercent[k] || 0) + race.statsModifiers.primaryPercent[k];
        }
    }

    // --- Skin PRIMARY %
    if (skinBonus.primaryPercent) {
        for (const k in skinBonus.primaryPercent) {
            primaryPercent[k] = (primaryPercent[k] || 0) + skinBonus.primaryPercent[k];
        }
    }

    // --- Title PRIMARY %
    if (titleBonus.primaryPercent) {
        for (const k in titleBonus.primaryPercent) {
            primaryPercent[k] = (primaryPercent[k] || 0) + titleBonus.primaryPercent[k];
        }
    }

    // --- Mount PRIMARY %
    if (mountBonus.primaryPercent) {
        for (const k in mountBonus.primaryPercent) {
            primaryPercent[k] = (primaryPercent[k] || 0) + mountBonus.primaryPercent[k];
        }
    }

    // --- Race COMPUTED %
    if (race?.statsModifiers?.computedPercent) {
        for (const k in race.statsModifiers.computedPercent) {
            computedPercent[k] = (computedPercent[k] || 0) + race.statsModifiers.computedPercent[k];
        }
    }

    // --- Skin COMPUTED %
    if (skinBonus.computedPercent) {
        for (const k in skinBonus.computedPercent) {
            computedPercent[k] = (computedPercent[k] || 0) + skinBonus.computedPercent[k];
        }
    }

    // --- Title COMPUTED %
    if (titleBonus.computedPercent) {
        for (const k in titleBonus.computedPercent) {
            computedPercent[k] = (computedPercent[k] || 0) + titleBonus.computedPercent[k];
        }
    }

    // --- Mount COMPUTED %
    if (mountBonus.computedPercent) {
        for (const k in mountBonus.computedPercent) {
            computedPercent[k] = (computedPercent[k] || 0) + mountBonus.computedPercent[k];
        }
    }

    // ==========================================================
    // 2) PRIMARY BASE (LEVEL SCALING)
    // ==========================================================
    let primary: IPlayerPrimaryStats = {
        strength: classStats.baseStats.strength + classStats.statsPerLevel.strength * (level - 1),
        agility: classStats.baseStats.agility + classStats.statsPerLevel.agility * (level - 1),
        intelligence: classStats.baseStats.intelligence + classStats.statsPerLevel.intelligence * (level - 1),
        endurance: classStats.baseStats.endurance + classStats.statsPerLevel.endurance * (level - 1),
        spirit: classStats.baseStats.spirit + classStats.statsPerLevel.spirit * (level - 1)
    };

    // ==========================================================
    // 3) PRIMARY BONUS FROM EQUIPMENT
    // ==========================================================
    for (const eq of player.inventory.equipment.values()) {
        if (!eq.itemId) continue;

        for (const key of ["strength", "agility", "intelligence", "endurance", "spirit"]) {
            if (eq.stats.has(key)) {
                const k = key as keyof IPlayerPrimaryStats;
                primary[k] += eq.stats.get(key)!;
            }
        }
    }

    // ==========================================================
    // 4) APPLY PRIMARY BONUS %
    // ==========================================================
    for (const [stat, percent] of Object.entries(primaryPercent)) {
        const k = stat as keyof IPlayerPrimaryStats;
        primary[k] = Math.floor(primary[k] * (1 + percent / 100));
    }

    // ==========================================================
    // 5) WEAPON ATTACK SPEED
    // ==========================================================
    let weaponSpeed = 2.5;

    for (const [slot, eq] of player.inventory.equipment.entries()) {
        if (slot === "weapon" && eq.itemId) {
            const model = await ItemModel.findOne({ itemId: eq.itemId });
            if (model?.stats?.attackSpeed) {
                weaponSpeed = model.stats.attackSpeed;
            }
        }
    }

    // ==========================================================
    // 6) COMPUTED BASE STATS
    // ==========================================================
    let computed: IPlayerComputedStats = {
        maxHp: 100 + primary.endurance * 5,
        hp: 0,

        maxResource: 0,
        resource: 0,
        manaRegen: 0,
        rageRegen: 0,
        energyRegen: 0,

        attackPower: primary.strength * 2,
        spellPower: primary.intelligence * 2,

        attackSpeed: weaponSpeed - primary.agility * 0.02,
        criticalChance: primary.agility * 0.1,
        criticalDamage: 150,

        damageReduction: primary.endurance * 0.5,
        armor: primary.endurance,
        magicResistance: primary.intelligence * 0.2,

        moveSpeed: classStats.baseMoveSpeed,

        precision: 0,
        evasion: primary.agility * 0.5,
        penetration: 0,
        tenacity: 0,
        lifesteal: 0,
        spellPenetration: 0
    };

    computed.attackSpeed = Math.max(0.3, computed.attackSpeed);

    // ==========================================================
    // 7) COMPUTED BONUS FROM EQUIPMENT
    // ==========================================================
    for (const eq of player.inventory.equipment.values()) {
        if (!eq.itemId) continue;

        for (const [key, value] of eq.stats.entries()) {
            if (["strength", "agility", "intelligence", "endurance", "spirit", "attackSpeed"].includes(key)) {
                continue;
            }

            const k = key as keyof IPlayerComputedStats;
            if (typeof computed[k] === "number") {
                computed[k] += value;
            }
        }
    }

    // ==========================================================
    // 8) APPLY COMPUTED BONUS %
    // ==========================================================
    for (const [stat, percent] of Object.entries(computedPercent)) {
        const k = stat as keyof IPlayerComputedStats;
        if (typeof computed[k] === "number") {
            computed[k] = Math.floor(computed[k] * (1 + percent / 100));
        }
    }

    // ==========================================================
    // 9) FINAL VALUES
    // ==========================================================
    computed.hp = computed.maxHp;
    computed.resource = computed.maxResource;

    return computed;
}
