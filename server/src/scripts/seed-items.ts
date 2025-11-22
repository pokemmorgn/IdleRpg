/**
 * Script de seed des items
 * Usage : npx ts-node server/src/scripts/seed-items.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Item from "../models/Item";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/idlerpg";

// =========================================================
// 📌 1) ITEMS D’ÉQUIPEMENT (12 slots)
// =========================================================
const EQUIPMENT_SLOTS = [
  "head", "chest", "legs", "feet", "hands",
  "weapon", "offhand",
  "ring1", "ring2",
  "trinket1", "trinket2",
  "neck"
] as const;

// Base stat par slot (compatible computeFullStats)
const EQUIPMENT_BASE_STATS: Record<string, Record<string, number>> = {
  head:      { endurance: 2, armor: 2 },
  chest:     { endurance: 4, armor: 4 },
  legs:      { endurance: 3, armor: 3 },
  feet:      { agility:  1, moveSpeed: 0.1 },
  hands:     { strength: 2, attackPower: 2 },
  weapon:    { strength: 4, attackPower: 4 },
  offhand:   { magicResistance: 1.5, endurance: 1 },
  ring1:     { spirit: 2 },
  ring2:     { spirit: 2 },
  trinket1:  { intelligence: 2, spellPower: 2 },
  trinket2:  { intelligence: 2, spellPower: 2 },
  neck:      { endurance: 1, spirit: 1 }
};

// Génération automatique
const EQUIPMENT_ITEMS = EQUIPMENT_SLOTS.map(slot => ({
  itemId: `eq_${slot}`,
  name: `Équipement ${slot}`,
  icon: `icons/${slot}.png`,
  type: "equipment",
  equipSlot: slot,
  stackable: false,
  stats: EQUIPMENT_BASE_STATS[slot] || {}
}));

// =========================================================
// 📌 2) ITEMS “normaux”
// =========================================================
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

// =========================================================
// 📌 3) ITEM PERSONNEL
// =========================================================
const PERSONAL_ITEM = {
  itemId: "personal_family_ring",
  name: "Bague Familiale",
  type: "quest",
  icon: "icons/family_ring.png",
  personal: true,     // ✔ conforme InventoryManager
  stackable: false
};

// =========================================================
// 📌 SEED
// =========================================================
async function seedItems() {
  try {
    console.log("Connexion MongoDB…");
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
