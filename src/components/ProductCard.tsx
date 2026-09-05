"use client";

import React from "react";
import { CatalogItem } from "@/types";
import { ShoppingCart, AlertTriangle, Tag } from "lucide-react";

interface ProductCardProps {
  item: CatalogItem;
  onPropose: (item: CatalogItem) => void;
  isProposed?: boolean;
  perOrderCap?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  item,
  onPropose,
  isProposed = false,
  perOrderCap = 5000,
}) => {
  const isOverCap = item.price > perOrderCap;

  return (
    <div className="bg-surface border border-border rounded-card p-4 transition-colors hover:border-accent/40">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-surface-subtle text-text-secondary border border-border">
              {item.category}
            </span>
            {item.color && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-subtle text-text-muted border border-border">
                {item.color}
              </span>
            )}
            <span className="text-[11px] text-text-muted font-mono select-none">{item.id}</span>
          </div>
          <h4 className="font-semibold text-sm text-text-primary leading-snug">{item.name}</h4>
        </div>
        <div className="text-right shrink-0">
          <div className="font-numeric font-bold text-sm sm:text-base text-accent">
            ₹{item.price.toLocaleString("en-IN")}
          </div>
          <span className={`text-[10px] font-mono select-none ${item.stock > 0 ? "text-success" : "text-error"}`}>
            {item.stock > 0 ? `${item.stock} IN STOCK` : "OUT OF STOCK"}
          </span>
        </div>
      </div>

      <p className="text-xs text-text-secondary mt-2.5 leading-relaxed">
        {item.description}
      </p>

      {item.specifications && item.specifications.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {item.specifications.slice(0, 3).map((spec, i) => (
            <span
              key={i}
              className="text-[11px] px-2 py-0.5 rounded bg-surface-subtle/80 text-text-secondary border border-border/60"
            >
              {spec}
            </span>
          ))}
        </div>
      )}

      {item.policy_notes && (
        <div className={`mt-3 flex items-start gap-2 p-2.5 rounded-button border text-xs leading-relaxed ${
          isOverCap 
            ? "bg-error-subtle border-error/20 text-error" 
            : "bg-surface-subtle border-border text-text-secondary"
        }`}>
          {isOverCap ? (
            <AlertTriangle className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <Tag className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <span>
            {item.policy_notes}
          </span>
        </div>
      )}

      <div className="mt-3.5 pt-3 border-t border-border flex items-center justify-between gap-3">
        <span className="text-[10px] text-text-muted font-mono tracking-wider uppercase select-none">Catalog Grounded</span>
        <button
          onClick={() => onPropose(item)}
          disabled={isProposed}
          className={`flex items-center gap-1.5 text-xs px-4 py-2 rounded-button font-medium transition-colors min-h-[44px] focus-ring select-none ${
            isOverCap
              ? "bg-error-subtle text-error border border-error/30 hover:bg-error/10 font-semibold"
              : "bg-accent hover:bg-accent-hover text-text-inverse font-semibold"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isOverCap ? "Test Cap Refusal" : "Prepare Order"}</span>
        </button>
      </div>
    </div>
  );
};
