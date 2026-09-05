export type Currency = "INR";

export interface ProductOffer {
  id: string;
  product_id: string;
  site_name: string;
  seller_name: string;
  base_price: number;
  shipping_fee: number;
  discount: number;
  final_price: number;
  rating: number;
  review_count: number;
  delivery_eta: string;
  in_stock: boolean;
  return_policy: string;
  is_verified: boolean;
  exact_url?: string;
  product_url?: string;
  cod_available?: boolean;
  verification_status: "verified" | "unverified" | "admin_overridden";
  verification_details?: {
    policy_check: boolean;
    review_authenticity_score: number;
    seller_reputation: "trusted" | "standard" | "caution";
    rejection_reasons?: string[];
  };
}

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  price: number; // in INR (whole rupees)
  currency: Currency;
  stock: number;
  category: "Audio" | "Accessories" | "Wearables" | "Office" | "Laptops" | "Electronics" | string;
  color: string;
  specifications: string[];
  brand?: string;
  rating?: number;
  review_count?: number;
  offers?: ProductOffer[];
  policy_notes?: string;
  image?: string;
  exact_url?: string;
  website?: string;
  seller?: string;
  cod_available?: boolean;
}

export type AddressTag = "home" | "office" | "college" | "work" | "other";

export interface ShippingAddress {
  id: string;
  session_id: string;
  tag: AddressTag;
  recipient_name: string;
  address_line1: string;
  city: string;
  postal_code: string;
  state?: string;
  phone?: string;
  is_default: boolean;
}

export type OrderStatus =
  | "pending"
  | "awaiting_payment"
  | "payment_processing"
  | "payment_success"
  | "payment_failed"
  | "cod_confirmed"
  | "order_processing"
  | "order_confirmed"
  | "order_failed"
  | "cancelled"
  | "captured"
  | "declined";

export interface PriceBreakdown {
  base_price: number;
  shipping_fee: number;
  discount: number;
  taxes: string;
  total: number;
}

export interface Order {
  id: string;
  catalog_item_id: string;
  item_name: string;
  amount: number;
  currency: Currency;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  status: OrderStatus;
  idempotency_key: string;
  session_id: string;
  offer?: ProductOffer;
  price_breakdown?: PriceBreakdown;
  payment_method?: string;
  shipping_address?: ShippingAddress;
  failure_reason?: string;
  created_at: string;
  website?: string;
  seller?: string;
  product_url?: string;
  variant?: string;
  quantity?: number;
  tracking_url?: string;
  receipt_url?: string;
  delivery_date?: string;
  category?: string;
}

export type Actor = "agent" | "buyer" | "system";

export type AuditActionType =
  | "search"
  | "product_lookup"
  | "compare"
  | "vendor_verification"
  | "propose"
  | "confirm_request"
  | "confirm_result"
  | "guardrail_check"
  | "order_created"
  | "order_result"
  | "refusal"
  | "payment_declined"
  | "webhook_received";

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
  offer?: ProductOffer;
  price_breakdown?: PriceBreakdown;
  shipping_address?: ShippingAddress;
  payment_method?: string;
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

export interface ProductComparison {
  title: string;
  summary: string;
  products: CatalogItem[];
  matrix: {
    attribute: string;
    values: Record<string, string>;
  }[];
  offers?: ProductOffer[];
  recommendation: {
    best_value_id?: string;
    top_pick_id?: string;
    cheapest_offer_id?: string;
    best_rated_offer_id?: string;
    best_value_offer_id?: string;
    rationale: string;
  };
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  referenced_message_id?: string;
  referenced_snippet?: string;
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
    offer?: ProductOffer;
    price_breakdown?: PriceBreakdown;
    payment_method?: string;
    shipping_address?: ShippingAddress;
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
  comparison?: ProductComparison;
}

export interface VendorOverride {
  id: string;
  seller_name: string;
  site_name: string;
  status: "allowed" | "blocked";
  note?: string;
  updated_at: string;
}

export interface SessionCaps {
  per_order_cap: number;
  per_session_cap: number;
}

export interface SessionInfo {
  session_id: string;
  total_spent: number;
  order_count: number;
  per_order_cap: number;
  per_session_cap: number;
}

export interface SearchHistoryEntry {
  id: string;
  session_id: string;
  user_id?: string;
  query: string;
  timestamp: string;
  results_count: number;
  filters: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    color?: string;
    brand?: string;
    codOnly?: boolean;
    specKeyword?: string;
  };
  category?: string;
  min_price?: number;
  max_price?: number;
  selected_product_id?: string;
  source_websites: string[];
}

export interface PurchaseHistoryEntry {
  id: string;
  session_id: string;
  user_id?: string;
  product_id: string;
  product_name: string;
  seller: string;
  website: string;
  price: number;
  quantity: number;
  variant?: string;
  payment_method: string;
  order_id: string;
  transaction_id?: string;
  status: OrderStatus;
  purchase_timestamp: string;
  delivery_date?: string;
  category?: string;
  exact_url?: string;
  tracking_url?: string;
  receipt_url?: string;
  shipping_address?: ShippingAddress;
}

export interface AdminAnalyticsSummary {
  total_searches: number;
  total_orders: number;
  total_gross_merchandise_value: number;
  total_revenue?: number;
  conversion_rate: number;
  popular_search_terms: { term: string; count: number }[];
  category_trends: { category: string; search_count: number; order_count: number; revenue: number }[];
  brand_trends: { brand: string; count: number }[];
  price_band_distribution: { band: string; count: number }[];
  payment_method_breakdown: { method: string; count: number; percentage: number }[];
  search_frequency?: { query: string; count: number }[];
  top_searched_products?: { name: string; count: number }[];
  top_categories?: { category: string; search_count: number; order_count: number }[];
  top_brands?: { brand: string; count: number }[];
  price_distribution?: { range: string; count: number }[];
  popular_filters?: { filter: string; count: number }[];
  purchase_trends?: { product_name: string; total_quantity: number; revenue: number }[];
  seasonal_patterns?: { period: string; trend_description: string; key_categories: string[] }[];
}

export interface PersonalizedRecommendation {
  product: CatalogItem;
  product_id?: string;
  name?: string;
  brand?: string;
  price?: number;
  website?: string;
  image?: string;
  rating?: number;
  reason: string;
  affinity_category?: string;
  score?: number;
  relevance_score?: number;
  trigger_type?: "search_affinity" | "cross_sell" | "frequently_bought_together" | "trending" | string;
  based_on?: string;
}


