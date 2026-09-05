"use client";

import React, { useState, useEffect } from "react";
import { AdminAnalyticsSummary } from "@/types";
import { X, BarChart3, TrendingUp, ShieldCheck, ShoppingCart, Search, CreditCard, RefreshCw } from "lucide-react";

interface AdminAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminAnalyticsModal: React.FC<AdminAnalyticsModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<AdminAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/analytics");
      if (res.ok) {
        const json = await res.json();
        setData(json.analytics || null);
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" role="dialog" aria-modal="true" aria-label="Admin Aggregate Analytics">
      <div className="bg-surface border border-border rounded-xl shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-subtle flex items-center justify-center text-accent">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-text-primary">Admin Aggregate Analytics</h3>
              <p className="text-xs text-text-secondary">Cross-session commerce discovery & conversion telemetry</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAnalytics}
              disabled={isLoading}
              title="Refresh telemetry"
              className="p-1.5 rounded-button text-text-muted hover:text-text-primary hover:bg-surface border border-border transition-colors disabled:opacity-50 focus-ring"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-button text-text-muted hover:text-text-primary hover:bg-surface border border-transparent hover:border-border transition-colors focus-ring"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Privacy Notice Banner */}
        <div className="px-4 sm:px-6 py-2 bg-success-subtle/50 border-b border-success/20 flex items-center gap-2 text-xs text-success">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span className="font-mono text-[11px]">
            Privacy Guaranteed: Zero Customer PII (No addresses, names, or raw card data stored or exposed)
          </span>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:px-6 overflow-y-auto flex-1 space-y-5">
          {isLoading && !data ? (
            <div className="py-16 text-center text-xs text-text-muted">Aggregating telemetry…</div>
          ) : !data ? (
            <div className="py-16 text-center text-xs text-text-muted">No telemetry available.</div>
          ) : (
            <>
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-card bg-surface-subtle border border-border space-y-1">
                  <div className="flex items-center justify-between text-text-muted">
                    <span className="text-[10px] font-mono uppercase">Searches</span>
                    <Search className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <div className="text-xl font-bold font-numeric text-text-primary">
                    {data.total_searches}
                  </div>
                  <span className="text-[10px] text-text-secondary">Discovery queries</span>
                </div>

                <div className="p-3.5 rounded-card bg-surface-subtle border border-border space-y-1">
                  <div className="flex items-center justify-between text-text-muted">
                    <span className="text-[10px] font-mono uppercase">Orders</span>
                    <ShoppingCart className="w-3.5 h-3.5 text-success" />
                  </div>
                  <div className="text-xl font-bold font-numeric text-text-primary">
                    {data.total_orders}
                  </div>
                  <span className="text-[10px] text-text-secondary">Confirmed purchases</span>
                </div>

                <div className="p-3.5 rounded-card bg-surface-subtle border border-border space-y-1">
                  <div className="flex items-center justify-between text-text-muted">
                    <span className="text-[10px] font-mono uppercase">Gross Merch (GMV)</span>
                    <TrendingUp className="w-3.5 h-3.5 text-warning" />
                  </div>
                  <div className="text-xl font-bold font-numeric text-text-primary">
                    ₹{data.total_gross_merchandise_value.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[10px] text-text-secondary">Authorized volume</span>
                </div>

                <div className="p-3.5 rounded-card bg-surface-subtle border border-border space-y-1">
                  <div className="flex items-center justify-between text-text-muted">
                    <span className="text-[10px] font-mono uppercase">Conversion</span>
                    <CreditCard className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <div className="text-xl font-bold font-numeric text-accent">
                    {data.conversion_rate}%
                  </div>
                  <span className="text-[10px] text-text-secondary">Search to order</span>
                </div>
              </div>

              {/* Popular Search Terms & Top Brands */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Search Queries */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs text-text-primary uppercase tracking-wider font-mono">
                    Top Discovery Terms
                  </h4>
                  <div className="bg-surface-subtle rounded-card border border-border p-3 divide-y divide-border/50 text-xs">
                    {data.popular_search_terms.map((item, i) => (
                      <div key={i} className="py-2 flex items-center justify-between first:pt-0 last:pb-0">
                        <span className="text-text-primary font-medium truncate max-w-[180px]">
                          {item.term}
                        </span>
                        <span className="font-numeric text-text-muted font-mono bg-surface px-2 py-0.5 rounded border border-border">
                          {item.count} searches
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Brand Trends */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-xs text-text-primary uppercase tracking-wider font-mono">
                    Brand Interest Share
                  </h4>
                  <div className="bg-surface-subtle rounded-card border border-border p-3 space-y-2.5 text-xs">
                    {data.brand_trends.map((brand, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-text-primary font-medium">{brand.brand}</span>
                          <span className="text-text-muted font-numeric">{brand.count} mentions</span>
                        </div>
                        <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden border border-border">
                          <div
                            className="h-full bg-accent rounded-full"
                            style={{ width: `${Math.min(100, brand.count * 5)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category Performance Matrix */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-text-primary uppercase tracking-wider font-mono">
                  Category Revenue & Orders
                </h4>
                <div className="overflow-x-auto rounded-card border border-border bg-surface-subtle">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border text-[10px] font-mono uppercase text-text-muted bg-surface">
                        <th className="py-2 px-3 font-semibold">Category</th>
                        <th className="py-2 px-3 font-semibold">Discovery Searches</th>
                        <th className="py-2 px-3 font-semibold">Orders</th>
                        <th className="py-2 px-3 font-semibold text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {data.category_trends.map((cat, i) => (
                        <tr key={i} className="hover:bg-surface/50">
                          <td className="py-2.5 px-3 font-medium text-text-primary">{cat.category}</td>
                          <td className="py-2.5 px-3 font-numeric text-text-secondary">{cat.search_count}</td>
                          <td className="py-2.5 px-3 font-numeric text-text-secondary">{cat.order_count}</td>
                          <td className="py-2.5 px-3 font-numeric font-semibold text-right text-accent">
                            ₹{cat.revenue.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-text-primary uppercase tracking-wider font-mono">
                  Payment Method Distribution
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.payment_method_breakdown.map((pm, i) => (
                    <div key={i} className="p-3 rounded-card bg-surface-subtle border border-border flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-text-primary block">{pm.method}</span>
                        <span className="text-[10px] text-text-muted font-mono">{pm.count} transactions</span>
                      </div>
                      <span className="text-base font-bold font-numeric text-accent">{pm.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
