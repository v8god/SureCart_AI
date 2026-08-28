export type Currency = "INR";

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  price: number; // in INR (whole rupees)
  currency: Currency;
  stock: number;
  category: "Audio" | "Accessories" | "Wearables" | "Office";
  policy_notes?: string;
}

export type OrderStatus = "pending" | "captured" | "declined" | "failed";

export interface Order {
  id: string;
  catalog_item_id: string;
  item_name: string;
  amount: number;
  currency: Currency;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  status: OrderStatus;
  idempotency_key: string;
  session_id: string;
  failure_reason?: string;
  created_at: string;
}

export type Actor = "agent" | "buyer" | "system";

export type AuditActionType =
  | "search"
  | "product_lookup"
  | "propose"
  | "confirm_request"
  | "confirm_result"
  | "guardrail_check"
  | "order_created"
  | "order_result"
  | "refusal"
  | "payment_declined";

export interface AuditEntry {
  id: string;
  timestamp: string;
  session_id: string;
  actor: Actor;
  action_type: AuditActionType;
  reasoning: string;
  payload: Record<string, unknown>;
  result: "success" | "refused" | "declined" | "failed" | "pending" | "info";
}

export type TokenStatus = "pending" | "confirmed" | "cancelled" | "expired" | "spent";

export interface ConfirmationToken {
  token: string;
  session_id: string;
  catalog_item_id: string;
  item_name: string;
  amount: number;
  currency: Currency;
  idempotency_key: string;
  reason: string;
  status: TokenStatus;
  created_at: string;
  expires_at: string;
}

export interface GuardrailCheckDetail {
  name: string;
  passed: boolean;
  message: string;
  limit?: number;
  current_value?: number;
}

export interface GuardrailEvaluation {
  allowed: boolean;
  refusal_reason?: string;
  checks: {
    per_order_cap: GuardrailCheckDetail;
    session_cap: GuardrailCheckDetail;
    confirmation_match: GuardrailCheckDetail;
    idempotency: GuardrailCheckDetail;
  };
}

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  tool_calls?: {
    id: string;
    name: string;
    args: Record<string, unknown>;
    result?: unknown;
    status: "executing" | "completed" | "failed";
  }[];
  proposal?: {
    token: string;
    item: CatalogItem;
    amount: number;
    currency: Currency;
    reason: string;
    idempotency_key: string;
    status: "pending" | "confirming" | "success" | "declined" | "cancelled";
    order?: Order;
    error_message?: string;
    decline_code?: string;
  };
  refusal?: {
    reason: string;
    amount?: number;
    limit?: number;
  };
  grounded_products?: CatalogItem[];
}

export interface SessionInfo {
  session_id: string;
  total_spent: number;
  order_count: number;
  per_order_cap: number;
  per_session_cap: number;
}
