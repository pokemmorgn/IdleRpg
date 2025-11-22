/**
 * Script de seed des items pour l’inventaire
 * Usage : npx ts-node server/src/scripts/seed-items.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Item from "../models/Item";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/idlerpg";

// ============================================================
// 📌 CONFIG DES RARETÉS
// ============================================================
const RARITIES = {
  common:    { hp: 0,   primary: 1, computed: 1 },
  uncommon:  { hp: 5,   primary: 2, computed: 2 },
  rare:      { hp: 10,  primary: 3, computed: 3 },
  epic:      { hp: 20,  primary: 5, computed: 5 },
};

function applyRarity(baseStats: any, rarity: keyof typeof RARITIES) {
  const r = RARITIES[rarity];
  const s: any = {};

  for (const k of Object.keys(baseStats)) {
    const val = baseStats[k];

    if (typeof val === "number") {
      // stats primaires
      if (["strength","agility","intelligence","endurance","spirit"].includes(k))
        s[k] = val * r.primary;

      // stats calculées
      else
        s[k] = val * r.computed;
    }
  }

  return s;
}

// ============================================================
// 📌 BASE PAR SLOT
// ============================================================
const BASE_STATS = {
  head:      { endurance: 1, armor: 2 },
  chest:     { endurance: 2, armor: 4 },
  legs:      { endurance: 1, armor: 3 },
  feet:      { agility: 1, moveSpeed: 0.05 },
  hands:     { strength: 1, attackPower: 2 },
  weapon:    { strength: 2, attackPower: 5 },
  offhand:   { endurance: 1, armor: 3 },
  ring1:     { agility: 1, criticalChance: 1 },
  ring2:     { spirit: 1, manaRegen: 1 },
  trinket1:  { intelligence: 1, spellPower: 3 },
  trinket2:  { spirit: 1, manaRegen: 2 },
  neck:      { intelligence: 1, spellPower: 2 }
};

// ============================================================
// 📌 GÉNÉRATION DES ITEMS D'ÉQUIPEMENT
// ============================================================
function buildEquipmentItems() {
  const items: any[] = [];

  for (const slot of Object.keys(BASE_STATS)) {
    for (const rarity of Object.keys(RARITIES) as (keyof typeof RARITIES)[]) {

      const itemId = `eq_${slot}_${rarity}`;
      const name = `${slot.toUpperCase()} (${rarity})`;

      const stats = applyRarity(BASE_STATS[slot], rarity);

      items.push({
        itemId,
        name,
        type: "equipment",
        equipSlot: slot,
        icon: `icons/${slot}.png`,
        stats
      });
    }
  }

  return items;
}

// ============================================================
// 📌 ITEMS NORMAUX (consommables / matériaux / box / quêtes)
// ============================================================
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
    itemId: "consum_big_hp_potion",
    name: "Grande potion de soin",
    type: "consumable",
    icon: "icons/potion_big_hp.png",
    effects: { hp: +150 },
    stackable: true,
    maxStack: 10
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
      { itemId: "consum_hp_potion", min: 1, max: 2, weight: 30 }
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

// ============================================================
// 📌 ITEM PERSONNEL
// ============================================================
const PERSONAL_ITEM = {
  itemId: "personal_family_ring",
  name: "Bague Familiale",
  type: "quest",
  icon: "icons/family_ring.png",
  stackable: false,
  personal: true
};

// ============================================================
// 🚀 SEED MAIN
// ============================================================

async function seedItems() {
  try {
    console.log("Connexion MongoDB...");
    await mongoose.connect(MONGO_URI);

    const equipment = buildEquipmentItems();

    const ITEMS = [
      ...equipment,
      ...NORMAL_ITEMS,
      PERSONAL_ITEM
    ];

    console.log(`→ ${ITEMS.length} items à créer...`);

    for (const item of ITEMS) {
      await Item.deleteOne({ itemId: item.itemId });
      await Item.create(item);
      console.log(`→ Item ${item.itemId} OK`);
    }

    await mongoose.disconnect();
    console.log("🎉 SEED ITEMS TERMINÉ !");
    process.exit(0);

  } catch (err) {
    console.error("❌ ERREUR:", err);
    process.exit(1);
  }
}

if (require.main === module) seedItems();
