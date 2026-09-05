import { getAllCatalogItems, getOrdersBySession, getSearchHistory } from "@/lib/db";
import { CatalogItem, PersonalizedRecommendation } from "@/types";

export function getPersonalizedRecommendations(sessionId: string, limit: number = 4): PersonalizedRecommendation[] {
  const catalog = getAllCatalogItems();
  const pastOrders = getOrdersBySession(sessionId);
  const searchHistory = getSearchHistory(sessionId);

  const recommendations: PersonalizedRecommendation[] = [];
  const purchasedItemIds = new Set(pastOrders.map((o) => o.catalog_item_id));

  // 1. Cross-sell based on recent purchases
  for (const order of pastOrders) {
    const purchasedItem = catalog.find((i) => i.id === order.catalog_item_id);
    if (!purchasedItem) continue;

    // Suggest complementary items in same or accessory category
    const complementary = catalog.filter(
      (c) =>
        c.id !== purchasedItem.id &&
        !purchasedItemIds.has(c.id) &&
        (c.category === "Accessories" || c.category === purchasedItem.category)
    );

    for (const comp of complementary) {
      if (!recommendations.some((r) => r.product.id === comp.id)) {
        recommendations.push({
          product: comp,
          relevance_score: 92,
          reason: `Pairs well with your recent order of ${order.item_name}`,
          trigger_type: "cross_sell",
          based_on: order.item_name,
        });
      }
    }
  }

  // 2. Search affinity from recent search queries
  if (searchHistory.length > 0) {
    const recentQueries = searchHistory.slice(0, 5);
    for (const search of recentQueries) {
      const queryWords = search.query.toLowerCase().split(/\s+/);

      for (const item of catalog) {
        if (purchasedItemIds.has(item.id)) continue;
        if (recommendations.some((r) => r.product.id === item.id)) continue;

        const matchesWord = queryWords.some(
          (w) => w.length > 3 && (item.name.toLowerCase().includes(w) || item.category.toLowerCase().includes(w))
        );

        if (matchesWord) {
          recommendations.push({
            product: item,
            relevance_score: 85,
            reason: `Based on your search for "${search.query}"`,
            trigger_type: "search_affinity",
            based_on: search.query,
          });
        }
      }
    }
  }

  // 3. Fallback: Trending / Best-sellers
  if (recommendations.length < limit) {
    const sortedByReviews = [...catalog]
      .filter((i) => !purchasedItemIds.has(i.id) && !recommendations.some((r) => r.product.id === i.id))
      .sort((a, b) => (b.review_count || 0) - (a.review_count || 0));

    for (const item of sortedByReviews) {
      if (recommendations.length >= limit) break;
      recommendations.push({
        product: item,
        relevance_score: 75,
        reason: `Popular pick in ${item.category} (${item.rating}★ rating)`,
        trigger_type: "trending",
      });
    }
  }

  return recommendations.slice(0, limit);
}
