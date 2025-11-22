/**
 * Script de seed des items pour l’inventaire
 * Usage : npx ts-node server/src/scripts/seed-items.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Item from "../models/Item";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/idlerpg";

// ===========================================
// 📌 1) ITEMS D’ÉQUIPEMENT
// ===========================================
const EQUIPMENT_SLOTS = [
  "head", "chest", "legs", "feet", "hands",
  "weapon", "offhand",
  "ring1", "ring2",
  "trinket1", "trinket2",
  "neck"
];

const EQUIPMENT_ITEMS = EQUIPMENT_SLOTS.map(slot => ({
  itemId: `eq_${slot}`,
  name: `Équipement ${slot}`,
  icon: `icons/${slot}.png`,
  type: "equipment",
  equipSlot: slot,
  stats: { hp: 5, attack: 1 }
}));

// ===========================================
// 📌 2) ITEMS “normaux”
// ===========================================
const NORMAL_ITEMS = [
  {
    itemId: "consum_hp_potion",
    name: "Potion de soin",
    type: "consumable",
    icon: "icons/potion_hp.png",
    effects: { hp: +50 },
    stackable: true,
    maxStack: 20
  },
  {
    itemId: "mat_iron_ore",
    name: "Minerai de fer",
    type: "material",
    icon: "icons/iron_ore.png",
    stackable: true,
    maxStack: 99
  },
  {
    itemId: "box_small_loot",
    name: "Petite lootbox",
    type: "container",
    icon: "icons/lootbox.png",
    rewards: [
      { itemId: "mat_iron_ore", min: 1, max: 3, weight: 70 },
      { itemId: "consum_hp_potion", min: 1, max: 1, weight: 30 }
    ]
  },
  {
    itemId: "quest_relic_piece",
    name: "Fragment de relique",
    type: "quest",
    icon: "icons/relic_piece.png",
    stackable: false
  },
  {
    itemId: "bag_upgrade_01",
    name: "Petit sac (+5 slots)",
    type: "consumable",
    icon: "icons/bag_upgrade.png",
    bagSizeIncrease: 5,
    stackable: false
  },
  {
    itemId: "shared_token",
    name: "Jeton partagé",
    type: "material",
    icon: "icons/token.png",
    shared: true,
    maxStack: 999
  }
];

// ===========================================
// 📌 3) ITEM PERSONNEL
// ===========================================
const PERSONAL_ITEM = {
  itemId: "personal_family_ring",
  name: "Bague Familiale",
  type: "quest",
  icon: "icons/family_ring.png",
  stackable: false,
  personalOnly: true // ⚠️ Non stocké en DB mais utile pour ton usage backend
};

// ===========================================
// 📌 LANCEMENT
// ===========================================

async function seedItems() {
  try {
    console.log("Connexion MongoDB...");
    await mongoose.connect(MONGO_URI);

    const ITEMS = [
      ...EQUIPMENT_ITEMS,
      ...NORMAL_ITEMS,
      PERSONAL_ITEM
    ];

    for (const item of ITEMS) {
      await Item.deleteOne({ itemId: item.itemId });
      await Item.create(item);
      console.log(`→ Item ${item.itemId} créé.`);
    }

    await mongoose.disconnect();
    console.log("🎉 Tous les items ont été créés !");
    process.exit(0);

  } catch (err) {
    console.error("❌ ERREUR:", err);
    process.exit(1);
  }
}

if (require.main === module) seedItems();
