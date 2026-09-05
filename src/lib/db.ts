import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import {
  CatalogItem,
  Order,
  AuditEntry,
  ConfirmationToken,
  ShippingAddress,
  SessionCaps,
  ProductOffer,
  VendorOverride,
  PriceBreakdown,
  OrderStatus,
  SearchHistoryEntry,
  PurchaseHistoryEntry,
  ChatMessage,
  AdminAnalyticsSummary,
} from "@/types";

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "surecart.db");

// Singleton connection
let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    // Performance and WAL mode
    dbInstance.pragma("journal_mode = WAL");
    dbInstance.pragma("foreign_keys = ON");
    initSchema(dbInstance);
    ensureMigrations(dbInstance);
  }
  return dbInstance;
}

function ensureMigrations(db: Database.Database) {
  const addColumnIfNotExists = (tableName: string, columnName: string, columnDef: string) => {
    try {
      const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
      const names = tableInfo.map((c) => c.name.toLowerCase());
      if (!names.includes(columnName.toLowerCase())) {
        db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
      }
    } catch (e) {
      console.warn(`Could not add column ${columnName} to ${tableName}:`, e);
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
}

function initSchema(db: Database.Database) {
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
      policy_notes TEXT,
      image TEXT,
      exact_url TEXT,
      website TEXT,
      seller TEXT,
      cod_available INTEGER DEFAULT 1
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
      exact_url TEXT,
      cod_available INTEGER DEFAULT 1,
      verification_status TEXT NOT NULL DEFAULT 'verified',
      verification_details TEXT NOT NULL DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_offers_product ON product_offers(product_id);

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
      tag TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      address_line1 TEXT NOT NULL,
      city TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      state TEXT,
      phone TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_addresses_session ON addresses(session_id);

    CREATE TABLE IF NOT EXISTS session_preferences (
      session_id TEXT PRIMARY KEY,
      per_order_cap INTEGER NOT NULL DEFAULT 5000,
      per_session_cap INTEGER NOT NULL DEFAULT 10000,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      catalog_item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      razorpay_order_id TEXT NOT NULL,
      razorpay_payment_id TEXT,
      razorpay_signature TEXT,
      status TEXT NOT NULL,
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

    CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
    CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key);

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      session_id TEXT NOT NULL,
      actor TEXT NOT NULL CHECK(actor IN ('agent', 'buyer', 'system')),
      action_type TEXT NOT NULL,
      reasoning TEXT NOT NULL,
      payload TEXT NOT NULL,
      result TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_log(session_id);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);

    CREATE TABLE IF NOT EXISTS confirmation_tokens (
      token TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      catalog_item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      idempotency_key TEXT NOT NULL UNIQUE,
      offer TEXT,
      price_breakdown TEXT,
      payment_method TEXT,
      shipping_address TEXT,
      reason TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'confirmed', 'cancelled', 'expired', 'spent')),
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tokens_session ON confirmation_tokens(session_id);

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
}

export function parseOfferRow(row: any): ProductOffer {
  let details: ProductOffer["verification_details"] = undefined;
  if (row.verification_details) {
    try {
      details = JSON.parse(row.verification_details);
    } catch {
      details = undefined;
    }
  }
  return {
    id: row.id,
    product_id: row.product_id,
    site_name: row.site_name,
    seller_name: row.seller_name,
    base_price: row.base_price,
    shipping_fee: row.shipping_fee || 0,
    discount: row.discount || 0,
    final_price: row.final_price || row.base_price,
    rating: row.rating || 4.5,
    review_count: row.review_count || 100,
    delivery_eta: row.delivery_eta || "2 Days Standard",
    in_stock: Boolean(row.in_stock),
    return_policy: row.return_policy || "7 Days Replacement",
    is_verified: Boolean(row.is_verified),
    verification_status: row.verification_status || "verified",
    verification_details: details,
  };
}

export function getProductOffers(productId: string): ProductOffer[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM product_offers WHERE product_id = ? ORDER BY final_price ASC").all(productId);
  return rows.map(parseOfferRow);
}

export function getOfferById(offerId: string): ProductOffer | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM product_offers WHERE id = ?").get(offerId);
  return row ? parseOfferRow(row) : null;
}

export function getAllOffers(): ProductOffer[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM product_offers ORDER BY final_price ASC").all();
  return rows.map(parseOfferRow);
}

// -----------------------------------------------------------------------------
// Vendor Overrides & Seller Verification
// -----------------------------------------------------------------------------

export function getVendorOverrides(): VendorOverride[] {
  const db = getDb();
  return db.prepare("SELECT * FROM vendor_overrides ORDER BY updated_at DESC").all() as VendorOverride[];
}

export function setVendorOverride(sellerName: string, siteName: string, status: "allowed" | "blocked", note?: string): void {
  const db = getDb();
  const id = `ovr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  db.prepare(`
    INSERT OR REPLACE INTO vendor_overrides (id, seller_name, site_name, status, note, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, sellerName, siteName, status, note || null, new Date().toISOString());
}

export function verifySeller(sellerName: string, siteName: string, policy?: string, rating: number = 4.5): {
  verified: boolean;
  status: "verified" | "unverified" | "admin_overridden";
  details: {
    policy_check: boolean;
    review_authenticity_score: number;
    seller_reputation: "trusted" | "standard" | "caution";
    admin_override?: boolean;
    rejection_reasons?: string[];
  };
} {
  const db = getDb();
  const override = db
    .prepare("SELECT * FROM vendor_overrides WHERE LOWER(seller_name) = LOWER(?) OR LOWER(site_name) = LOWER(?)")
    .get(sellerName, siteName) as VendorOverride | undefined;

  if (override) {
    if (override.status === "allowed") {
      return {
        verified: true,
        status: "admin_overridden",
        details: {
          policy_check: true,
          review_authenticity_score: 99,
          seller_reputation: "trusted",
          admin_override: true,
        },
      };
    } else if (override.status === "blocked") {
      return {
        verified: false,
        status: "unverified",
        details: {
          policy_check: false,
          review_authenticity_score: 0,
          seller_reputation: "caution",
          admin_override: true,
          rejection_reasons: [`Admin explicitly blocked vendor: ${override.note || "Risk policy"}`],
        },
      };
    }
  }

  // Standard verification evaluation (balanced: check return/exchange/refund policy, rating threshold, marketplace trust)
  const isTrustedMarketplace = ["amazon", "croma", "flipkart", "reliance digital", "tata cliQ", "official store"].some(
    (m) => siteName.toLowerCase().includes(m)
  );

  const policyCheck = !policy || !policy.toLowerCase().includes("no return");
  const reviewScore = rating >= 4.0 ? Math.min(99, Math.round(rating * 20)) : 75;
  const sellerReputation = isTrustedMarketplace ? "trusted" : rating >= 4.2 ? "standard" : "caution";

  const rejectionReasons: string[] = [];
  if (!policyCheck) rejectionReasons.push("Non-compliant exchange/refund terms");
  if (rating < 3.5) rejectionReasons.push("Seller customer rating below threshold (<3.5★)");

  const verified = policyCheck && rating >= 3.5;

  return {
    verified,
    status: verified ? "verified" : "unverified",
    details: {
      policy_check: policyCheck,
      review_authenticity_score: reviewScore,
      seller_reputation: sellerReputation,
      rejection_reasons: rejectionReasons.length > 0 ? rejectionReasons : undefined,
    },
  };
}

function parseCatalogRow(row: any): CatalogItem {
  let specs: string[] = [];
  if (row.specifications) {
    try {
      specs = JSON.parse(row.specifications);
    } catch {
      specs = [];
    }
  }
  const offers = getProductOffers(row.id);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    currency: row.currency || "INR",
    stock: row.stock,
    category: row.category,
    color: row.color || "Black",
    specifications: specs,
    brand: row.brand || undefined,
    rating: row.rating || 4.6,
    review_count: row.review_count || 120,
    offers: offers.length > 0 ? offers : undefined,
    policy_notes: row.policy_notes || undefined,
  };
}

// -----------------------------------------------------------------------------
// Catalog Queries
// -----------------------------------------------------------------------------

export function getAllCatalogItems(): CatalogItem[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM catalog ORDER BY category, price ASC").all();
  return rows.map(parseCatalogRow);
}

export function getCatalogItemById(id: string): CatalogItem | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM catalog WHERE id = ?").get(id);
  return row ? parseCatalogRow(row) : null;
}

export interface CatalogSearchParams {
  query?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  color?: string;
  specKeyword?: string;
}

export function searchCatalog(
  queryOrParams?: string | CatalogSearchParams,
  categoryParam?: string,
  maxPriceParam?: number
): CatalogItem[] {
  const db = getDb();
  let sql = "SELECT * FROM catalog WHERE 1=1";
  const params: (string | number)[] = [];

  let query: string | undefined;
  let category: string | undefined;
  let minPrice: number | undefined;
  let maxPrice: number | undefined;
  let color: string | undefined;
  let specKeyword: string | undefined;

  if (typeof queryOrParams === "object" && queryOrParams !== null) {
    query = queryOrParams.query;
    category = queryOrParams.category;
    minPrice = queryOrParams.minPrice;
    maxPrice = queryOrParams.maxPrice;
    color = queryOrParams.color;
    specKeyword = queryOrParams.specKeyword;
  } else {
    query = queryOrParams;
    category = categoryParam;
    maxPrice = maxPriceParam;
  }

  if (query && query.trim()) {
    sql += " AND (name LIKE ? OR description LIKE ? OR category LIKE ? OR brand LIKE ? OR specifications LIKE ?)";
    const wildcard = `%${query.trim()}%`;
    params.push(wildcard, wildcard, wildcard, wildcard, wildcard);
  }

  if (category && category.trim()) {
    sql += " AND category = ?";
    params.push(category.trim());
  }

  if (color && color.trim()) {
    sql += " AND (color LIKE ? OR name LIKE ? OR description LIKE ?)";
    const colorWildcard = `%${color.trim()}%`;
    params.push(colorWildcard, colorWildcard, colorWildcard);
  }

  if (specKeyword && specKeyword.trim()) {
    sql += " AND (specifications LIKE ? OR description LIKE ?)";
    const specWildcard = `%${specKeyword.trim()}%`;
    params.push(specWildcard, specWildcard);
  }

  if (typeof minPrice === "number" && minPrice > 0) {
    sql += " AND price >= ?";
    params.push(minPrice);
  }

  if (typeof maxPrice === "number" && maxPrice > 0) {
    sql += " AND price <= ?";
    params.push(maxPrice);
  }

  sql += " ORDER BY price ASC LIMIT 10";
  const rows = db.prepare(sql).all(...params);
  return rows.map(parseCatalogRow);
}

// -----------------------------------------------------------------------------
// Addresses Queries
// -----------------------------------------------------------------------------

export function getAddresses(sessionId: string): ShippingAddress[] {
  const db = getDb();
  // Fetch session-specific addresses; fallback to demo addresses if user has not created any
  const rows = db
    .prepare("SELECT * FROM addresses WHERE session_id = ? OR session_id = 'default_user' ORDER BY is_default DESC, created_at DESC")
    .all(sessionId) as Array<{
    id: string;
    session_id: string;
    tag: string;
    recipient_name: string;
    address_line1: string;
    city: string;
    postal_code: string;
    state?: string;
    phone?: string;
    is_default: number;
  }>;

  // Deduplicate by tag if both custom and default exist
  const tagMap = new Map<string, ShippingAddress>();
  for (const r of rows) {
    if (!tagMap.has(r.tag.toLowerCase()) || r.session_id === sessionId) {
      tagMap.set(r.tag.toLowerCase(), {
        id: r.id,
        session_id: r.session_id,
        tag: r.tag.toLowerCase() as ShippingAddress["tag"],
        recipient_name: r.recipient_name,
        address_line1: r.address_line1,
        city: r.city,
        postal_code: r.postal_code,
        state: r.state,
        phone: r.phone,
        is_default: Boolean(r.is_default),
      });
    }
  }

  return Array.from(tagMap.values());
}

export function getAddressByTag(sessionId: string, tag: string): ShippingAddress | null {
  const addresses = getAddresses(sessionId);
  const normalizedTag = tag.trim().toLowerCase();
  return addresses.find((a) => a.tag.toLowerCase() === normalizedTag) || null;
}

export function getAddressById(id: string): ShippingAddress | null {
  const db = getDb();
  const r = db.prepare("SELECT * FROM addresses WHERE id = ?").get(id) as any;
  if (!r) return null;
  return {
    id: r.id,
    session_id: r.session_id,
    tag: r.tag as ShippingAddress["tag"],
    recipient_name: r.recipient_name,
    address_line1: r.address_line1,
    city: r.city,
    postal_code: r.postal_code,
    state: r.state,
    phone: r.phone,
    is_default: Boolean(r.is_default),
  };
}

export function deleteAddress(id: string, sessionId: string): boolean {
  const db = getDb();
  const res = db.prepare("DELETE FROM addresses WHERE id = ? AND (session_id = ? OR session_id = 'default_user')").run(id, sessionId);
  return res.changes > 0;
}

export function saveAddress(addr: Omit<ShippingAddress, "id"> & { id?: string }): ShippingAddress {
  const db = getDb();
  const id = addr.id || `addr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  if (addr.is_default) {
    db.prepare("UPDATE addresses SET is_default = 0 WHERE session_id = ?").run(addr.session_id);
  }

  db.prepare(`
    INSERT OR REPLACE INTO addresses (
      id, session_id, tag, recipient_name, address_line1, city, postal_code, state, phone, is_default, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `).run(
    id,
    addr.session_id,
    addr.tag.toLowerCase(),
    addr.recipient_name,
    addr.address_line1,
    addr.city,
    addr.postal_code,
    addr.state || null,
    addr.phone || null,
    addr.is_default ? 1 : 0,
    now
  );

  return {
    id,
    session_id: addr.session_id,
    tag: addr.tag,
    recipient_name: addr.recipient_name,
    address_line1: addr.address_line1,
    city: addr.city,
    postal_code: addr.postal_code,
    state: addr.state,
    phone: addr.phone,
    is_default: addr.is_default,
  };
}

// -----------------------------------------------------------------------------
// Session Preferences / Caps Queries
// -----------------------------------------------------------------------------

export function getSessionCaps(sessionId: string): SessionCaps {
  const db = getDb();
  const row = db.prepare("SELECT per_order_cap, per_session_cap FROM session_preferences WHERE session_id = ?").get(sessionId) as {
    per_order_cap: number;
    per_session_cap: number;
  } | undefined;

  return {
    per_order_cap: row?.per_order_cap ?? 5000,
    per_session_cap: row?.per_session_cap ?? 10000,
  };
}

export function updateSessionCaps(sessionId: string, perOrderCap: number, perSessionCap: number): SessionCaps {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR REPLACE INTO session_preferences (session_id, per_order_cap, per_session_cap, updated_at)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, perOrderCap, perSessionCap, now);

  return {
    per_order_cap: perOrderCap,
    per_session_cap: perSessionCap,
  };
}

// -----------------------------------------------------------------------------
// Orders Queries
// -----------------------------------------------------------------------------

function parseOrderRow(row: any): Order {
  let shippingAddress: ShippingAddress | undefined = undefined;
  if (row.shipping_address) {
    try {
      shippingAddress = JSON.parse(row.shipping_address);
    } catch {
      shippingAddress = undefined;
    }
  }
  let offer: ProductOffer | undefined = undefined;
  if (row.offer) {
    try {
      offer = JSON.parse(row.offer);
    } catch {
      offer = undefined;
    }
  }
  let priceBreakdown: PriceBreakdown | undefined = undefined;
  if (row.price_breakdown) {
    try {
      priceBreakdown = JSON.parse(row.price_breakdown);
    } catch {
      priceBreakdown = undefined;
    }
  }
  return {
    id: row.id,
    catalog_item_id: row.catalog_item_id,
    item_name: row.item_name,
    amount: row.amount,
    currency: row.currency || "INR",
    razorpay_order_id: row.razorpay_order_id,
    razorpay_payment_id: row.razorpay_payment_id || undefined,
    razorpay_signature: row.razorpay_signature || undefined,
    status: row.status as OrderStatus,
    idempotency_key: row.idempotency_key,
    session_id: row.session_id,
    offer,
    price_breakdown: priceBreakdown,
    payment_method: row.payment_method || undefined,
    shipping_address: shippingAddress,
    failure_reason: row.failure_reason || undefined,
    website: row.website || offer?.site_name || undefined,
    seller: row.seller || offer?.seller_name || undefined,
    product_url: row.product_url || offer?.exact_url || undefined,
    variant: row.variant || undefined,
    quantity: row.quantity || 1,
    tracking_url: row.tracking_url || undefined,
    receipt_url: row.receipt_url || undefined,
    delivery_date: row.delivery_date || offer?.delivery_eta || undefined,
    category: row.category || undefined,
    created_at: row.created_at,
  };
}

export function getOrdersBySession(sessionId: string): Order[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM orders WHERE session_id = ? ORDER BY created_at DESC").all(sessionId);
  return rows.map(parseOrderRow);
}

export function getAllOrders(): Order[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
  return rows.map(parseOrderRow);
}

export function getOrderById(orderId: string): Order | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM orders WHERE id = ? OR razorpay_order_id = ?").get(orderId, orderId);
  return row ? parseOrderRow(row) : null;
}

export function getOrderByCustomerKey(idempotencyKey: string): Order | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM orders WHERE idempotency_key = ?").get(idempotencyKey);
  return row ? parseOrderRow(row) : null;
}

export function getSessionTotalSpent(sessionId: string): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE session_id = ? AND status IN ('captured', 'payment_success', 'order_confirmed', 'cod_confirmed')")
    .get(sessionId) as { total: number };
  return row ? row.total : 0;
}

export function insertOrder(order: Order): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO orders (
      id, catalog_item_id, item_name, amount, currency,
      razorpay_order_id, razorpay_payment_id, razorpay_signature, status,
      idempotency_key, session_id, offer, price_breakdown, payment_method,
      shipping_address, failure_reason, website, seller, product_url,
      variant, quantity, tracking_url, receipt_url, delivery_date, category, created_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?
    )
  `);
  stmt.run(
    order.id,
    order.catalog_item_id,
    order.item_name,
    order.amount,
    order.currency,
    order.razorpay_order_id,
    order.razorpay_payment_id || null,
    order.razorpay_signature || null,
    order.status,
    order.idempotency_key,
    order.session_id,
    order.offer ? JSON.stringify(order.offer) : null,
    order.price_breakdown ? JSON.stringify(order.price_breakdown) : null,
    order.payment_method || "Authorized UPI Payment",
    order.shipping_address ? JSON.stringify(order.shipping_address) : null,
    order.failure_reason || null,
    order.website || order.offer?.site_name || null,
    order.seller || order.offer?.seller_name || null,
    order.product_url || order.offer?.exact_url || null,
    order.variant || null,
    order.quantity || 1,
    order.tracking_url || null,
    order.receipt_url || null,
    order.delivery_date || order.offer?.delivery_eta || null,
    order.category || null,
    order.created_at
  );
}

export function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  options?: {
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    tracking_url?: string;
    receipt_url?: string;
    failure_reason?: string;
  }
): void {
  const db = getDb();
  const sets: string[] = ["status = ?"];
  const params: any[] = [status];

  if (options?.razorpay_payment_id) {
    sets.push("razorpay_payment_id = ?");
    params.push(options.razorpay_payment_id);
  }
  if (options?.razorpay_signature) {
    sets.push("razorpay_signature = ?");
    params.push(options.razorpay_signature);
  }
  if (options?.tracking_url) {
    sets.push("tracking_url = ?");
    params.push(options.tracking_url);
  }
  if (options?.receipt_url) {
    sets.push("receipt_url = ?");
    params.push(options.receipt_url);
  }
  if (options?.failure_reason) {
    sets.push("failure_reason = ?");
    params.push(options.failure_reason);
  }

  params.push(orderId, orderId);
  db.prepare(`UPDATE orders SET ${sets.join(", ")} WHERE id = ? OR razorpay_order_id = ?`).run(...params);
}

// -----------------------------------------------------------------------------
// Search History Queries
// -----------------------------------------------------------------------------

export function insertSearchHistory(
  entry: Partial<SearchHistoryEntry> & { session_id: string; query: string }
): void {
  const db = getDb();
  const id = entry.id || `search_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = entry.timestamp || new Date().toISOString();

  db.prepare(`
    INSERT INTO search_history (
      id, session_id, user_id, query, timestamp, results_count,
      filters, category, min_price, max_price, selected_product_id, source_websites
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `).run(
    id,
    entry.session_id,
    entry.user_id || entry.session_id,
    entry.query,
    now,
    entry.results_count || 0,
    JSON.stringify(entry.filters || {}),
    entry.category || null,
    entry.min_price || null,
    entry.max_price || null,
    entry.selected_product_id || null,
    JSON.stringify(entry.source_websites || ["Amazon India", "Croma", "Flipkart"])
  );
}

export function getSearchHistoryBySession(sessionId: string): SearchHistoryEntry[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM search_history WHERE session_id = ? OR user_id = ? ORDER BY timestamp DESC")
    .all(sessionId, sessionId) as any[];

  return rows.map((r) => ({
    id: r.id,
    session_id: r.session_id,
    user_id: r.user_id,
    query: r.query,
    timestamp: r.timestamp,
    results_count: r.results_count,
    filters: JSON.parse(r.filters || "{}"),
    category: r.category || undefined,
    min_price: r.min_price || undefined,
    max_price: r.max_price || undefined,
    selected_product_id: r.selected_product_id || undefined,
    source_websites: JSON.parse(r.source_websites || '["Amazon India", "Croma", "Flipkart"]'),
  }));
}

export const getSearchHistory = getSearchHistoryBySession;


export function getAllSearchHistory(): SearchHistoryEntry[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM search_history ORDER BY timestamp DESC").all() as any[];
  return rows.map((r) => ({
    id: r.id,
    session_id: r.session_id,
    user_id: r.user_id,
    query: r.query,
    timestamp: r.timestamp,
    results_count: r.results_count,
    filters: JSON.parse(r.filters || "{}"),
    category: r.category || undefined,
    min_price: r.min_price || undefined,
    max_price: r.max_price || undefined,
    selected_product_id: r.selected_product_id || undefined,
    source_websites: JSON.parse(r.source_websites || "[]"),
  }));
}

// -----------------------------------------------------------------------------
// Chat Sessions & History Queries
// -----------------------------------------------------------------------------

export function saveChatMessage(sessionId: string, msg: ChatMessage): void {
  const db = getDb();
  const now = msg.timestamp || new Date().toISOString();

  // Ensure session exists
  db.prepare(`
    INSERT INTO chat_sessions (id, session_id, user_id, title, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET updated_at = ?
  `).run(
    `csess_${sessionId}`,
    sessionId,
    sessionId,
    msg.content.substring(0, 45) || "Shopping Conversation",
    now,
    now,
    now
  );

  db.prepare(`
    INSERT OR REPLACE INTO chat_messages (id, session_id, role, content, payload, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    msg.id,
    sessionId,
    msg.role,
    msg.content,
    JSON.stringify({
      proposal: msg.proposal || null,
      refusal: msg.refusal || null,
      comparison: msg.comparison || null,
      grounded_products: msg.grounded_products || null,
      tool_calls: msg.tool_calls || null,
    }),
    now
  );
}

export function getChatMessagesBySession(sessionId: string): ChatMessage[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC").all(sessionId) as any[];

  return rows.map((r) => {
    let payload: any = {};
    try {
      payload = JSON.parse(r.payload || "{}");
    } catch {
      payload = {};
    }
    return {
      id: r.id,
      role: r.role,
      content: r.content,
      timestamp: r.timestamp,
      proposal: payload.proposal || undefined,
      refusal: payload.refusal || undefined,
      comparison: payload.comparison || undefined,
      grounded_products: payload.grounded_products || undefined,
      tool_calls: payload.tool_calls || undefined,
    };
  });
}

export function getChatSessions(): Array<{ id: string; session_id: string; title: string; created_at: string; updated_at: string; message_count: number }> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT cs.*, COUNT(cm.id) as message_count
    FROM chat_sessions cs
    LEFT JOIN chat_messages cm ON cs.session_id = cm.session_id
    GROUP BY cs.id
    ORDER BY cs.updated_at DESC
  `).all() as any[];

  return rows.map((r) => ({
    id: r.id,
    session_id: r.session_id,
    title: r.title,
    created_at: r.created_at,
    updated_at: r.updated_at,
    message_count: r.message_count,
  }));
}

// -----------------------------------------------------------------------------
// Commerce Reports (Export User Commerce History)
// -----------------------------------------------------------------------------

export function recordCommerceReport(sessionId: string, email: string, reportType: string): string {
  const db = getDb();
  const id = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO commerce_reports (id, session_id, user_id, email, report_type, status, created_at, delivered_at)
    VALUES (?, ?, ?, ?, ?, 'delivered', ?, ?)
  `).run(id, sessionId, sessionId, email, reportType, now, now);
  return id;
}

export function getCommerceReports(sessionId: string): Array<{ id: string; session_id: string; email: string; report_type: string; status: string; created_at: string; delivered_at?: string }> {
  const db = getDb();
  return db.prepare("SELECT * FROM commerce_reports WHERE session_id = ? ORDER BY created_at DESC").all(sessionId) as any[];
}

// -----------------------------------------------------------------------------
// Audit Log Queries
// -----------------------------------------------------------------------------

export function insertAuditLog(entry: AuditEntry): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO audit_log (
      id, timestamp, session_id, actor, action_type, reasoning, payload, result
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  stmt.run(
    entry.id,
    entry.timestamp,
    entry.session_id,
    entry.actor,
    entry.action_type,
    entry.reasoning,
    JSON.stringify(entry.payload),
    entry.result
  );
}

export function getAuditLogsBySession(sessionId: string): AuditEntry[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM audit_log WHERE session_id = ? ORDER BY timestamp ASC")
    .all(sessionId) as Array<{
    id: string;
    timestamp: string;
    session_id: string;
    actor: string;
    action_type: string;
    reasoning: string;
    payload: string;
    result: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    session_id: r.session_id,
    actor: r.actor as AuditEntry["actor"],
    action_type: r.action_type as AuditEntry["action_type"],
    reasoning: r.reasoning,
    payload: JSON.parse(r.payload || "{}"),
    result: r.result as AuditEntry["result"],
  }));
}

// -----------------------------------------------------------------------------
// Confirmation Token Queries
// -----------------------------------------------------------------------------

function parseTokenRow(row: any): ConfirmationToken {
  let shippingAddress: ShippingAddress | undefined = undefined;
  if (row.shipping_address) {
    try {
      shippingAddress = JSON.parse(row.shipping_address);
    } catch {
      shippingAddress = undefined;
    }
  }
  let offer: ProductOffer | undefined = undefined;
  if (row.offer) {
    try {
      offer = JSON.parse(row.offer);
    } catch {
      offer = undefined;
    }
  }
  let priceBreakdown: PriceBreakdown | undefined = undefined;
  if (row.price_breakdown) {
    try {
      priceBreakdown = JSON.parse(row.price_breakdown);
    } catch {
      priceBreakdown = undefined;
    }
  }
  return {
    token: row.token,
    session_id: row.session_id,
    catalog_item_id: row.catalog_item_id,
    item_name: row.item_name,
    amount: row.amount,
    currency: row.currency || "INR",
    idempotency_key: row.idempotency_key,
    offer,
    price_breakdown: priceBreakdown,
    payment_method: row.payment_method || "Authorized UPI (••••@okhdfcbank)",
    shipping_address: shippingAddress,
    reason: row.reason,
    status: row.status,
    created_at: row.created_at,
    expires_at: row.expires_at,
  };
}

export function insertConfirmationToken(token: ConfirmationToken): void {
  const db = getDb();
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
    token.token,
    token.session_id,
    token.catalog_item_id,
    token.item_name,
    token.amount,
    token.currency,
    token.idempotency_key,
    token.offer ? JSON.stringify(token.offer) : null,
    token.price_breakdown ? JSON.stringify(token.price_breakdown) : null,
    token.payment_method || "Authorized UPI (••••@okhdfcbank)",
    token.shipping_address ? JSON.stringify(token.shipping_address) : null,
    token.reason,
    token.status,
    token.created_at,
    token.expires_at
  );
}

export function getConfirmationToken(token: string): ConfirmationToken | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM confirmation_tokens WHERE token = ?").get(token);
  return row ? parseTokenRow(row) : null;
}

export function updateConfirmationTokenStatus(token: string, status: ConfirmationToken["status"]): void {
  const db = getDb();
  db.prepare("UPDATE confirmation_tokens SET status = ? WHERE token = ?").run(status, token);
}

// Reset session data for testing
export function clearSessionData(sessionId: string): void {
  const db = getDb();
  db.prepare("DELETE FROM orders WHERE session_id = ?").run(sessionId);
  db.prepare("DELETE FROM audit_log WHERE session_id = ?").run(sessionId);
  db.prepare("DELETE FROM confirmation_tokens WHERE session_id = ?").run(sessionId);
  db.prepare("DELETE FROM session_preferences WHERE session_id = ?").run(sessionId);
  db.prepare("DELETE FROM search_history WHERE session_id = ?").run(sessionId);
}

// -----------------------------------------------------------------------------
// Admin Aggregate Analytics Queries
// -----------------------------------------------------------------------------

export function getAggregateAnalytics(): AdminAnalyticsSummary {
  const db = getDb();

  // Search counts
  const totalSearchesRow = db.prepare("SELECT COUNT(*) as count FROM search_history").get() as { count: number } | undefined;
  const totalSearches = totalSearchesRow?.count || 0;

  // Orders and GMV
  const ordersRow = db.prepare(`
    SELECT COUNT(*) as total_orders, COALESCE(SUM(amount), 0) as gmv
    FROM orders
    WHERE status IN ('captured', 'cod_confirmed', 'shipped', 'delivered')
  `).get() as { total_orders: number; gmv: number } | undefined;

  const totalOrders = ordersRow?.total_orders || 0;
  const gmv = ordersRow?.gmv || 0;
  const conversionRate = totalSearches > 0 ? Math.round((totalOrders / totalSearches) * 1000) / 10 : 0;

  // Popular search terms
  const searchTermsRows = db.prepare(`
    SELECT query, COUNT(*) as count
    FROM search_history
    GROUP BY LOWER(TRIM(query))
    ORDER BY count DESC
    LIMIT 8
  `).all() as Array<{ query: string; count: number }>;

  const popular_search_terms = searchTermsRows.map((r) => ({ term: r.query, count: r.count }));

  // Category trends
  const categoryRows = db.prepare(`
    SELECT 
      COALESCE(c.category, 'General') as category,
      COUNT(DISTINCT o.id) as order_count,
      COALESCE(SUM(o.amount), 0) as revenue
    FROM orders o
    LEFT JOIN catalog c ON o.catalog_item_id = c.id
    WHERE o.status IN ('captured', 'cod_confirmed', 'shipped', 'delivered')
    GROUP BY c.category
  `).all() as Array<{ category: string; order_count: number; revenue: number }>;

  const categorySearchRows = db.prepare(`
    SELECT COALESCE(category, 'General') as category, COUNT(*) as search_count
    FROM search_history
    WHERE category IS NOT NULL
    GROUP BY category
  `).all() as Array<{ category: string; search_count: number }>;

  const searchMap = new Map<string, number>();
  for (const s of categorySearchRows) searchMap.set(s.category, s.search_count);

  const category_trends = [
    { category: "Audio", search_count: searchMap.get("Audio") || 12, order_count: 0, revenue: 0 },
    { category: "Wearables", search_count: searchMap.get("Wearables") || 8, order_count: 0, revenue: 0 },
    { category: "Accessories", search_count: searchMap.get("Accessories") || 6, order_count: 0, revenue: 0 },
    { category: "Office", search_count: searchMap.get("Office") || 4, order_count: 0, revenue: 0 },
  ];

  for (const cr of categoryRows) {
    const existing = category_trends.find((t) => t.category.toLowerCase() === cr.category.toLowerCase());
    if (existing) {
      existing.order_count = cr.order_count;
      existing.revenue = cr.revenue;
    } else {
      category_trends.push({
        category: cr.category,
        search_count: searchMap.get(cr.category) || 1,
        order_count: cr.order_count,
        revenue: cr.revenue,
      });
    }
  }

  // Brand trends
  const brand_trends = [
    { brand: "Aura Audio", count: 18 },
    { brand: "PulseSound", count: 14 },
    { brand: "Chronos", count: 11 },
    { brand: "MagVolt", count: 9 },
    { brand: "SonicStudio", count: 5 },
  ];

  // Price band distribution
  const bandRows = db.prepare(`
    SELECT
      CASE
        WHEN amount < 2000 THEN 'Under ₹2,000'
        WHEN amount BETWEEN 2000 AND 5000 THEN '₹2,000 - ₹5,000'
        WHEN amount BETWEEN 5000 AND 10000 THEN '₹5,000 - ₹10,000'
        ELSE 'Above ₹10,000'
      END as band,
      COUNT(*) as count
    FROM orders
    GROUP BY band
  `).all() as Array<{ band: string; count: number }>;

  const defaultBands = [
    { band: "Under ₹2,000", count: 0 },
    { band: "₹2,000 - ₹5,000", count: 0 },
    { band: "₹5,000 - ₹10,000", count: 0 },
    { band: "Above ₹10,000", count: 0 },
  ];

  for (const b of bandRows) {
    const match = defaultBands.find((d) => d.band === b.band);
    if (match) match.count = b.count;
  }

  // Payment method breakdown
  const paymentRows = db.prepare(`
    SELECT 
      CASE
        WHEN payment_method LIKE '%Cash on Delivery%' OR payment_method LIKE '%COD%' THEN 'Cash on Delivery (COD)'
        WHEN payment_method LIKE '%UPI%' THEN 'UPI'
        ELSE 'Cards / NetBanking'
      END as method,
      COUNT(*) as count
    FROM orders
    GROUP BY method
  `).all() as Array<{ method: string; count: number }>;

  const totalPaymentOrders = paymentRows.reduce((acc, p) => acc + p.count, 0) || 1;
  const payment_method_breakdown = paymentRows.map((p) => ({
    method: p.method,
    count: p.count,
    percentage: Math.round((p.count / totalPaymentOrders) * 100),
  }));

  if (payment_method_breakdown.length === 0) {
    payment_method_breakdown.push(
      { method: "UPI", count: 1, percentage: 60 },
      { method: "Cash on Delivery (COD)", count: 1, percentage: 40 }
    );
  }

  return {
    total_searches: totalSearches,
    total_orders: totalOrders,
    total_gross_merchandise_value: gmv,
    conversion_rate: conversionRate,
    popular_search_terms: popular_search_terms.length > 0 ? popular_search_terms : [
      { term: "Wireless Earbuds", count: 12 },
      { term: "Bluetooth Speaker", count: 9 },
      { term: "Under ₹3,000", count: 7 },
    ],
    category_trends,
    brand_trends,
    price_band_distribution: defaultBands,
    payment_method_breakdown,
  };
}
