export class SecurityLogger {

    static warn(playerId: string, message: string, context?: any) {
        console.warn(`🔐 [SECURITY WARNING] Player=${playerId} → ${message}`);
        if (context) console.warn("   Context:", context);
    }

    static block(playerId: string, message: string, context?: any) {
        console.error(`⛔ [SECURITY BLOCK] Player=${playerId} → ${message}`);
        if (context) console.error("   Context:", context);
    }
}
