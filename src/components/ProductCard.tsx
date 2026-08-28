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
    <div className="bg-[#0d111c] border border-white/5 rounded-xl p-4 transition-all duration-200 hover:border-indigo-500/20 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-white/5">
              {item.category}
            </span>
            <span className="text-[10px] text-slate-500 font-mono select-none">{item.id}</span>
          </div>
          <h4 className="font-display font-semibold text-sm text-white leading-snug tracking-tight">{item.name}</h4>
        </div>
        <div className="text-right shrink-0">
          <div className="font-numeric font-semibold text-sm sm:text-base text-indigo-400">
            ₹{item.price.toLocaleString("en-IN")}
          </div>
          <span className={`text-[10px] font-mono select-none ${item.stock > 0 ? "text-emerald-500" : "text-rose-500"}`}>
            {item.stock > 0 ? `${item.stock} IN STOCK` : "OUT OF STOCK"}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
        {item.description}
      </p>

      {item.policy_notes && (
        <div className={`mt-3 flex items-start gap-2 p-2.5 rounded-lg border text-[11px] leading-relaxed ${
          isOverCap 
            ? "bg-rose-500/5 border-rose-500/20 text-rose-300" 
            : "bg-slate-900/50 border-white/5 text-slate-400"
        }`}>
          {isOverCap ? (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Tag className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
          )}
          <span>
            {item.policy_notes}
          </span>
        </div>
      )}

      <div className="mt-3.5 pt-3.5 border-t border-white/5 flex items-center justify-between gap-3">
        <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase select-none">Catalog Match</span>
        <button
          onClick={() => onPropose(item)}
          disabled={isProposed}
          className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg font-medium transition-all focus-ring select-none ${
            isOverCap
              ? "bg-rose-500/5 text-rose-300 border border-rose-500/20 hover:bg-rose-500/10"
              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm font-semibold"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>{isOverCap ? "Test Cap Refusal" : "Prepare Order"}</span>
        </button>
      </div>
    </div>
  );
};
