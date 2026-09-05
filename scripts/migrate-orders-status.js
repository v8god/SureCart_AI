const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "..", "data", "surecart.db");
const db = new Database(dbPath);

console.log("Migrating 'orders' table to expand status CHECK constraint...");

db.pragma("foreign_keys = OFF");

const existingOrders = db.prepare("SELECT * FROM orders").all();
console.log(`Found ${existingOrders.length} existing orders to preserve.`);

db.exec(`
  CREATE TABLE orders_new (
    id TEXT PRIMARY KEY,
    catalog_item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    razorpay_order_id TEXT NOT NULL,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    status TEXT NOT NULL CHECK(status IN ('pending', 'captured', 'declined', 'failed', 'cod_confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    idempotency_key TEXT NOT NULL UNIQUE,
    session_id TEXT NOT NULL,
    offer TEXT,
    price_breakdown TEXT,
    payment_method TEXT,
    shipping_address TEXT,
    failure_reason TEXT,
    website TEXT,
    seller TEXT,
    product_url TEXT,
    variant TEXT,
    quantity INTEGER DEFAULT 1,
    tracking_url TEXT,
    receipt_url TEXT,
    delivery_date TEXT,
    category TEXT,
    created_at TEXT NOT NULL
  );
`);

const insertStmt = db.prepare(`
  INSERT INTO orders_new (
    id, catalog_item_id, item_name, amount, currency, razorpay_order_id, razorpay_payment_id, razorpay_signature,
    status, idempotency_key, session_id, offer, price_breakdown, payment_method, shipping_address,
    failure_reason, website, seller, product_url, variant, quantity, tracking_url, receipt_url, delivery_date, category, created_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
`);

for (const o of existingOrders) {
  insertStmt.run(
    o.id, o.catalog_item_id, o.item_name, o.amount, o.currency, o.razorpay_order_id, o.razorpay_payment_id || null, o.razorpay_signature || null,
    o.status, o.idempotency_key, o.session_id, o.offer || null, o.price_breakdown || null, o.payment_method || null, o.shipping_address || null,
    o.failure_reason || null, o.website || null, o.seller || null, o.product_url || null, o.variant || null, o.quantity || 1, o.tracking_url || null,
    o.receipt_url || null, o.delivery_date || null, o.category || null, o.created_at
  );
}

db.exec(`
  DROP TABLE orders;
  ALTER TABLE orders_new RENAME TO orders;
  CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
  CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key);
`);

db.pragma("foreign_keys = ON");
console.log("Migration complete: 'orders' table now supports full status state machine (including 'cod_confirmed').");
