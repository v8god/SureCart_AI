import {
  searchCatalog,
  getCatalogItemById,
  getOrderById,
  getAddresses,
  getAddressByTag,
  getProductOffers,
  getOfferById,
  getAllOffers,
  verifySeller,
  insertAuditLog,
  insertConfirmationToken,
  insertSearchHistory,
} from "@/lib/db";
import { evaluateProposalCaps } from "@/lib/guardrails";
import {
  discoverProducts,
  verifyCODAvailability,
} from "@/lib/commerce/discovery";
import {
  CatalogItem,
  Order,
  AuditEntry,
  ShippingAddress,
  ProductComparison,
  ProductOffer,
  PriceBreakdown,
} from "@/types";

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  refused?: boolean;
  refusal_reason?: string;
}

/**
 * Tool 1: search_catalog
 * Searches grounded catalog store with price range, category, color, and specs.
 * Enriches each product with cross-site seller offers.
 */
export function toolSearchCatalog(
  sessionId: string,
  params: {
    query?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    color?: string;
    specKeyword?: string;
  }
): { items: CatalogItem[]; summary: string } {
  const items = searchCatalog(params);

  // Record user search history for personalization and analytics
  try {
    insertSearchHistory({
      session_id: sessionId,
      query: params.query || (params.category ? `Category: ${params.category}` : "All Products"),
      filters: params,
      results_count: items.length,
    });
  } catch (err) {
    console.error("Failed to record search history:", err);
  }

  // Log audit entry
  insertAuditLog({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    actor: "agent",
    action_type: "search",
    reasoning: `Searched catalog for: "${params.query || "all"}"${params.category ? ` [Category: ${params.category}]` : ""}${
      params.color ? ` [Color: ${params.color}]` : ""
    }${params.minPrice ? ` [Min ₹${params.minPrice}]` : ""}${params.maxPrice ? ` [Max ₹${params.maxPrice}]` : ""}`,
    payload: {
      ...params,
      results_count: items.length,
      matched_ids: items.map((i) => i.id),
      total_offers: items.reduce((acc, item) => acc + (item.offers?.length || 0), 0),
    },
    result: "success",
  });

  const totalOffers = items.reduce((acc, item) => acc + (item.offers?.length || 0), 0);
  const summary =
    items.length > 0
      ? `Found ${items.length} product(s) across ${totalOffers} cross-site seller offers matching filters.`
      : `No items found matching the specified criteria.`;

  return { items, summary };
}

/**
 * Dynamic Multi-Source Marketplace Discovery Tool
 */
export async function toolDiscoverMarketplaces(
  sessionId: string,
  query: string,
  filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    color?: string;
    brand?: string;
    seller?: string;
  }
) {
  const result = await discoverProducts(query, filters || {});

  try {
    insertSearchHistory({
      session_id: sessionId,
      query: query || "Marketplace Discovery",
      filters: filters || {},
      results_count: result.products.length,
    });
  } catch (err) {
    console.error("Failed to record discovery search history:", err);
  }

  insertAuditLog({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    actor: "agent",
    action_type: "search",
    reasoning: `Discovered ${result.products.length} live product(s) across ${result.sources.join(", ")} for "${query}"`,
    payload: {
      query,
      sources: result.sources,
      products_found: result.products.length,
    },
    result: "success",
  });

  return result;
}

/**
 * Tool 2: get_product
 * Retrieves exact product details with cross-site offers and logs audit entry.
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
      ? `Verified catalog item "${item.name}" with ${item.offers?.length || 0} seller offer(s) (Price: ₹${item.price.toLocaleString("en-IN")}, Stock: ${item.stock}, Color: ${item.color})`
      : `Looked up product ID "${productId}" — not found in catalog`,
    payload: {
      product_id: productId,
      found: Boolean(item),
      price: item?.price || null,
      offers_count: item?.offers?.length || 0,
      stock: item?.stock || null,
    },
    result: item ? "success" : "failed",
  });

  const summary = item
    ? `Product ${item.name} is ₹${item.price} (${item.stock} in stock) with ${item.offers?.length || 0} seller offer(s).`
    : `Product ${productId} not found.`;

  return { item, summary };
}

/**
 * Tool 3: verify_seller_offer
 * Performs seller verification and policy compliance check before purchase.
 */
export function toolVerifySeller(
  sessionId: string,
  sellerName: string,
  siteName: string,
  returnPolicy?: string,
  rating: number = 4.5
) {
  const verification = verifySeller(sellerName, siteName, returnPolicy, rating);

  insertAuditLog({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    actor: "system",
    action_type: "vendor_verification",
    reasoning: `Evaluated seller "${sellerName}" on "${siteName}": ${
      verification.verified ? "VERIFIED (Passed compliance & review checks)" : "REJECTED (Failed compliance criteria)"
    }`,
    payload: {
      seller_name: sellerName,
      site_name: siteName,
      rating,
      return_policy: returnPolicy || null,
      verification_status: verification.status,
      details: verification.details,
    },
    result: verification.verified ? "success" : "refused",
  });

  return verification;
}

/**
 * Tool 4: compare_products
 * Compares two or more products or cross-site seller offers side-by-side on price, seller, rating, and value.
 */
export function toolCompareProducts(
  sessionId: string,
  productIds: string[],
  userIntent?: string
): { comparison: ProductComparison | null; summary: string } {
  const products: CatalogItem[] = [];
  for (const id of productIds) {
    const item = getCatalogItemById(id);
    if (item) products.push(item);
  }

  if (products.length === 0) {
    return {
      comparison: null,
      summary: "No catalog products found to generate a comparison.",
    };
  }

  // Collect all available seller offers
  const allOffers: ProductOffer[] = [];
  for (const p of products) {
    if (p.offers && p.offers.length > 0) {
      allOffers.push(...p.offers);
    }
  }

  // Comparison matrix features
  const matrix: ProductComparison["matrix"] = [
    {
      attribute: "Starting Price",
      values: Object.fromEntries(products.map((p) => [p.id, `₹${p.price.toLocaleString("en-IN")}`])),
    },
    {
      attribute: "Available Sellers",
      values: Object.fromEntries(
        products.map((p) => [
          p.id,
          p.offers && p.offers.length > 0
            ? p.offers.map((o) => `${o.site_name} (₹${o.final_price.toLocaleString("en-IN")})`).join(" • ")
            : "Direct Catalog",
        ])
      ),
    },
    {
      attribute: "Customer Rating",
      values: Object.fromEntries(
        products.map((p) => [p.id, `${p.rating || 4.5} ★ (${(p.review_count || 120).toLocaleString("en-IN")} reviews)`])
      ),
    },
    {
      attribute: "Exchange / Return",
      values: Object.fromEntries(
        products.map((p) => [
          p.id,
          p.offers && p.offers[0] ? p.offers[0].return_policy : "7 Days Replacement / Return",
        ])
      ),
    },
    {
      attribute: "Color & Finish",
      values: Object.fromEntries(products.map((p) => [p.id, p.color])),
    },
    {
      attribute: "Key Highlights",
      values: Object.fromEntries(
        products.map((p) => [p.id, p.specifications.slice(0, 2).join(" • ") || p.description])
      ),
    },
  ];

  // Identify Best Value, Cheapest, and Best Rated offers
  let cheapestOffer: ProductOffer | undefined = undefined;
  let bestRatedOffer: ProductOffer | undefined = undefined;
  let bestValueOffer: ProductOffer | undefined = undefined;

  if (allOffers.length > 0) {
    cheapestOffer = [...allOffers].sort((a, b) => a.final_price - b.final_price)[0];
    bestRatedOffer = [...allOffers].sort((a, b) => b.rating - a.rating)[0];
    // Best value: high rating with lowest price
    bestValueOffer = [...allOffers].sort(
      (a, b) => a.final_price / (a.rating || 1) - b.final_price / (b.rating || 1)
    )[0];
  }

  const sortedByPrice = [...products].sort((a, b) => a.price - b.price);
  const bestValueItem = sortedByPrice[0];
  const topPickItem = products[0];

  let rationale = `${bestValueItem.name} offers the best price-to-feature ratio at ₹${bestValueItem.price.toLocaleString(
    "en-IN"
  )}`;

  if (cheapestOffer && bestRatedOffer) {
    if (cheapestOffer.id === bestRatedOffer.id) {
      rationale = `**${cheapestOffer.site_name} (${cheapestOffer.seller_name})** offers both the lowest price at ₹${cheapestOffer.final_price.toLocaleString(
        "en-IN"
      )} and top rating of ${cheapestOffer.rating}★.`;
    } else {
      rationale = `**${cheapestOffer.site_name}** offers the lowest price (₹${cheapestOffer.final_price.toLocaleString(
        "en-IN"
      )}), while **${bestRatedOffer.site_name}** has the highest rating (${bestRatedOffer.rating}★ with ${bestRatedOffer.return_policy}).`;
    }
  }

  const comparison: ProductComparison = {
    title: products.length > 1 ? `Comparison: ${products.map((p) => p.name).join(" vs ")}` : `Cross-Site Price Comparison: ${products[0].name}`,
    summary: `Compared ${products.length} product(s) across ${allOffers.length} seller offer(s).`,
    products,
    matrix,
    offers: allOffers,
    recommendation: {
      best_value_id: bestValueItem.id,
      top_pick_id: topPickItem.id,
      cheapest_offer_id: cheapestOffer?.id,
      best_rated_offer_id: bestRatedOffer?.id,
      best_value_offer_id: bestValueOffer?.id,
      rationale,
    },
  };

  insertAuditLog({
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    actor: "agent",
    action_type: "compare",
    reasoning: `Generated cross-site comparison matrix for ${products.length} product(s) (${products.map((p) => p.name).join(", ")}) across ${allOffers.length} seller offer(s)`,
    payload: {
      compared_ids: products.map((p) => p.id),
      offers_compared: allOffers.map((o) => ({ id: o.id, site: o.site_name, price: o.final_price, rating: o.rating })),
      user_intent: userIntent || null,
    },
    result: "success",
  });

  return {
    comparison,
    summary: `Generated grounded comparison across ${products.length} product(s) and ${allOffers.length} seller offer(s).`,
  };
}

/**
 * Tool 5: get_shipping_addresses
 * Fetches saved delivery addresses for session.
 */
export function toolGetShippingAddresses(sessionId: string): { addresses: ShippingAddress[]; summary: string } {
  const addresses = getAddresses(sessionId);
  return {
    addresses,
    summary: `Found ${addresses.length} saved address(es) tagged: ${addresses.map((a) => a.tag).join(", ")}.`,
  };
}

/**
 * Tool 6: propose_purchase
 * Performs pre-proposal spend-cap checks, seller verification, itemized price breakdown, natural language address resolution, COD eligibility check, and generates confirmation token.
 */
export function toolProposePurchase(
  sessionId: string,
  productId: string,
  reason: string,
  addressTagOrId?: string,
  preferredOfferId?: string,
  paymentMethodPreference?: string
): {
  allowed: boolean;
  item?: CatalogItem;
  amount?: number;
  offer?: ProductOffer;
  price_breakdown?: PriceBreakdown;
  payment_method?: string;
  shipping_address?: ShippingAddress;
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

  // Select verified seller offer
  let selectedOffer: ProductOffer | undefined = undefined;
  if (preferredOfferId) {
    selectedOffer = getOfferById(preferredOfferId) || undefined;
  }
  if (!selectedOffer && item.offers && item.offers.length > 0) {
    // Pick cheapest verified offer by default
    const verifiedOffers = item.offers.filter((o) => o.is_verified);
    selectedOffer = verifiedOffers[0] || item.offers[0];
  }

  // Verify seller safety gate
  if (selectedOffer) {
    const sellerVer = toolVerifySeller(
      sessionId,
      selectedOffer.seller_name,
      selectedOffer.site_name,
      selectedOffer.return_policy,
      selectedOffer.rating
    );

    if (!sellerVer.verified) {
      return {
        allowed: false,
        refusal_reason: `Purchase blocked: Seller "${selectedOffer.seller_name}" on ${selectedOffer.site_name} did not pass safety verification.`,
        item,
        amount: selectedOffer.final_price,
      };
    }
  }

  const finalAmount = selectedOffer ? selectedOffer.final_price : item.price;
  const basePrice = selectedOffer ? selectedOffer.base_price : item.price;
  const shippingFee = selectedOffer ? selectedOffer.shipping_fee : 0;
  const discount = selectedOffer ? selectedOffer.discount : 0;

  const priceBreakdown: PriceBreakdown = {
    base_price: basePrice,
    shipping_fee: shippingFee,
    discount: discount,
    taxes: "Included (GST 18%)",
    total: finalAmount,
  };

  // Pre-evaluate spend caps
  const evaluation = evaluateProposalCaps(sessionId, finalAmount, item);
  if (!evaluation.allowed) {
    return {
      allowed: false,
      refusal_reason: evaluation.refusalReason,
      item,
      amount: finalAmount,
      offer: selectedOffer,
      price_breakdown: priceBreakdown,
    };
  }

  // Natural language Address Resolution across user's presets
  let shippingAddress: ShippingAddress | undefined = undefined;
  const savedAddresses = getAddresses(sessionId);

  if (addressTagOrId) {
    const query = addressTagOrId.toLowerCase().trim();
    // 1. Exact match on tag or id
    shippingAddress = savedAddresses.find(
      (a) => a.tag.toLowerCase() === query || a.id.toLowerCase() === query
    );
    // 2. Substring match (e.g. "home", "work", "office", "college", "hostel", or city)
    if (!shippingAddress) {
      shippingAddress = savedAddresses.find(
        (a) =>
          a.tag.toLowerCase().includes(query) ||
          query.includes(a.tag.toLowerCase()) ||
          a.city.toLowerCase().includes(query)
      );
    }
  }

  if (!shippingAddress) {
    shippingAddress = savedAddresses.find((a) => a.is_default) || savedAddresses[0] || undefined;
  }

  // Payment Method & COD Verification
  let paymentMethod = "Razorpay (UPI / Cards / NetBanking)";
  const isCOD = Boolean(
    paymentMethodPreference &&
      (paymentMethodPreference.toLowerCase().includes("cod") ||
        paymentMethodPreference.toLowerCase().includes("cash") ||
        paymentMethodPreference.toLowerCase().includes("pay on delivery"))
  );

  if (isCOD) {
    const pincode = shippingAddress?.postal_code || "560001";
    const codCheck = verifyCODAvailability(item, selectedOffer?.seller_name, pincode, shippingAddress?.city);
    if (!codCheck.available) {
      return {
        allowed: false,
        refusal_reason: `Cash on Delivery is unavailable: ${codCheck.reason}. You can complete this purchase with instant Razorpay checkout (UPI / Card).`,
        item,
        amount: finalAmount,
        offer: selectedOffer,
        price_breakdown: priceBreakdown,
      };
    }
    paymentMethod = "Cash on Delivery (COD)";
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
    amount: finalAmount,
    currency: item.currency,
    idempotency_key: idempotencyKey,
    offer: selectedOffer,
    price_breakdown: priceBreakdown,
    payment_method: paymentMethod,
    shipping_address: shippingAddress,
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
    reasoning: `Proposed purchase of ${item.name} for ₹${finalAmount.toLocaleString("en-IN")}${
      selectedOffer ? ` via ${selectedOffer.site_name} (${selectedOffer.seller_name})` : ""
    } via ${paymentMethod}. Reason: "${reason}"${shippingAddress ? ` (Shipping to: [${shippingAddress.tag.toUpperCase()}] ${shippingAddress.city})` : ""}`,
    payload: {
      item_id: item.id,
      item_name: item.name,
      amount: finalAmount,
      currency: item.currency,
      offer: selectedOffer || null,
      price_breakdown: priceBreakdown,
      payment_method: paymentMethod,
      shipping_address: shippingAddress || null,
      confirmation_token: token,
      idempotency_key: idempotencyKey,
    },
    result: "pending",
  });

  return {
    allowed: true,
    item,
    amount: finalAmount,
    offer: selectedOffer,
    price_breakdown: priceBreakdown,
    payment_method: paymentMethod,
    shipping_address: shippingAddress,
    token,
    idempotency_key: idempotencyKey,
  };
}

/**
 * Tool 7: get_order_status
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


