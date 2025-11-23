import { SecurityHMAC } from "./SecurityHMAC";
import { SecurityLogger } from "./SecurityLogger";

export class SecurityCore {

    static validateClientAction(player: any, clientData: any, signature: string): boolean {

        if (!signature) {
            SecurityLogger.block(player.playerId, "Missing signature", clientData);
            return false;
        }

        const valid = SecurityHMAC.verify(clientData, signature);

        if (!valid) {
            SecurityLogger.block(
                player.playerId,
                "Invalid HMAC signature → possible cheat attempt",
                clientData
            );
            return false;
        }

        return true;
    }

    static checkCurrencyRange(player: any, type: string, amount: number): boolean {

        if (amount < 0 || amount > 10_000_000) {
            SecurityLogger.warn(
                player.playerId,
                `Abnormal amount detected: ${amount} (${type})`,
                { type, amount }
            );
            return false;
        }

        return true;
    }
}
