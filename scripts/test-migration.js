// Test db auto-migration
const { getDb, insertConfirmationToken, getConfirmationToken } = require("../src/lib/db");

const db = getDb();

console.log("=== Checking confirmation_tokens columns ===");
const tokenCols = db.prepare("PRAGMA table_info(confirmation_tokens)").all();
console.log(tokenCols.map(c => c.name).join(", "));

console.log("\n=== Checking orders columns ===");
const orderCols = db.prepare("PRAGMA table_info(orders)").all();
console.log(orderCols.map(c => c.name).join(", "));

console.log("\n=== Checking new tables ===");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables.map(t => t.name).join(", "));

console.log("\n=== Testing insertConfirmationToken ===");
const testToken = {
  token: `test_tok_${Date.now()}`,
  session_id: "test_session_migration",
  catalog_item_id: "PROD-001",
  item_name: "Aura Wireless Noise-Cancelling Earbuds",
  amount: 2499,
  currency: "INR",
  idempotency_key: `test_idem_${Date.now()}`,
  offer: {
    id: "off_test",
    product_id: "PROD-001",
    site_name: "Croma",
    seller_name: "Infiniti Retail",
    base_price: 2499,
    shipping_fee: 0,
    discount: 0,
    final_price: 2499,
    rating: 4.7,
    review_count: 820,
    delivery_eta: "Same-Day Delivery",
    in_stock: true,
    return_policy: "10 Days Replacement",
    is_verified: true,
    verification_status: "verified"
  },
  price_breakdown: {
    base_price: 2499,
    shipping_fee: 0,
    discount: 0,
    taxes: "Included (GST 18%)",
    total: 2499
  },
  payment_method: "Authorized UPI (••••@okhdfcbank)",
  shipping_address: {
    id: "addr_1",
    session_id: "test_session_migration",
    tag: "home",
    recipient_name: "Aarav Sharma",
    address_line1: "1402 Palm Heights",
    city: "Bengaluru",
    postal_code: "560038",
    is_default: true
  },
  reason: "Test purchase proposal migration verification",
  status: "pending",
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 600000).toISOString()
};

try {
  insertConfirmationToken(testToken);
  const fetched = getConfirmationToken(testToken.token);
  console.log("✓ SUCCESS! Inserted and fetched confirmation token with offer and price breakdown:", fetched ? fetched.token : null);
  console.log("Offer site name:", fetched?.offer?.site_name);
} catch (e) {
  console.error("✗ FAILED:", e.message);
}
