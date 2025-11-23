// server/src/security/SecurityVerifier.ts

import crypto from "crypto";
import dotenv from "dotenv";
import { PlayerStateHasher } from "./PlayerStateHasher";

dotenv.config();

// =====================================
// 🔐 GLOBAL SECRET (HMAC)
// =====================================
const RAW_SECRET = process.env.PX42_KEY;
if (!RAW_SECRET) throw new Error("Missing PX42_KEY in .env");

const SECRET: string = RAW_SECRET;

// =====================================
// 🔐 NONCE STORAGE (ANTI-REPLAY)
// =====================================
const usedNonces = new Set<string>();

export class SecurityVerifier {

    // ============================================================
    // 📌 Generate server-side HMAC(signature)
    // ============================================================
    static generateSignature(payload: any, timestamp: number, nonce: string): string {
        const data = JSON.stringify(payload) + timestamp + nonce;
        return crypto
            .createHmac("sha256", SECRET)
            .update(data)
            .digest("hex");
    }

    // ============================================================
    // 🔥 Verify incoming client payload
    // ============================================================
    static verify(payload: any, player?: any): boolean {

        if (!payload) {
            console.warn("⛔ SECURITY: payload missing");
            return false;
        }

        const { data, timestamp, nonce, signature, expectedStateHash } = payload;

        // ------------------------------
        // 1) Check mandatory fields
        // ------------------------------
        if (!data || !timestamp || !nonce || !signature) {
            console.warn("⛔ SECURITY: missing fields", payload);
            return false;
        }

        // ------------------------------
        // 2) Anti replay: timestamp window
        // ------------------------------
        const now = Date.now();

        if (Math.abs(now - Number(timestamp)) > 5000) {
            console.warn("⛔ SECURITY: expired timestamp");
            return false;
        }

        // ------------------------------
        // 3) Anti replay: nonce must be unique
        // ------------------------------
        if (usedNonces.has(nonce)) {
            console.warn("⛔ SECURITY: NONCE REPLAY DETECTED");
            return false;
        }

        usedNonces.add(nonce);

        // cleanup old nonces
        if (usedNonces.size > 5000) {
            const arr = Array.from(usedNonces);
            usedNonces.clear();
            for (let i = arr.length - 2000; i < arr.length; i++) {
                if (arr[i]) usedNonces.add(arr[i]);
            }
        }

        // ------------------------------
        // 4) Verify HMAC signature
        // ------------------------------
        const expectedSignature = this.generateSignature(data, timestamp, nonce);

        if (signature !== expectedSignature) {
            console.warn("⛔ SECURITY: INVALID SIGNATURE");
            return false;
        }

        // ------------------------------
        // 5) OPTIONAL: compare client hash with server hash
        // ------------------------------
        if (player && expectedStateHash) {
            const serverHash = PlayerStateHasher.computeHash(player);

            if (serverHash !== expectedStateHash) {
                console.warn("⛔ SECURITY: STATE HASH MISMATCH — possible memory tampering", {
                    expectedStateHash,
                    serverHash
                });
                return false;
            }
        }

        // 🔒 Passed all verification
        return true;
    }
}
