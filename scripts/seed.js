const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "surecart.db");
const db = new Database(DB_PATH);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS catalog (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    stock INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'Black',
    specifications TEXT NOT NULL DEFAULT '[]',
    brand TEXT,
    rating REAL DEFAULT 4.5,
    review_count INTEGER DEFAULT 120,
    policy_notes TEXT
  );

  CREATE TABLE IF NOT EXISTS product_offers (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    site_name TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    base_price INTEGER NOT NULL,
    shipping_fee INTEGER NOT NULL DEFAULT 0,
    discount INTEGER NOT NULL DEFAULT 0,
    final_price INTEGER NOT NULL,
    rating REAL NOT NULL DEFAULT 4.5,
    review_count INTEGER NOT NULL DEFAULT 100,
    delivery_eta TEXT NOT NULL,
    in_stock INTEGER NOT NULL DEFAULT 1,
    return_policy TEXT NOT NULL,
    is_verified INTEGER NOT NULL DEFAULT 1,
    verification_status TEXT NOT NULL DEFAULT 'verified',
    verification_details TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS vendor_overrides (
    id TEXT PRIMARY KEY,
    seller_name TEXT NOT NULL,
    site_name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'allowed', 'blocked'
    note TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS addresses (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    tag TEXT NOT NULL, -- 'home', 'work', 'other'
    recipient_name TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    city TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS session_preferences (
    session_id TEXT PRIMARY KEY,
    per_order_cap INTEGER NOT NULL DEFAULT 5000,
    per_session_cap INTEGER NOT NULL DEFAULT 10000,
    updated_at TEXT NOT NULL
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
    color: "Midnight Black",
    specifications: JSON.stringify([
      "Active Noise Cancellation (ANC 35dB)",
      "32-Hour Total Battery Life with Fast Charging",
      "Bluetooth 5.3 Low Latency",
      "IPX5 Sweat & Water Resistance",
      "Dual Beamforming Microphones"
    ]),
    brand: "Aura Sound",
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
    color: "Stealth Gray",
    specifications: JSON.stringify([
      "20W Dual Neodymium Drivers",
      "360-Degree Passive Bass Radiator",
      "15-Hour Continuous Playback",
      "IPX7 Waterproof Submersible",
      "True Wireless Stereo (TWS) Pairing"
    ]),
    brand: "Pulse Audio",
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
    color: "Matte Black",
    specifications: JSON.stringify([
      "120W Total RMS Output with Dedicated Subwoofer",
      "Dolby Atmos 3.1.2 Spatial Audio",
      "HDMI eARC & Optical Inputs",
      "Bluetooth 5.2 Hi-Res Audio Streaming",
      "Custom Equalizer Modes for Movies, Music, Voice"
    ]),
    brand: "SonicStudio",
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
    color: "Silver",
    specifications: JSON.stringify([
      "CNC-Machined Aircraft Grade Aluminum",
      "6 Adjustable Ergonomic Height Levels",
      "Fits 10-inch to 16-inch Laptops & Tablets",
      "Open Hollow Heat Dissipation Venting",
      "Anti-Slip Silicone Protective Pads"
    ]),
    brand: "ErgoLift",
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
    color: "Space Gray",
    specifications: JSON.stringify([
      "100W Max Output via Advanced GaN III Technology",
      "3 Charging Ports (2x USB-C Power Delivery, 1x USB-A QC 4.0)",
      "Universal Fast Charge for MacBook, iPhone, Galaxy, Pixel",
      "Intelligent Thermal Protection Circuit",
      "Ultra-Compact Foldable Travel Prongs"
    ]),
    brand: "VoltCore",
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
    color: "Pure White",
    specifications: JSON.stringify([
      "15W Qi2 Certified Magnetic Fast Wireless Charging",
      "Strong N52 Magnetic Alignment Ring",
      "Braided 1.5m Reinforced USB-C Cable",
      "Foreign Object Detection (FOD) Safety System",
      "Slim 6mm Profile with Anodized Aluminum Base"
    ]),
    brand: "MagDock",
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
    color: "Obsidian Black",
    specifications: JSON.stringify([
      "1.47-inch Curved AMOLED Color Display",
      "24/7 Heart Rate, SpO2 & Stress Monitoring",
      "Built-in Multi-System GNSS / GPS",
      "14-Day Ultra Battery Life",
      "5ATM Water Resistance (50m Swim-Proof)"
    ]),
    brand: "VeloTrack",
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
    color: "Titanium Silver",
    specifications: JSON.stringify([
      "Aerospace Grade Titanium Case & Sapphire Crystal",
      "Standalone 4G LTE eSIM Connectivity",
      "Dual-Frequency Precision GPS & Topo Maps",
      "ECG, Blood Pressure & Temperature Sensors",
      "Up to 7 Days Battery Life in Smart Mode"
    ]),
    brand: "Apex",
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
    color: "Charcoal & Birch",
    specifications: JSON.stringify([
      "75% Compact Layout with CNC Aluminum Knob",
      "Hot-Swappable Custom Pre-Lubed Linear Switches",
      "Tri-Mode Connectivity (2.4GHz, Bluetooth 5.1, USB-C)",
      "Double-Shot PBT Cherry Profile Keycaps",
      "Sound-Dampening Gasket Mount Structure"
    ]),
    brand: "KeyCraft",
    policy_notes: "Near per-order cap boundary (₹4,899 vs ₹5,000 cap)",
  },
];

const DEMO_ADDRESSES = [
  {
    id: "addr_home_default",
    session_id: "default_user",
    tag: "home",
    recipient_name: "Aarav Sharma",
    address_line1: "1402 Palm Heights, 12th Main, Indiranagar",
    city: "Bengaluru",
    postal_code: "560038",
    is_default: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: "addr_work_default",
    session_id: "default_user",
    tag: "work",
    recipient_name: "Aarav Sharma",
    address_line1: "WeWork Galaxy, 43 Residency Road, Shanthala Nagar",
    city: "Bengaluru",
    postal_code: "560025",
    is_default: 0,
    created_at: new Date().toISOString(),
  },
];

const DEMO_OFFERS = [
  // PROD-001 (Aura Wireless Earbuds)
  {
    id: "off_aura_amz",
    product_id: "PROD-001",
    site_name: "Amazon India",
    seller_name: "Appario Retail Pvt Ltd",
    base_price: 2499,
    shipping_fee: 0,
    discount: 100,
    final_price: 2399,
    rating: 4.6,
    review_count: 2340,
    delivery_eta: "Tomorrow by 11 AM (Prime)",
    in_stock: 1,
    return_policy: "7 Days Replacement / Refund",
    is_verified: 1,
    verification_status: "verified",
    verification_details: JSON.stringify({
      policy_check: true,
      review_authenticity_score: 96,
      seller_reputation: "trusted",
      tenure_years: 6,
    }),
  },
  {
    id: "off_aura_croma",
    product_id: "PROD-001",
    site_name: "Croma",
    seller_name: "Infiniti Retail (Tata Group)",
    base_price: 2499,
    shipping_fee: 0,
    discount: 0,
    final_price: 2499,
    rating: 4.7,
    review_count: 820,
    delivery_eta: "Same-Day Delivery (Express)",
    in_stock: 1,
    return_policy: "10 Days Replacement / Store Refund",
    is_verified: 1,
    verification_status: "verified",
    verification_details: JSON.stringify({
      policy_check: true,
      review_authenticity_score: 98,
      seller_reputation: "trusted",
      tenure_years: 15,
    }),
  },
  {
    id: "off_aura_fk",
    product_id: "PROD-001",
    site_name: "Flipkart",
    seller_name: "RetailNet India",
    base_price: 2599,
    shipping_fee: 40,
    discount: 150,
    final_price: 2489,
    rating: 4.4,
    review_count: 1450,
    delivery_eta: "2 Days Standard",
    in_stock: 1,
    return_policy: "7 Days Service Center Replacement",
    is_verified: 1,
    verification_status: "verified",
    verification_details: JSON.stringify({
      policy_check: true,
      review_authenticity_score: 92,
      seller_reputation: "trusted",
      tenure_years: 8,
    }),
  },
  // PROD-002 (Pulse Hi-Fi Bluetooth Speaker)
  {
    id: "off_pulse_croma",
    product_id: "PROD-002",
    site_name: "Croma",
    seller_name: "Infiniti Retail",
    base_price: 4199,
    shipping_fee: 0,
    discount: 200,
    final_price: 3999,
    rating: 4.8,
    review_count: 530,
    delivery_eta: "Tomorrow by 2 PM",
    in_stock: 1,
    return_policy: "10 Days Replacement / Refund",
    is_verified: 1,
    verification_status: "verified",
    verification_details: JSON.stringify({
      policy_check: true,
      review_authenticity_score: 97,
      seller_reputation: "trusted",
    }),
  },
  {
    id: "off_pulse_amz",
    product_id: "PROD-002",
    site_name: "Amazon India",
    seller_name: "Pulse Audio Official Store",
    base_price: 4199,
    shipping_fee: 0,
    discount: 0,
    final_price: 4199,
    rating: 4.6,
    review_count: 910,
    delivery_eta: "Tomorrow Evening",
    in_stock: 1,
    return_policy: "7 Days Replacement",
    is_verified: 1,
    verification_status: "verified",
    verification_details: JSON.stringify({
      policy_check: true,
      review_authenticity_score: 95,
      seller_reputation: "trusted",
    }),
  },
  // PROD-004 (ErgoLift Aluminum Laptop Stand)
  {
    id: "off_ergo_amz",
    product_id: "PROD-004",
    site_name: "Amazon India",
    seller_name: "ErgoLift Direct Store",
    base_price: 1299,
    shipping_fee: 0,
    discount: 100,
    final_price: 1199,
    rating: 4.7,
    review_count: 3100,
    delivery_eta: "Tomorrow by 12 PM",
    in_stock: 1,
    return_policy: "10 Days Return / Replacement",
    is_verified: 1,
    verification_status: "verified",
    verification_details: JSON.stringify({
      policy_check: true,
      review_authenticity_score: 96,
      seller_reputation: "trusted",
    }),
  },
  {
    id: "off_ergo_rel",
    product_id: "PROD-004",
    site_name: "Reliance Digital",
    seller_name: "Reliance Retail Ltd",
    base_price: 1299,
    shipping_fee: 0,
    discount: 0,
    final_price: 1299,
    rating: 4.5,
    review_count: 420,
    delivery_eta: "2 Days Standard",
    in_stock: 1,
    return_policy: "7 Days Replacement",
    is_verified: 1,
    verification_status: "verified",
    verification_details: JSON.stringify({
      policy_check: true,
      review_authenticity_score: 94,
      seller_reputation: "trusted",
    }),
  },
  // PROD-005 (VoltCore 100W GaN Fast Charger)
  {
    id: "off_volt_amz",
    product_id: "PROD-005",
    site_name: "Amazon India",
    seller_name: "VoltCore Tech Official",
    base_price: 2899,
    shipping_fee: 0,
    discount: 200,
    final_price: 2699,
    rating: 4.8,
    review_count: 1840,
    delivery_eta: "Tomorrow by 10 AM",
    in_stock: 1,
    return_policy: "7 Days Return / Refund",
    is_verified: 1,
    verification_status: "verified",
    verification_details: JSON.stringify({
      policy_check: true,
      review_authenticity_score: 99,
      seller_reputation: "trusted",
    }),
  },
  {
    id: "off_volt_croma",
    product_id: "PROD-005",
    site_name: "Croma",
    seller_name: "Infiniti Retail",
    base_price: 2899,
    shipping_fee: 0,
    discount: 100,
    final_price: 2799,
    rating: 4.7,
    review_count: 620,
    delivery_eta: "Tomorrow by 4 PM",
    in_stock: 1,
    return_policy: "10 Days Replacement / Refund",
    is_verified: 1,
    verification_status: "verified",
    verification_details: JSON.stringify({
      policy_check: true,
      review_authenticity_score: 97,
      seller_reputation: "trusted",
    }),
  },
  // PROD-009 (KeyCraft Minimalist Mechanical Keyboard)
  {
    id: "off_key_amz",
    product_id: "PROD-009",
    site_name: "Amazon India",
    seller_name: "KeyCraft Studio India",
    base_price: 4899,
    shipping_fee: 0,
    discount: 200,
    final_price: 4699,
    rating: 4.9,
    review_count: 890,
    delivery_eta: "Tomorrow by 1 PM",
    in_stock: 1,
    return_policy: "7 Days Replacement Only",
    is_verified: 1,
    verification_status: "verified",
    verification_details: JSON.stringify({
      policy_check: true,
      review_authenticity_score: 98,
      seller_reputation: "trusted",
    }),
  },
  {
    id: "off_key_fk",
    product_id: "PROD-009",
    site_name: "Flipkart",
    seller_name: "RetailNet India",
    base_price: 4899,
    shipping_fee: 0,
    discount: 0,
    final_price: 4899,
    rating: 4.6,
    review_count: 310,
    delivery_eta: "2 Days Standard",
    in_stock: 1,
    return_policy: "7 Days Replacement",
    is_verified: 1,
    verification_status: "verified",
    verification_details: JSON.stringify({
      policy_check: true,
      review_authenticity_score: 93,
      seller_reputation: "trusted",
    }),
  },
];

const DEMO_OVERRIDES = [
  {
    id: "ovr_appario",
    seller_name: "Appario Retail Pvt Ltd",
    site_name: "Amazon India",
    status: "allowed",
    note: "Tier-1 authorized electronics fulfillment partner",
    updated_at: new Date().toISOString(),
  },
  {
    id: "ovr_croma",
    seller_name: "Infiniti Retail (Tata Group)",
    site_name: "Croma",
    status: "allowed",
    note: "Official Tata enterprise retail network",
    updated_at: new Date().toISOString(),
  },
];

console.log("Seeding catalog, offers, and addresses database...");

// Check if columns exist in catalog, if not add them
try {
  const tableInfo = db.prepare("PRAGMA table_info(catalog)").all();
  const columnNames = tableInfo.map((c) => c.name);
  if (!columnNames.includes("color")) {
    db.exec("ALTER TABLE catalog ADD COLUMN color TEXT NOT NULL DEFAULT 'Black'");
  }
  if (!columnNames.includes("specifications")) {
    db.exec("ALTER TABLE catalog ADD COLUMN specifications TEXT NOT NULL DEFAULT '[]'");
  }
  if (!columnNames.includes("brand")) {
    db.exec("ALTER TABLE catalog ADD COLUMN brand TEXT");
  }
  if (!columnNames.includes("rating")) {
    db.exec("ALTER TABLE catalog ADD COLUMN rating REAL DEFAULT 4.5");
  }
  if (!columnNames.includes("review_count")) {
    db.exec("ALTER TABLE catalog ADD COLUMN review_count INTEGER DEFAULT 120");
  }
} catch (e) {
  // Table was just created with schema
}

const insertCatalog = db.prepare(`
  INSERT OR REPLACE INTO catalog (id, name, description, price, currency, stock, category, color, specifications, brand, rating, review_count, policy_notes)
  VALUES (@id, @name, @description, @price, @currency, @stock, @category, @color, @specifications, @brand, @rating, @review_count, @policy_notes)
`);

const insertCatalogMany = db.transaction((items) => {
  for (const item of items) {
    insertCatalog.run({
      ...item,
      rating: item.rating || 4.5,
      review_count: item.review_count || 120,
    });
  }
});

insertCatalogMany(DEMO_CATALOG);

const insertAddress = db.prepare(`
  INSERT OR REPLACE INTO addresses (id, session_id, tag, recipient_name, address_line1, city, postal_code, is_default, created_at)
  VALUES (@id, @session_id, @tag, @recipient_name, @address_line1, @city, @postal_code, @is_default, @created_at)
`);

const insertAddressMany = db.transaction((items) => {
  for (const item of items) {
    insertAddress.run(item);
  }
});

insertAddressMany(DEMO_ADDRESSES);

const insertOffer = db.prepare(`
  INSERT OR REPLACE INTO product_offers (id, product_id, site_name, seller_name, base_price, shipping_fee, discount, final_price, rating, review_count, delivery_eta, in_stock, return_policy, is_verified, verification_status, verification_details)
  VALUES (@id, @product_id, @site_name, @seller_name, @base_price, @shipping_fee, @discount, @final_price, @rating, @review_count, @delivery_eta, @in_stock, @return_policy, @is_verified, @verification_status, @verification_details)
`);

const insertOfferMany = db.transaction((items) => {
  for (const item of items) {
    insertOffer.run(item);
  }
});

insertOfferMany(DEMO_OFFERS);

const insertOverride = db.prepare(`
  INSERT OR REPLACE INTO vendor_overrides (id, seller_name, site_name, status, note, updated_at)
  VALUES (@id, @seller_name, @site_name, @status, @note, @updated_at)
`);

const insertOverrideMany = db.transaction((items) => {
  for (const item of items) {
    insertOverride.run(item);
  }
});

insertOverrideMany(DEMO_OVERRIDES);

console.log(`✓ Successfully seeded ${DEMO_CATALOG.length} catalog items, ${DEMO_OFFERS.length} cross-site seller offers, ${DEMO_OVERRIDES.length} vendor overrides, and ${DEMO_ADDRESSES.length} saved addresses into ${DB_PATH}`);
db.close();


