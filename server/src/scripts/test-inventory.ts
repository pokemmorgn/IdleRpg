/**
 * Script de test complet de l'inventaire & équipement
 * 
 * Usage : npx ts-node server/src/scripts/test-inventory.ts
 */

import dotenv from "dotenv";
import { Client } from "colyseus.js";

dotenv.config();

const WS_URL = process.env.TEST_WS_URL || "ws://localhost:2567";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  console.log("🔌 Tentative de connexion:", WS_URL);

  const client = new Client(WS_URL);

  // Connexion à la room world
  let room = await client.joinOrCreate("world", {
    token: "test_inventory_token"
  });

  console.log("🔌 CONNECTÉ AU SERVEUR !");

  // Listener global
  room.onMessage("*", (type, message) => {
    if (type === "stats_update") {
      console.log("📈 STATS UPDATE:", message);
    }
    else if (type === "inventory_update") {
      console.log("📦 INVENTORY:", message);
    }
    else if (type === "item_used") {
      console.log("🍺 CONSOMMABLE UTILISÉ:", message);
    }
    else {
      console.log("📩 MESSAGE:", type, message);
    }
  });

  function send(type: string, payload: any = {}) {
    console.log(`→ ${type}`, payload);
    room.send(type, payload);
  }

  await delay(500);

  // ============================================================
  // 1. Stats initiales
  // ============================================================
  console.log("\n📊 STATS INITIALES\n");

  // ============================================================
  // 2. Ajout des items
  // ============================================================
  console.log("\n🔥 AJOUT ITEMS (20 items)…\n");

  const EQUIP_ITEMS = [
    "eq_head", "eq_chest", "eq_legs", "eq_feet", "eq_hands",
    "eq_weapon", "eq_offhand", "eq_ring1", "eq_ring2",
    "eq_trinket1", "eq_trinket2", "eq_neck"
  ];

  for (const id of EQUIP_ITEMS) {
    send("inv_add", { itemId: id });
    await delay(200);
  }

  send("inv_add", { itemId: "consum_hp_potion" });
  await delay(200);
  send("inv_add", { itemId: "mat_iron_ore" });
  await delay(200);
  send("inv_add", { itemId: "box_small_loot" });
  await delay(200);
  send("inv_add", { itemId: "quest_relic_piece" });
  await delay(200);
  send("inv_add", { itemId: "bag_upgrade_01" });
  await delay(200);
  send("inv_add", { itemId: "shared_token" });
  await delay(200);
  send("inv_add_personal", { itemId: "personal_family_ring" });
  await delay(200);

  await delay(1000);
  console.log("\n📊 Stats après ajout objets\n");

  // ============================================================
  // 3. Équipement auto de TOUT
  // ============================================================
  console.log("\n🛡️ TEST ÉQUIPEMENT (AUTO)…\n");

  for (let slot = 0; slot < 12; slot++) {
    send("inv_equip", { fromSlot: slot });
    await delay(300);
  }

  await delay(1500);

  console.log("\n📊 Stats après équipement complet\n");

  // ============================================================
  // 4. Test lootbox
  // ============================================================
  console.log("\n🎁 TEST LOOTBOX\n");
  send("inv_open", { slot: 14 });
  await delay(1000);

  // ============================================================
  // 5. Test consommable
  // ============================================================
  console.log("\n🍺 TEST CONSOMMABLE\n");
  send("inv_use", { slot: 12 });
  await delay(1000);

  // ============================================================
  // 6. Déséquipement complet
  // ============================================================
  console.log("\n🔧 TEST DÉSÉQUIPEMENT COMPLET\n");

  for (const equipSlot of [
    "head", "chest", "legs", "feet", "hands",
    "weapon", "offhand", "ring1", "ring2",
    "trinket1", "trinket2", "neck"
  ]) {
    send("inv_unequip", { equipSlot });
    await delay(300);
  }

  await delay(1500);
  console.log("\n📊 Stats après déséquipement complet\n");

  // ============================================================
  // 7. Re-équipement
  // ============================================================
  console.log("\n🔄 TEST RÉ-ÉQUIPEMENT\n");

  for (let slot = 0; slot < 12; slot++) {
    send("inv_equip", { fromSlot: slot });
    await delay(250);
  }

  await delay(1500);
  console.log("\n📊 Stats après ré-équipement complet\n");

  // ============================================================
  // FIN
  // ============================================================
  console.log("\n✔ FIN DU SCRIPT — déconnexion…");
  room.leave();
  process.exit(0);

})();
