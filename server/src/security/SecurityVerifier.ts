import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const RAW_SECRET = process.env.PX42_KEY;
if (!RAW_SECRET) throw new Error("Missing PX42_KEY in .env");

const SECRET: string = RAW_SECRET; // <-- SAFE force string

const usedNonces = new Set<string>();

export class SecurityVerifier {

    static generateSignature(payload: any, timestamp: number, nonce: string): string {
        const data = JSON.stringify(payload) + timestamp + nonce;
        return crypto.createHmac("sha256", SECRET)
            .update(data)
            .digest("hex");
    }

    static verify(payload: any): boolean {

        if (!payload) return false;

        const { data, timestamp, nonce, signature } = payload;

        if (!data || !timestamp || !nonce || !signature) {
            console.warn("⛔ SECURITY: missing fields");
            return false;
        }

        const now = Date.now();
        if (Math.abs(now - Number(timestamp)) > 5000) {
            console.warn("⛔ SECURITY: expired timestamp");
            return false;
        }

        if (usedNonces.has(nonce)) {
            console.warn("⛔ SECURITY: NONCE REPLAY DETECTED");
            return false;
        }

        usedNonces.add(nonce);

        if (usedNonces.size > 5000) {
            const arr = Array.from(usedNonces);
            usedNonces.clear();
            for (let i = arr.length - 2000; i < arr.length; i++) {
                if (arr[i]) usedNonces.add(arr[i]);
            }
        }

        const expected = this.generateSignature(data, timestamp, nonce);

        if (signature !== expected) {
            console.warn("⛔ SECURITY: invalid signature");
            return false;
        }

        return true;
    }
}
