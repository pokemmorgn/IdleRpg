// server/src/security/SecurityVerifier.ts
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// =============================
// SECRET KEY FROM .env
// =============================
const SECRET = process.env.PX42_KEY;
if (!SECRET) throw new Error("Missing PX42_KEY in .env");

// =============================
// NONCE TRACKER (anti replay)
// =============================
const usedNonces = new Set<string>();

export class SecurityVerifier {

    // ========================================================
    // GENERATE HMAC SIGNATURE (SERVER SIDE, OPTIONAL)
    // ========================================================
    static generateSignature(payload: any, timestamp: number, nonce: string): string {
        const data = JSON.stringify(payload) + timestamp + nonce;
        return crypto.createHmac("sha256", SECRET).update(data).digest("hex");
    }

    // ========================================================
    // VERIFY CLIENT REQUEST
    // ========================================================
    static verify(payload: any): boolean {

        if (!payload) return false;

        const { data, timestamp, nonce, signature } = payload;

        // 1) Validate presence
        if (!data || !timestamp || !nonce || !signature) {
            console.warn("⛔ SECURITY: missing fields");
            return false;
        }

        // 2) Anti-replay timestamp (5 sec window)
        const now = Date.now();
        if (Math.abs(now - Number(timestamp)) > 5000) {
            console.warn("⛔ SECURITY: expired timestamp");
            return false;
        }

        // 3) Nonce must be unique
        if (usedNonces.has(nonce)) {
            console.warn("⛔ SECURITY: NONCE REPLAY DETECTED");
            return false;
        }
        usedNonces.add(nonce);

        // Cleanup old nonces every X entries
        if (usedNonces.size > 5000) {
            const arr = Array.from(usedNonces);
            usedNonces.clear();
            for (let i = arr.length - 2000; i < arr.length; i++) {
                if (arr[i]) usedNonces.add(arr[i]);
            }
        }

        // 4) Recompute HMAC
        const check = this.generateSignature(data, timestamp, nonce);

        if (check !== signature) {
            console.warn("⛔ SECURITY: INVALID SIGNATURE");
            return false;
        }

        // 🔒 All tests passed
        return true;
    }
}
