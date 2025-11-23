// server/src/security/PlayerStateHasher.ts

import crypto from "crypto";

export class PlayerStateHasher {

    // ============================================================
    // 📌 Hash uniquement les champs critiques
    //   → hp, level, xp, gold, diamonds, cooldowns, stats, etc.
    // ============================================================
    static computeHash(player: any): string {

        const snapshot = {
            level: player.level,
            xp: player.xp,
            nextLevelXp: player.nextLevelXp,

            // stats vitales
            hp: player.hp,
            maxHp: player.maxHp,
            resource: player.resource,
            maxResource: player.maxResource,
            attackPower: player.attackPower,
            spellPower: player.spellPower,

            // currencies
            currencies: Object.fromEntries(player.currencies.values),

            // cooldowns
            cooldowns: Object.fromEntries(player.cooldowns),

            // buffs actifs
            buffs: Object.fromEntries(player.activeBuffs),

            // talents
            talents: Object.fromEntries(player.talents),
        };

        const json = JSON.stringify(snapshot);
        return crypto.createHash("sha256").update(json).digest("hex");
    }

    // ============================================================
    // 🔥 Vérifier une hash venant du client (optionnel)
    // ============================================================
    static verifyClientHash(player: any, clientHash: string): boolean {
        const expected = this.computeHash(player);
        return expected === clientHash;
    }
}
