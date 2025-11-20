export interface SkillDefinition {
    id: string;                   // identifiant unique du skill
    name: string;                 // nom affiché
    icon?: string;                // optionnel pour le client

    // Type de skill
    effectType: "damage" | "aoe" | "heal" | "buff" | "projectile"; // <-- MODIFIÉ

    // Base numbers
    power: number;
    range: number;                // portée maximale
    radius?: number;              // AOE radius, si aoe

    // Casting
    castTime: number;             // ms
    globalCooldown?: number;      // ms, si non défini → 1000

    // Animation & lock
    animationLock?: number;       // ms d'animation lock
    lockType: "none" | "soft" | "full";

    // Buff
    buffId?: string;              // buff appliqué
    duration?: number;            // durée du buff en ms

    // Ressources
    manaCost?: number;
    energyCost?: number;

    // Cooldown
    cooldown: number;             // ms

    // Mode automatique ON/OFF
    autoCast?: boolean;
}
