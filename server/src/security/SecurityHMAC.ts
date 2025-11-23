import crypto from "crypto";

export class SecurityHMAC {

    private static SECRET = process.env.PX42_KEY || "";

    static sign(data: any): string {
        const payload = JSON.stringify(data);
        return crypto
            .createHmac("sha256", SecurityHMAC.SECRET)
            .update(payload)
            .digest("hex");
    }

    static verify(data: any, signature: string): boolean {
        const expected = SecurityHMAC.sign(data);
        return expected === signature;
    }
}
