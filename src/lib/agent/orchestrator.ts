import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  toolSearchCatalog,
  toolGetProduct,
  toolProposePurchase,
  toolGetOrderStatus,
  toolCompareProducts,
  toolGetShippingAddresses,
  toolVerifySeller,
} from "./tools";
import {
  ChatMessage,
  CatalogItem,
  Currency,
  ShippingAddress,
  ProductComparison,
  ProductOffer,
  PriceBreakdown,
} from "@/types";
import { getAllCatalogItems, getAddresses, getAddressByTag, getAllOffers } from "@/lib/db";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export interface OrchestrationResult {
  message: string;
  toolCallsExecuted: {
    name: string;
    args: Record<string, unknown>;
    result: unknown;
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
    status: "pending";
  };
  refusal?: {
    reason: string;
    amount?: number;
    limit?: number;
  };
  groundedProducts?: CatalogItem[];
  comparison?: ProductComparison;
}

/**
 * Natural language parser for price filters, colors, sellers, and address tags.
 */
function parseUserCriteria(lowerMsg: string, sessionId?: string) {
  let minPrice: number | undefined;
  let maxPrice: number | undefined;
  let color: string | undefined;
  let addressTag: string | undefined;
  let category: string | undefined;
  let preferredSite: string | undefined;
  let paymentPreference: "cod" | "razorpay" | undefined;

  // Price range: "between 1000 and 4000" or "1000 to 4000"
  const betweenMatch = lowerMsg.match(/(?:between|from)\s*(?:₹|rs\.?)?\s*(\d+)\s*(?:and|to|-)\s*(?:₹|rs\.?)?\s*(\d+)/i);
  if (betweenMatch) {
    minPrice = parseInt(betweenMatch[1], 10);
    maxPrice = parseInt(betweenMatch[2], 10);
  } else {
    // Under / below / max: "under 3000", "below ₹4000", "less than 2500"
    const underMatch = lowerMsg.match(/(?:under|below|less than|max(?:imum)?|up to)\s*(?:₹|rs\.?)?\s*(\d+)/i);
    if (underMatch) {
      maxPrice = parseInt(underMatch[1], 10);
    }
    // Above / min: "above 2000", "more than ₹1500"
    const aboveMatch = lowerMsg.match(/(?:above|over|more than|min(?:imum)?|at least)\s*(?:₹|rs\.?)?\s*(\d+)/i);
    if (aboveMatch) {
      minPrice = parseInt(aboveMatch[1], 10);
    }
  }

  // Colors
  const colors = ["black", "midnight black", "stealth gray", "gray", "silver", "white", "pure white", "space gray", "titanium", "birch"];
  for (const c of colors) {
    if (lowerMsg.includes(c)) {
      color = c;
      break;
    }
  }

  // Payment Preferences
  if (lowerMsg.includes("cod") || lowerMsg.includes("cash on delivery") || lowerMsg.includes("pay on delivery")) {
    paymentPreference = "cod";
  } else if (lowerMsg.includes("upi") || lowerMsg.includes("card") || lowerMsg.includes("prepaid") || lowerMsg.includes("razorpay")) {
    paymentPreference = "razorpay";
  }

  // Address tags: check database presets if sessionId provided, plus standard keywords
  if (sessionId) {
    const saved = getAddresses(sessionId);
    for (const addr of saved) {
      if (lowerMsg.includes(addr.tag.toLowerCase())) {
        addressTag = addr.tag.toLowerCase();
        break;
      }
    }
  }

  if (!addressTag) {
    const commonTags = ["home", "work", "office", "college", "hostel", "room", "parents", "flat", "apartment"];
    for (const tag of commonTags) {
      if (lowerMsg.includes(tag)) {
        addressTag = tag;
        break;
      }
    }
  }

  // Preferred Marketplace / Sites
  if (lowerMsg.includes("amazon")) {
    preferredSite = "Amazon India";
  } else if (lowerMsg.includes("croma")) {
    preferredSite = "Croma";
  } else if (lowerMsg.includes("flipkart")) {
    preferredSite = "Flipkart";
  } else if (lowerMsg.includes("reliance")) {
    preferredSite = "Reliance Digital";
  }

  // Categories
  if (lowerMsg.includes("audio") || lowerMsg.includes("sound") || lowerMsg.includes("music") || lowerMsg.includes("speaker") || lowerMsg.includes("earbud")) {
    category = "Audio";
  } else if (lowerMsg.includes("wearable") || lowerMsg.includes("watch") || lowerMsg.includes("band") || lowerMsg.includes("fitness")) {
    category = "Wearables";
  } else if (lowerMsg.includes("accessory") || lowerMsg.includes("accessories") || lowerMsg.includes("charger") || lowerMsg.includes("stand") || lowerMsg.includes("pad")) {
    category = "Accessories";
  } else if (lowerMsg.includes("keyboard") || lowerMsg.includes("office") || lowerMsg.includes("desk")) {
    category = "Office";
  }

  return { minPrice, maxPrice, color, addressTag, category, preferredSite, paymentPreference };
}

/**
 * Deterministic Orchestration Engine
 * Handles search, price filters, colors, comparisons, address tagging, seller verification, and purchase proposals.
 */
async function runDeterministicOrchestration(
  sessionId: string,
  userMessage: string,
  referencedContext?: string
): Promise<OrchestrationResult> {
  const combinedText = referencedContext ? `${referencedContext}\n${userMessage}` : userMessage;
  const lowerMsg = combinedText.toLowerCase().trim();
  const toolCallsExecuted: OrchestrationResult["toolCallsExecuted"] = [];
  const catalog = getAllCatalogItems();
  const criteria = parseUserCriteria(lowerMsg, sessionId);

  // 1. Check for Order Status intent
  const isStatusIntent =
    lowerMsg.includes("status") ||
    lowerMsg.includes("where is my order") ||
    lowerMsg.includes("track");

  if (isStatusIntent) {
    const orderMatch = lowerMsg.match(/(ord_[a-z0-9_]+|order_[a-z0-9_]+)/i);
    const orderId = orderMatch ? orderMatch[1] : "latest";
    const statusRes = toolGetOrderStatus(sessionId, orderId);
    toolCallsExecuted.push({
      name: "get_order_status",
      args: { order_id: orderId },
      result: statusRes,
    });

    return {
      message: statusRes.summary,
      toolCallsExecuted,
    };
  }

  // 2. Check for Product Comparison or "Which one is best" intent
  const isCompareIntent =
    lowerMsg.includes("compare") ||
    lowerMsg.includes("difference between") ||
    lowerMsg.includes("vs") ||
    lowerMsg.includes("which one") ||
    lowerMsg.includes("which is best") ||
    lowerMsg.includes("what is best") ||
    lowerMsg.includes("recommend") ||
    lowerMsg.includes("better option");

  if (isCompareIntent) {
    // Find products mentioned or in category
    const matchedForCompare: CatalogItem[] = [];
    for (const item of catalog) {
      const nameWords = item.name.toLowerCase().split(" ");
      if (
        lowerMsg.includes(item.id.toLowerCase()) ||
        nameWords.some((w) => w.length > 4 && lowerMsg.includes(w))
      ) {
        matchedForCompare.push(item);
      }
    }

    // If specific items were not matched, find top 2 in category or catalog
    let compareItems = matchedForCompare;
    if (compareItems.length < 2) {
      if (criteria.category) {
        compareItems = catalog.filter((i) => i.category === criteria.category).slice(0, 2);
      } else {
        compareItems = catalog.slice(0, 2);
      }
    }

    const compareRes = toolCompareProducts(
      sessionId,
      compareItems.map((i) => i.id),
      userMessage
    );

    toolCallsExecuted.push({
      name: "compare_products",
      args: { product_ids: compareItems.map((i) => i.id), user_intent: userMessage },
      result: compareRes,
    });

    if (compareRes.comparison) {
      return {
        message: `I have compared the options across verified online retailers:\n\n**Agent Recommendation**: ${compareRes.comparison.recommendation.rationale}\n\nLet me know which option you would like to proceed with, or specify your preferred delivery address (e.g. *"Order on Amazon and ship to Home"*).`,
        toolCallsExecuted,
        comparison: compareRes.comparison,
        groundedProducts: compareItems,
      };
    }
  }

  // 3. Check for Buy / Purchase intent
  const isBuyIntent =
    lowerMsg.includes("buy") ||
    lowerMsg.includes("purchase") ||
    lowerMsg.includes("order") ||
    lowerMsg.includes("get me") ||
    lowerMsg.includes("checkout") ||
    lowerMsg.includes("ship") ||
    lowerMsg.includes("deliver");

  // Find most relevant item in catalog based on keywords and criteria
  let matchedItem: CatalogItem | null = null;
  for (const item of catalog) {
    const nameKeywords = item.name.toLowerCase().split(" ");
    const idMatch = lowerMsg.includes(item.id.toLowerCase());
    const nameMatch = nameKeywords.some((kw) => kw.length > 3 && lowerMsg.includes(kw));

    if (idMatch || nameMatch) {
      matchedItem = item;
      break;
    }
  }

  // If filtered search with price range / color without specific item match
  if (!matchedItem && (criteria.minPrice !== undefined || criteria.maxPrice !== undefined || criteria.color || criteria.category)) {
    const searchRes = toolSearchCatalog(sessionId, {
      query: lowerMsg.replace(/find|search|show|looking for|i want|a pair of|can you|in|color|under|below|above|between|and|to/g, "").trim(),
      category: criteria.category,
      minPrice: criteria.minPrice,
      maxPrice: criteria.maxPrice,
      color: criteria.color,
    });

    toolCallsExecuted.push({
      name: "search_catalog",
      args: {
        category: criteria.category || null,
        min_price: criteria.minPrice || null,
        max_price: criteria.maxPrice || null,
        color: criteria.color || null,
      },
      result: searchRes,
    });

    if (searchRes.items.length > 0) {
      const priceText = criteria.maxPrice
        ? ` under ₹${criteria.maxPrice.toLocaleString("en-IN")}`
        : criteria.minPrice
        ? ` above ₹${criteria.minPrice.toLocaleString("en-IN")}`
        : "";
      const colorText = criteria.color ? ` in ${criteria.color}` : "";

      return {
        message: `I found ${searchRes.items.length} product(s) matching your filters${priceText}${colorText} across genuine sellers. You can compare offers or ask me to prepare an order proposal!`,
        toolCallsExecuted,
        groundedProducts: searchRes.items,
      };
    } else {
      return {
        message: `I checked the catalog and verified seller offers, but found no items matching your exact filters. Try adjusting the price range or color filter.`,
        toolCallsExecuted,
      };
    }
  }

  // If matched item and is buy intent:
  if (matchedItem && isBuyIntent) {
    // Step 1: Query catalog to ground the product
    const productLookup = toolGetProduct(sessionId, matchedItem.id);
    toolCallsExecuted.push({
      name: "get_product",
      args: { product_id: matchedItem.id },
      result: productLookup,
    });

    // Step 2: Check for preferred seller offer
    let targetOfferId: string | undefined = undefined;
    if (criteria.preferredSite && matchedItem.offers) {
      const matchedOffer = matchedItem.offers.find((o) =>
        o.site_name.toLowerCase().includes(criteria.preferredSite!.toLowerCase())
      );
      if (matchedOffer) targetOfferId = matchedOffer.id;
    }

    // Step 3: Propose purchase (triggers seller verification + guardrail spend cap evaluation + address resolution + COD check)
    const reason = `Matches your request for ${matchedItem.name} (${matchedItem.color}) and verified safe for checkout.`;
    const proposalRes = toolProposePurchase(
      sessionId,
      matchedItem.id,
      reason,
      criteria.addressTag,
      targetOfferId,
      criteria.paymentPreference
    );
    toolCallsExecuted.push({
      name: "propose_purchase",
      args: {
        product_id: matchedItem.id,
        reason,
        address_tag: criteria.addressTag || "default",
        offer_id: targetOfferId || "best_verified",
        payment_method: criteria.paymentPreference || "razorpay",
      },
      result: proposalRes,
    });

    if (!proposalRes.allowed) {
      // Spend-cap, COD availability or seller verification refusal
      return {
        message:
          proposalRes.refusal_reason ||
          `I cannot proceed with this purchase because the price of ₹${matchedItem.price.toLocaleString(
            "en-IN"
          )} exceeds spending limits. No payment was attempted.`,
        toolCallsExecuted,
        refusal: {
          reason: proposalRes.refusal_reason || "Spending limit exceeded",
          amount: matchedItem.price,
        },
      };
    }

    // Happy Path Proposal with verified seller and address tag
    const sellerNotice = proposalRes.offer
      ? ` via **${proposalRes.offer.site_name}** (${proposalRes.offer.seller_name})`
      : "";
    const addressNotice = proposalRes.shipping_address
      ? ` Delivering to your **${proposalRes.shipping_address.tag.toUpperCase()}** address (${proposalRes.shipping_address.city}).`
      : "";

    const isCODProposal = proposalRes.payment_method?.includes("Cash on Delivery");
    const introMsg = isCODProposal
      ? `I have verified the seller and prepared a **Cash on Delivery (COD)** order proposal for the **${matchedItem.name}** at ₹${proposalRes.amount?.toLocaleString(
          "en-IN"
        )}${sellerNotice}.${addressNotice} Pay ₹${proposalRes.amount?.toLocaleString("en-IN")} upon delivery. Please review the details and confirm below.`
      : `I have verified the seller authenticity and prepared an order proposal for the **${matchedItem.name}** at ₹${proposalRes.amount?.toLocaleString(
          "en-IN"
        )}${sellerNotice}.${addressNotice} Please review the itemized breakdown and confirm below.`;

    return {
      message: introMsg,
      toolCallsExecuted,
      proposal: {
        token: proposalRes.token!,
        item: proposalRes.item!,
        amount: proposalRes.amount!,
        currency: "INR",
        offer: proposalRes.offer,
        price_breakdown: proposalRes.price_breakdown,
        payment_method: proposalRes.payment_method,
        shipping_address: proposalRes.shipping_address,
        reason,
        idempotency_key: proposalRes.idempotency_key!,
        status: "pending",
      },
      groundedProducts: [matchedItem],
    };
  }

  // If matched item without buy intent: Search/Lookup & Cross-Site comparison
  if (matchedItem) {
    const productLookup = toolGetProduct(sessionId, matchedItem.id);
    toolCallsExecuted.push({
      name: "get_product",
      args: { product_id: matchedItem.id },
      result: productLookup,
    });

    const compareRes = toolCompareProducts(sessionId, [matchedItem.id], userMessage);
    toolCallsExecuted.push({
      name: "compare_products",
      args: { product_ids: [matchedItem.id], user_intent: userMessage },
      result: compareRes,
    });

    return {
      message: `I found the **${matchedItem.name}** (${matchedItem.color}) with multiple genuine online seller offers. Here is the cross-site price comparison:`,
      toolCallsExecuted,
      comparison: compareRes.comparison || undefined,
      groundedProducts: [matchedItem],
    };
  }

  // Fallback search
  const searchRes = toolSearchCatalog(sessionId, { query: lowerMsg });
  toolCallsExecuted.push({
    name: "search_catalog",
    args: { query: lowerMsg },
    result: searchRes,
  });

  return {
    message:
      searchRes.items.length > 0
        ? `Here are the products currently available across verified stores:`
        : `I couldn't find a matching product in the catalog. You can filter by price range (e.g. *"earbuds under ₹3,000"*), color, or ask to compare products across Amazon and Croma!`,
    toolCallsExecuted,
    groundedProducts: searchRes.items,
  };
}

/**
 * Main Agent Orchestrator Entrypoint
 */
export async function runAgentOrchestrator(
  sessionId: string,
  userMessage: string,
  history: ChatMessage[] = [],
  referencedContext?: string
): Promise<OrchestrationResult> {
  if (GEMINI_API_KEY && GEMINI_API_KEY.trim() !== "" && !GEMINI_API_KEY.includes("your_gemini")) {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: `You are SureCart AI, an autonomous shopping assistant operating strictly under the Razorpay Agentic Commerce Guardrail Constitution.
You search verified marketplaces, compare cross-site seller offers, ground all product recommendations with real tool calls, verify vendor authenticity, and propose purchases.
You cannot move money without buyer explicit confirmation.
When the user asks to buy or order a product, you MUST invoke 'get_product' and 'propose_purchase'.
Never invent prices or stock levels.`,
      });

      return await runDeterministicOrchestration(sessionId, userMessage, referencedContext);
    } catch (err) {
      console.warn("Gemini execution fallback to deterministic engine:", err);
      return await runDeterministicOrchestration(sessionId, userMessage, referencedContext);
    }
  }

  return await runDeterministicOrchestration(sessionId, userMessage, referencedContext);
}


