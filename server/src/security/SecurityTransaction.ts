// server/src/security/SecurityTransaction.ts
import crypto from "crypto";

const SECRET = process.env.PX42_KEY || "MISSING_SECRET_KEY";

/**
 * Utility to create secure signed payloads for currency messages.
 * 
 * Clients (Unity / JS / mobile) MUST use this wrapper.
 */
export class SecurityTransaction {

    static wrap(data: any) {
        const payload = {
            timestamp: Date.now(),
            data
        };

        const signature = crypto
            .createHmac("sha256", SECRET)
            .update(JSON.stringify(payload))
            .digest("hex");

        return {
            signature,
            ...payload
        };
    }
}
