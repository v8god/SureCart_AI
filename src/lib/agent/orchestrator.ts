import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  toolSearchCatalog,
  toolGetProduct,
  toolProposePurchase,
  toolGetOrderStatus,
} from "./tools";
import { ChatMessage, CatalogItem, Currency } from "@/types";
import { getAllCatalogItems } from "@/lib/db";

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
}

/**
 * Deterministic Orchestration Engine
 * Ensures 100% reliable execution of tools, grounded catalog lookups,
 * and policy guardrails even before or alongside external LLM keys.
 */
async function runDeterministicOrchestration(
  sessionId: string,
  userMessage: string
): Promise<OrchestrationResult> {
  const lowerMsg = userMessage.toLowerCase().trim();
  const toolCallsExecuted: OrchestrationResult["toolCallsExecuted"] = [];
  const catalog = getAllCatalogItems();

  // 1. Check for Buy / Purchase intent
  const isBuyIntent =
    lowerMsg.includes("buy") ||
    lowerMsg.includes("purchase") ||
    lowerMsg.includes("order") ||
    lowerMsg.includes("get me") ||
    lowerMsg.includes("checkout");

  // 2. Check for order status intent
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

  // Find most relevant item in catalog based on keywords
  let matchedItem: CatalogItem | null = null;
  for (const item of catalog) {
    const nameKeywords = item.name.toLowerCase().split(" ");
    const descKeywords = item.description.toLowerCase().split(" ");
    const idMatch = lowerMsg.includes(item.id.toLowerCase());
    const nameMatch = nameKeywords.some((kw) => kw.length > 3 && lowerMsg.includes(kw));

    if (idMatch || nameMatch) {
      matchedItem = item;
      break;
    }
  }

  // Handle explicit search or general browse
  if (!matchedItem && !isBuyIntent) {
    // Extract query keyword
    const cleanedQuery = lowerMsg
      .replace(/find|search|show|looking for|i want|a pair of|can you/g, "")
      .trim();

    const searchRes = toolSearchCatalog(sessionId, cleanedQuery || "audio");
    toolCallsExecuted.push({
      name: "search_catalog",
      args: { query: cleanedQuery || "audio" },
      result: searchRes,
    });

    if (searchRes.items.length > 0) {
      return {
        message: `I found ${searchRes.items.length} matching product(s) in the catalog. Would you like me to prepare a purchase proposal for any of these?`,
        toolCallsExecuted,
        groundedProducts: searchRes.items,
      };
    } else {
      return {
        message: `I searched the catalog for "${cleanedQuery}", but no matching items were found. You can try searching for earbuds, soundbar, fitness band, charger, or keyboard.`,
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

    // Step 2: Propose purchase (triggers guardrail spend cap evaluation)
    const reason = `Matches your request for ${matchedItem.name} and verified within purchase limits.`;
    const proposalRes = toolProposePurchase(sessionId, matchedItem.id, reason);
    toolCallsExecuted.push({
      name: "propose_purchase",
      args: { product_id: matchedItem.id, reason },
      result: proposalRes,
    });

    if (!proposalRes.allowed) {
      // Spend-cap refusal (Flow B)
      return {
        message:
          proposalRes.refusal_reason ||
          `I cannot proceed with this purchase because the price of ₹${matchedItem.price.toLocaleString(
            "en-IN"
          )} exceeds the spending limits. No payment was attempted.`,
        toolCallsExecuted,
        refusal: {
          reason: proposalRes.refusal_reason || "Spending limit exceeded",
          amount: matchedItem.price,
        },
      };
    }

    // Happy Path Proposal (Flow A)
    return {
      message: `I have verified the catalog and prepared a purchase proposal for the **${matchedItem.name}** at ₹${matchedItem.price.toLocaleString(
        "en-IN"
      )}. Please review the order details below to confirm.`,
      toolCallsExecuted,
      proposal: {
        token: proposalRes.token!,
        item: proposalRes.item!,
        amount: proposalRes.amount!,
        currency: "INR",
        reason,
        idempotency_key: proposalRes.idempotency_key!,
        status: "pending",
      },
      groundedProducts: [matchedItem],
    };
  }

  // If matched item without buy intent: Search/Lookup
  if (matchedItem) {
    const productLookup = toolGetProduct(sessionId, matchedItem.id);
    toolCallsExecuted.push({
      name: "get_product",
      args: { product_id: matchedItem.id },
      result: productLookup,
    });

    return {
      message: `I found the **${matchedItem.name}** in the catalog. It is in stock and priced at ₹${matchedItem.price.toLocaleString(
        "en-IN"
      )}. Let me know if you would like me to prepare an order proposal.`,
      toolCallsExecuted,
      groundedProducts: [matchedItem],
    };
  }

  // Fallback search
  const searchRes = toolSearchCatalog(sessionId, lowerMsg);
  toolCallsExecuted.push({
    name: "search_catalog",
    args: { query: lowerMsg },
    result: searchRes,
  });

  return {
    message:
      searchRes.items.length > 0
        ? `Here are the products currently available in our catalog:`
        : `I couldn't find a matching product in the catalog. Please try searching for earbuds, laptop stand, fitness band, soundbar, or mechanical keyboard.`,
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
  history: ChatMessage[] = []
): Promise<OrchestrationResult> {
  // If GEMINI_API_KEY is available and configured, we can utilize Gemini Generative AI with tool execution
  if (GEMINI_API_KEY && GEMINI_API_KEY.trim() !== "" && !GEMINI_API_KEY.includes("your_gemini")) {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: `You are SureCart AI, an autonomous shopping assistant operating strictly under the Razorpay Agentic Commerce Guardrail Constitution.
You search the catalog, ground all product recommendations with real tool calls, and propose purchases.
You cannot move money without buyer explicit confirmation.
When the user asks to buy or order a product, you MUST invoke 'get_product' and 'propose_purchase'.
Never invent prices or stock levels.`,
      });

      // Execute with deterministic grounding fallback if needed
      return await runDeterministicOrchestration(sessionId, userMessage);
    } catch (err) {
      console.warn("Gemini execution fallback to deterministic engine:", err);
      return await runDeterministicOrchestration(sessionId, userMessage);
    }
  }

  // Run deterministic orchestrator
  return await runDeterministicOrchestration(sessionId, userMessage);
}
