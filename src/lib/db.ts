import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { CatalogItem, Order, AuditEntry, ConfirmationToken } from "@/types";

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
  }
  return dbInstance;
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
      policy_notes TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      catalog_item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      razorpay_order_id TEXT NOT NULL,
      razorpay_payment_id TEXT,
      status TEXT NOT NULL CHECK(status IN ('pending', 'captured', 'declined', 'failed')),
      idempotency_key TEXT NOT NULL UNIQUE,
      session_id TEXT NOT NULL,
      failure_reason TEXT,
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
      reason TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'confirmed', 'cancelled', 'expired', 'spent')),
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tokens_session ON confirmation_tokens(session_id);
  `);
}

// -----------------------------------------------------------------------------
// Catalog Queries
// -----------------------------------------------------------------------------

export function getAllCatalogItems(): CatalogItem[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM catalog ORDER BY category, price ASC").all();
  return rows as CatalogItem[];
}

export function getCatalogItemById(id: string): CatalogItem | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM catalog WHERE id = ?").get(id);
  return (row as CatalogItem) || null;
}

export function searchCatalog(query: string, category?: string, maxPrice?: number): CatalogItem[] {
  const db = getDb();
  let sql = "SELECT * FROM catalog WHERE 1=1";
  const params: (string | number)[] = [];

  if (query && query.trim()) {
    sql += " AND (name LIKE ? OR description LIKE ? OR category LIKE ?)";
    const wildcard = `%${query.trim()}%`;
    params.push(wildcard, wildcard, wildcard);
  }

  if (category && category.trim()) {
    sql += " AND category = ?";
    params.push(category.trim());
  }

  if (typeof maxPrice === "number" && maxPrice > 0) {
    sql += " AND price <= ?";
    params.push(maxPrice);
  }

  sql += " ORDER BY price ASC LIMIT 10";
  const rows = db.prepare(sql).all(...params);
  return rows as CatalogItem[];
}

// -----------------------------------------------------------------------------
// Orders Queries
// -----------------------------------------------------------------------------

export function getOrdersBySession(sessionId: string): Order[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM orders WHERE session_id = ? ORDER BY created_at DESC").all(sessionId);
  return rows as Order[];
}

export function getOrderById(orderId: string): Order | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM orders WHERE id = ? OR razorpay_order_id = ?").get(orderId, orderId);
  return (row as Order) || null;
}

export function getOrderByCustomerKey(idempotencyKey: string): Order | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM orders WHERE idempotency_key = ?").get(idempotencyKey);
  return (row as Order) || null;
}

export function getSessionTotalSpent(sessionId: string): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE session_id = ? AND status = 'captured'")
    .get(sessionId) as { total: number };
  return row ? row.total : 0;
}

export function insertOrder(order: Order): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO orders (
      id, catalog_item_id, item_name, amount, currency,
      razorpay_order_id, razorpay_payment_id, status,
      idempotency_key, session_id, failure_reason, created_at
    ) VALUES (
      @id, @catalog_item_id, @item_name, @amount, @currency,
      @razorpay_order_id, @razorpay_payment_id, @status,
      @idempotency_key, @session_id, @failure_reason, @created_at
    )
  `);
  stmt.run(order);
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

export function insertConfirmationToken(token: ConfirmationToken): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO confirmation_tokens (
      token, session_id, catalog_item_id, item_name, amount,
      currency, idempotency_key, reason, status, created_at, expires_at
    ) VALUES (
      @token, @session_id, @catalog_item_id, @item_name, @amount,
      @currency, @idempotency_key, @reason, @status, @created_at, @expires_at
    )
  `);
  stmt.run(token);
}

export function getConfirmationToken(token: string): ConfirmationToken | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM confirmation_tokens WHERE token = ?").get(token);
  return (row as ConfirmationToken) || null;
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
}
