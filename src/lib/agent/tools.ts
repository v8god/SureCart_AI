import { searchCatalog, getCatalogItemById, getOrderById, insertAuditLog, insertConfirmationToken } from "@/lib/db";
import { evaluateProposalCaps } from "@/lib/guardrails";
import { CatalogItem, Order, AuditEntry } from "@/types";

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  refused?: boolean;
  refusal_reason?: string;
}

/**
 * Tool 1: search_catalog
 * Searches grounded catalog store and logs audit entry.
 */
export function toolSearchCatalog(
  sessionId: string,
  query: string,
  category?: string,
  maxPrice?: number
): { items: CatalogItem[]; summary: string } {
  const items = searchCatalog(query, category, maxPrice);

  // Log audit entry
  insertAuditLog({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    actor: "agent",
    action_type: "search",
    reasoning: `Searched catalog for query: "${query}"${category ? ` in category "${category}"` : ""}${
      maxPrice ? ` under ₹${maxPrice}` : ""
    }`,
    payload: {
      query,
      category: category || null,
      max_price: maxPrice || null,
      results_count: items.length,
      matched_ids: items.map((i) => i.id),
    },
    result: "success",
  });

  const summary =
    items.length > 0
      ? `Found ${items.length} item(s) in catalog matching "${query}".`
      : `No items found matching "${query}".`;

  return { items, summary };
}

/**
 * Tool 2: get_product
 * Retrieves exact product details from catalog and logs audit entry.
 */
export function toolGetProduct(sessionId: string, productId: string): { item: CatalogItem | null; summary: string } {
  const item = getCatalogItemById(productId);

  insertAuditLog({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    actor: "agent",
    action_type: "product_lookup",
    reasoning: item
      ? `Verified catalog item "${item.name}" (Price: ₹${item.price.toLocaleString("en-IN")}, Stock: ${item.stock})`
      : `Looked up product ID "${productId}" — not found in catalog`,
    payload: {
      product_id: productId,
      found: Boolean(item),
      price: item?.price || null,
      stock: item?.stock || null,
    },
    result: item ? "success" : "failed",
  });

  const summary = item
    ? `Product ${item.name} is ₹${item.price} (${item.stock} in stock).`
    : `Product ${productId} not found.`;

  return { item, summary };
}

/**
 * Tool 3: propose_purchase
 * Performs pre-proposal spend-cap checks and generates an unspent confirmation token.
 * Refusal occurs BEFORE confirmation is offered if over cap (Rule R2 & R3).
 */
export function toolProposePurchase(
  sessionId: string,
  productId: string,
  reason: string
): {
  allowed: boolean;
  item?: CatalogItem;
  amount?: number;
  token?: string;
  idempotency_key?: string;
  refusal_reason?: string;
} {
  const item = getCatalogItemById(productId);
  if (!item) {
    return {
      allowed: false,
      refusal_reason: `Cannot propose purchase: Product ID "${productId}" does not exist in the catalog.`,
    };
  }

  // Pre-evaluate spend caps
  const evaluation = evaluateProposalCaps(sessionId, item.price, item);
  if (!evaluation.allowed) {
    return {
      allowed: false,
      refusal_reason: evaluation.refusalReason,
      item,
      amount: item.price,
    };
  }

  // Generate unique confirmation token & idempotency key
  const token = `token_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min expiry

  insertConfirmationToken({
    token,
    session_id: sessionId,
    catalog_item_id: item.id,
    item_name: item.name,
    amount: item.price,
    currency: item.currency,
    idempotency_key: idempotencyKey,
    reason,
    status: "pending",
    created_at: createdAt,
    expires_at: expiresAt,
  });

  // Record audit log for proposal
  insertAuditLog({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: createdAt,
    session_id: sessionId,
    actor: "agent",
    action_type: "propose",
    reasoning: `Proposed purchase of ${item.name} for ₹${item.price.toLocaleString("en-IN")}. Reason: "${reason}"`,
    payload: {
      item_id: item.id,
      item_name: item.name,
      amount: item.price,
      currency: item.currency,
      confirmation_token: token,
      idempotency_key: idempotencyKey,
    },
    result: "pending",
  });

  return {
    allowed: true,
    item,
    amount: item.price,
    token,
    idempotency_key: idempotencyKey,
  };
}

/**
 * Tool 4: get_order_status
 * Checks the status of an existing order.
 */
export function toolGetOrderStatus(sessionId: string, orderId: string): { order: Order | null; summary: string } {
  const order = getOrderById(orderId);

  insertAuditLog({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    actor: "agent",
    action_type: "order_result",
    reasoning: order
      ? `Retrieved status for order ${order.id}: status=${order.status}`
      : `Order ${orderId} not found in store`,
    payload: {
      order_id: orderId,
      status: order?.status || null,
    },
    result: order ? "success" : "failed",
  });

  const summary = order
    ? `Order ${order.id} for ${order.item_name} (₹${order.amount}) is currently ${order.status}.`
    : `Order ${orderId} not found.`;

  return { order, summary };
}
