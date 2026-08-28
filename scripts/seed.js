const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "surecart.db");
const db = new Database(DB_PATH);

// Initialize table if not present
db.exec(`
  CREATE TABLE IF NOT EXISTS catalog (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    stock INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL,
    policy_notes TEXT
  );
`);

const DEMO_CATALOG = [
  {
    id: "PROD-001",
    name: "Aura Wireless Noise-Cancelling Earbuds",
    description: "Premium active noise cancelling earbuds with 32hr battery life, Bluetooth 5.3, and IPX5 water resistance.",
    price: 2499,
    currency: "INR",
    stock: 18,
    category: "Audio",
    policy_notes: "Standard consumable hardware; within single order limit (₹5,000)",
  },
  {
    id: "PROD-002",
    name: "Pulse Hi-Fi Bluetooth Speaker",
    description: "Compact 20W portable speaker with 360-degree bass radiator and 15-hour playback.",
    price: 4199,
    currency: "INR",
    stock: 9,
    category: "Audio",
    policy_notes: "Within single order limit (₹5,000); tests cumulative session cap (₹10,000)",
  },
  {
    id: "PROD-003",
    name: "SonicStudio Reference Studio Soundbar",
    description: "120W Dolby Atmos soundbar with wireless subwoofer and HDMI eARC.",
    price: 15999,
    currency: "INR",
    stock: 4,
    category: "Audio",
    policy_notes: "EXCEEDS standard per-order limit (₹5,000) — triggers spend-cap refusal",
  },
  {
    id: "PROD-004",
    name: "ErgoLift Aluminum Laptop Stand",
    description: "Ergonomic foldable aluminum riser for laptops up to 16 inches with heat dissipation design.",
    price: 1299,
    currency: "INR",
    stock: 25,
    category: "Accessories",
    policy_notes: "Accessible accessory; well within spending caps",
  },
  {
    id: "PROD-005",
    name: "VoltCore 100W GaN Fast Charger (3-Port)",
    description: "High-speed 100W USB-C GaN charger supporting fast-charging for laptops, phones, and tablets simultaneously.",
    price: 2899,
    currency: "INR",
    stock: 14,
    category: "Accessories",
    policy_notes: "Fast charger; within spending caps",
  },
  {
    id: "PROD-006",
    name: "MagDock Qi2 Wireless Charging Pad",
    description: "15W magnetic wireless charging pad with braided USB-C cable and smart temperature control.",
    price: 1899,
    currency: "INR",
    stock: 20,
    category: "Accessories",
    policy_notes: "Qi2 wireless charger; within spending caps",
  },
  {
    id: "PROD-007",
    name: "VeloTrack Pro Smart Fitness Band",
    description: "AMOLED fitness tracker with continuous SpO2, heart rate monitoring, GPS, and 14-day battery life.",
    price: 3499,
    currency: "INR",
    stock: 12,
    category: "Wearables",
    policy_notes: "Fitness tracker; within spending caps",
  },
  {
    id: "PROD-008",
    name: "Apex Titanium Smartwatch Edition",
    description: "Sapphire glass smartwatch with titanium chassis, cellular connectivity, and offline maps.",
    price: 18499,
    currency: "INR",
    stock: 2,
    category: "Wearables",
    policy_notes: "EXCEEDS standard per-order limit (₹5,000) — triggers spend-cap refusal",
  },
  {
    id: "PROD-009",
    name: "KeyCraft Minimalist Mechanical Keyboard",
    description: "75% wireless mechanical keyboard with hot-swappable switches, PBT keycaps, and RGB backlighting.",
    price: 4899,
    currency: "INR",
    stock: 7,
    category: "Office",
    policy_notes: "Near per-order cap boundary (₹4,899 vs ₹5,000 cap)",
  },
];

console.log("Seeding catalog database...");

const insert = db.prepare(`
  INSERT OR REPLACE INTO catalog (id, name, description, price, currency, stock, category, policy_notes)
  VALUES (@id, @name, @description, @price, @currency, @stock, @category, @policy_notes)
`);

const insertMany = db.transaction((items) => {
  for (const item of items) {
    insert.run(item);
  }
});

insertMany(DEMO_CATALOG);

console.log(`✓ Successfully seeded ${DEMO_CATALOG.length} catalog items into ${DB_PATH}`);
db.close();
