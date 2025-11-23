import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const RAW_SECRET = process.env.PX42_KEY;
if (!RAW_SECRET) throw new Error("Missing PX42_KEY in .env");

const SECRET: string = RAW_SECRET; // <-- safe non-null

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
