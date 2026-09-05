const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "surecart.db");
const db = new Database(DB_PATH);

console.log("Applying database migrations to:", DB_PATH);

const addColumnIfNotExists = (tableName, columnName, columnDef) => {
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const names = tableInfo.map((c) => c.name.toLowerCase());
    if (!names.includes(columnName.toLowerCase())) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
      console.log(`+ Added column ${columnName} to ${tableName}`);
    } else {
      console.log(`✓ Column ${columnName} already exists in ${tableName}`);
    }
  } catch (e) {
    console.warn(`Could not add column ${columnName} to ${tableName}:`, e.message);
  }
};

// confirmation_tokens migrations
addColumnIfNotExists("confirmation_tokens", "offer", "TEXT");
addColumnIfNotExists("confirmation_tokens", "price_breakdown", "TEXT");
addColumnIfNotExists("confirmation_tokens", "payment_method", "TEXT");
addColumnIfNotExists("confirmation_tokens", "shipping_address", "TEXT");

// orders migrations
addColumnIfNotExists("orders", "offer", "TEXT");
addColumnIfNotExists("orders", "price_breakdown", "TEXT");
addColumnIfNotExists("orders", "payment_method", "TEXT");
addColumnIfNotExists("orders", "shipping_address", "TEXT");
addColumnIfNotExists("orders", "failure_reason", "TEXT");
addColumnIfNotExists("orders", "website", "TEXT");
addColumnIfNotExists("orders", "seller", "TEXT");
addColumnIfNotExists("orders", "product_url", "TEXT");
addColumnIfNotExists("orders", "variant", "TEXT");
addColumnIfNotExists("orders", "quantity", "INTEGER DEFAULT 1");
addColumnIfNotExists("orders", "tracking_url", "TEXT");
addColumnIfNotExists("orders", "receipt_url", "TEXT");
addColumnIfNotExists("orders", "delivery_date", "TEXT");
addColumnIfNotExists("orders", "category", "TEXT");
addColumnIfNotExists("orders", "razorpay_signature", "TEXT");

// catalog migrations
addColumnIfNotExists("catalog", "image", "TEXT");
addColumnIfNotExists("catalog", "exact_url", "TEXT");
addColumnIfNotExists("catalog", "website", "TEXT");
addColumnIfNotExists("catalog", "seller", "TEXT");
addColumnIfNotExists("catalog", "cod_available", "INTEGER DEFAULT 1");

// product_offers migrations
addColumnIfNotExists("product_offers", "exact_url", "TEXT");
addColumnIfNotExists("product_offers", "cod_available", "INTEGER DEFAULT 1");

// addresses migrations
addColumnIfNotExists("addresses", "state", "TEXT");
addColumnIfNotExists("addresses", "phone", "TEXT");

// Create new tables
db.exec(`
  CREATE TABLE IF NOT EXISTS search_history (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id TEXT,
    query TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    results_count INTEGER NOT NULL DEFAULT 0,
    filters TEXT NOT NULL DEFAULT '{}',
    category TEXT,
    min_price INTEGER,
    max_price INTEGER,
    selected_product_id TEXT,
    source_websites TEXT NOT NULL DEFAULT '[]'
  );

  CREATE INDEX IF NOT EXISTS idx_search_session ON search_history(session_id);
  CREATE INDEX IF NOT EXISTS idx_search_timestamp ON search_history(timestamp);

  CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    user_id TEXT,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    payload TEXT,
    timestamp TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_chat_msg_session ON chat_messages(session_id);

  CREATE TABLE IF NOT EXISTS commerce_reports (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id TEXT,
    email TEXT NOT NULL,
    report_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'generated',
    created_at TEXT NOT NULL,
    delivered_at TEXT
  );
`);

console.log("Migration complete!");

// Test insertConfirmationToken
const testToken = `token_migrated_${Date.now()}`;
try {
  const stmt = db.prepare(`
    INSERT INTO confirmation_tokens (
      token, session_id, catalog_item_id, item_name, amount,
      currency, idempotency_key, offer, price_breakdown, payment_method, shipping_address, reason, status, created_at, expires_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  stmt.run(
    testToken,
    "sess_test",
    "PROD-001",
    "Aura Wireless Noise-Cancelling Earbuds",
    2499,
    "INR",
    `idem_test_${Date.now()}`,
    JSON.stringify({ site_name: "Croma", seller_name: "Infiniti Retail" }),
    JSON.stringify({ total: 2499 }),
    "UPI",
    null,
    "Test verified offer",
    "pending",
    new Date().toISOString(),
    new Date().toISOString()
  );
  console.log("✓ SUCCESS: Inserted test confirmation_tokens with offer and price_breakdown!");
  db.prepare("DELETE FROM confirmation_tokens WHERE token = ?").run(testToken);
} catch (err) {
  console.error("✗ FAILURE:", err.message);
}

db.close();
