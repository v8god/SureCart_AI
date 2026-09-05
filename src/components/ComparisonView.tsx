"use client";

import React from "react";
import { ProductComparison, CatalogItem, ProductOffer } from "@/types";
import { ArrowRight, Tag, Star, Truck, RefreshCw, ShoppingBag, Award, Zap } from "lucide-react";

interface ComparisonViewProps {
  comparison: ProductComparison;
  onProposeProduct: (item: CatalogItem, offer?: ProductOffer) => void;
}

export function ComparisonView({ comparison, onProposeProduct }: ComparisonViewProps) {
  const { products, matrix, offers, recommendation, title } = comparison;

  return (
    <div className="my-4 rounded-xl border border-border bg-surface-subtle/50 p-4 sm:p-5 text-sm space-y-4 animate-fade-in">
      {/* Title & Badge */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div>
          <span className="text-[11px] font-mono tracking-wider uppercase text-accent font-semibold">
            Cross-Site Price & Feature Comparison
          </span>
          <h4 className="text-base font-semibold text-text-primary mt-0.5">{title}</h4>
        </div>
      </div>

      {/* Cross-Site Marketplace Offers List */}
      {offers && offers.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted font-medium">
            Available Verified Offers ({offers.length})
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {offers.map((offer) => {
              const isCheapest = recommendation.cheapest_offer_id === offer.id;
              const isBestRated = recommendation.best_rated_offer_id === offer.id;
              const isBestValue = recommendation.best_value_offer_id === offer.id;
              const parentProduct = products.find((p) => p.id === offer.product_id) || products[0];

              return (
                <div
                  key={offer.id}
                  className={`bg-surface border rounded-card p-3.5 space-y-2.5 transition-colors relative ${
                    isBestValue
                      ? "border-accent shadow-sm"
                      : "border-border hover:border-accent/40"
                  }`}
                >
                  {/* Offer Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-text-primary">
                        {offer.site_name}
                      </span>
                      <span className="text-[10px] text-text-muted font-mono truncate max-w-[130px]">
                        • {offer.seller_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {isCheapest && (
                        <span className="text-[9px] font-mono uppercase bg-accent-subtle text-accent px-1.5 py-0.5 rounded font-semibold border border-accent/20">
                          Cheapest
                        </span>
                      )}
                      {isBestRated && (
                        <span className="text-[9px] font-mono uppercase bg-warning/10 text-warning px-1.5 py-0.5 rounded font-semibold border border-warning/20">
                          Top Rated
                        </span>
                      )}
                      {isBestValue && (
                        <span className="text-[9px] font-mono uppercase bg-success-subtle text-success px-1.5 py-0.5 rounded font-semibold border border-success/20">
                          Best Value
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price & Delivery Meta */}
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-numeric font-bold text-base sm:text-lg text-text-primary">
                          ₹{offer.final_price.toLocaleString("en-IN")}
                        </span>
                        {offer.discount > 0 && (
                          <span className="text-[10px] font-numeric text-text-muted line-through">
                            ₹{offer.base_price.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-text-muted">
                        {offer.shipping_fee === 0 ? "Free Delivery" : `+₹${offer.shipping_fee} shipping`} • Incl. Taxes
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs font-numeric font-medium text-warning justify-end">
                        <Star className="w-3.5 h-3.5 fill-warning text-warning" aria-hidden="true" />
                        <span>{offer.rating}</span>
                        <span className="text-[10px] text-text-muted font-mono">({offer.review_count})</span>
                      </div>
                      <span className="text-[10px] text-text-muted font-mono flex items-center gap-1 justify-end mt-0.5">
                        <Truck className="w-3 h-3 text-accent" />
                        <span>{offer.delivery_eta}</span>
                      </span>
                    </div>
                  </div>

                  {/* Policy & Action */}
                  <div className="pt-2 border-t border-border flex items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] text-text-secondary flex items-center gap-1 truncate">
                      <RefreshCw className="w-3 h-3 text-text-muted shrink-0" />
                      <span className="truncate">{offer.return_policy}</span>
                    </span>

                    <button
                      onClick={() => onProposeProduct(parentProduct, offer)}
                      className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-text-inverse rounded-button text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors focus-ring"
                    >
                      <span>Order on {offer.site_name.split(" ")[0]}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[460px]">
          <thead>
            <tr className="border-b border-border text-xs text-text-muted uppercase font-mono">
              <th className="py-2.5 px-3 font-medium">Feature</th>
              {products.map((p) => (
                <th key={p.id} className="py-2.5 px-3 font-semibold text-text-primary">
                  <div className="flex flex-col">
                    <span>{p.name}</span>
                    <span className="text-accent font-mono text-xs normal-case mt-0.5">
                      ₹{p.price.toLocaleString("en-IN")}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 text-xs">
            {matrix.map((row, idx) => (
              <tr key={idx} className="hover:bg-surface/50 transition-colors">
                <td className="py-2.5 px-3 font-medium text-text-secondary bg-surface-subtle/40 w-[130px]">
                  {row.attribute}
                </td>
                {products.map((p) => (
                  <td key={p.id} className="py-2.5 px-3 text-text-primary">
                    {row.values[p.id] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Observation & Recommendation Section */}
      <div className="rounded-lg bg-surface border border-border/70 p-3.5 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-accent">
          <Tag className="w-3.5 h-3.5" />
          <span>Agent Evaluation & Recommendation</span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          {recommendation.rationale}
        </p>
      </div>
    </div>
  );
}

