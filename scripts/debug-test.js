const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.resolve(__dirname, "../data/surecart.db");
const db = new Database(dbPath);

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
    "token_123", "sess_123", "PROD-001", "Aura Earbuds", 2499,
    "INR", "idem_123", null, null, "UPI", null, "test reason", "pending",
    new Date().toISOString(), new Date().toISOString()
  );
  console.log("Insert succeeded!");
} catch (err) {
  console.error("EXACT ERROR CAUGHT:", err.message);
}

db.close();
