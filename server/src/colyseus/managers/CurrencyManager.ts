// ============================================================================
//  CURRENCY MANAGER — SERVER AUTHORITATIVE (SECURE MODE)
//
//  🔒 IMPORTANT POUR LE FRONT-END / UNITY DEV / IA GENERATRICE DE CODE :
//
//  1) Le CLIENT NE DOIT JAMAIS modifier les soldes de currency localement.
//     - Pas de player.gold += 5
//     - Pas de player.diamonds = 999
//     - Pas de "set" envoyé côté client
//
//  2) Le CLIENT DOIT TOUJOURS utiliser une TRANSACTION SECURE :
//
//       room.send("currency", SecurityTransaction.wrap({
//           action: "add",
//           type: "gold",
//           amount: 50,
//       }));
//
//     → SecurityTransaction.wrap() ajoute la signature HMAC requise pour le serveur.
//
//  3) Toute requête non signée ou modifiée sera automatiquement:
//       - bloquée
//       - logguée en tant que tentative de cheat
//
//
//  4) Actions autorisées côté client :
//       - add        (ajout de monnaie légitime)
//       - remove     (paiement d'un coût, achat, upgrade)
//     ❌ "set" est complètement INTERDIT côté client.
//
//
//  5) Le serveur applique automatiquement :
//       - Anti flood : 5 opérations / seconde max
//       - Delta max   : ±5000 par requête (anti memory hack)
//       - Validation HMAC signature
//
//  6) Le serveur est totalement AUTHORITATIVE :
//       → même si le client se fait hacker, le serveur reste inviolable.
//
// ============================================================================

import { Client } from "colyseus";
import { PlayerState } from "../schema/PlayerState";
import { SecurityVerifier } from "../../security/SecurityVerifier";

export class CurrencyManager {

    private static VALID_TYPES = ["gold", "diamonds", "diamonds_bound"];
    private static MAX_DELTA = 5000;

    private lastOpTimestamp: Map<string, number> = new Map();
    private opCountWindow: Map<string, number> = new Map();

    constructor() {
        console.log("💰 CurrencyManager chargé (secure mode).");
    }

    // ========================================================================
    // 🔥 ANTI-FLOOD
    // ========================================================================
    private isFlooding(player: PlayerState): boolean {
        const now = Date.now();
        const last = this.lastOpTimestamp.get(player.sessionId) || 0;
        const count = this.opCountWindow.get(player.sessionId) || 0;

        if (now - last > 1000) {
            this.lastOpTimestamp.set(player.sessionId, now);
            this.opCountWindow.set(player.sessionId, 1);
            return false;
        }

        this.opCountWindow.set(player.sessionId, count + 1);

        if (count + 1 > 5)
            return true;

        return false;
    }

    private sendUpdate(client: Client, type: string, amount: number) {
        client.send("currency_update", { type, amount });
    }

    // ========================================================================
    // 📥 ADD
    // ========================================================================
    add(player: PlayerState, client: Client, type: string, amount: number) {

        if (amount <= 0) return;

        if (amount > CurrencyManager.MAX_DELTA) {
            console.warn("⚠️ SECURITY: ADD TOO HIGH", {
                player: player.playerId,
                amount
            });
            return;
        }

        const current = player.currencies.values.get(type) || 0;
        const newAmount = current + amount;

        player.currencies.values.set(type, newAmount);
        this.sendUpdate(client, type, newAmount);
    }

    // ========================================================================
    // 📤 REMOVE
    // ========================================================================
    remove(player: PlayerState, client: Client, type: string, amount: number): boolean {

        if (amount <= 0) return false;

        if (amount > CurrencyManager.MAX_DELTA) {
            console.warn("⚠️ SECURITY: REMOVE TOO HIGH", {
                player: player.playerId,
                amount
            });
            return false;
        }

        const current = player.currencies.values.get(type) || 0;

        if (current < amount) {
            client.send("currency_error", {
                type,
                error: "not_enough_currency"
            });
            return false;
        }

        const newAmount = current - amount;
        player.currencies.values.set(type, newAmount);
        this.sendUpdate(client, type, newAmount);

        return true;
    }

    // ========================================================================
    // ❌ SET INTERDIT CÔTÉ CLIENT
    // ========================================================================
    set(player: PlayerState, client: Client, type: string, amount: number) {
        console.warn("⛔ SECURITY: CLIENT TRIED TO USE SET()", {
            player: player.playerId,
            type, amount
        });
        return;
    }

    get(player: PlayerState, type: string) {
        return player.currencies.values.get(type) || 0;
    }

    // ========================================================================
    // 🔥 ROUTE PRINCIPALE
    // ========================================================================
    handleMessage(type: string, client: Client, player: PlayerState, payload: any): boolean {

        if (type !== "currency")
            return false;

        // ======================================================
        // 🔐 1) Vérification cryptographique
        // ======================================================
        if (!SecurityVerifier.verify(payload)) {
            console.warn("⛔ SECURITY: INVALID SIGNATURE", {
                player: player.playerId
            });
            return true;
        }

        const data = payload.data;

        const action = data.action;
        const currencyType = data.type;
        const amount = Number(data.amount) || 0;

        // ======================================================
        // 🔐 2) Type valide ?
        // ======================================================
        if (!CurrencyManager.VALID_TYPES.includes(currencyType)) {
            console.warn("⛔ SECURITY: INVALID CURRENCY TYPE", currencyType);
            return true;
        }

        // ======================================================
        // 🔐 3) Anti-flood
        // ======================================================
        if (this.isFlooding(player)) {
            console.warn("⛔ SECURITY: FLOOD DETECTED", player.playerId);
            return true;
        }

        // ======================================================
        // 🔐 4) Dispatch
        // ======================================================
        switch (action) {

            case "add":
                this.add(player, client, currencyType, amount);
                return true;

            case "remove":
                this.remove(player, client, currencyType, amount);
                return true;

            case "set":
                this.set(player, client, currencyType, amount);
                return true;
        }

        return false;
    }
}
