import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const SECRET = process.env.PX42_KEY;
if (!SECRET) throw new Error("Missing PX42_KEY in .env");

/**
 * This function is used ONLY by trusted server-side test scripts,
 * NOT by players nor clients (Unity/web/mobile).
 * 
 * It wraps data in a secure signed envelope compatible with SecurityVerifier.
 */
export class SecurityTransaction {

    static wrap(data: any) {

        const timestamp = Date.now();
        const nonce = crypto.randomBytes(16).toString("hex");

        const raw = JSON.stringify(data) + timestamp + nonce;
        const signature = crypto.createHmac("sha256", SECRET)
            .update(raw)
            .digest("hex");

        return {
            data,
            timestamp,
            nonce,
            signature
        };
    }
}
