"use client";

import React from "react";
import { ChatMessage, CatalogItem } from "@/types";
import { ProductCard } from "./ProductCard";
import { ConfirmationCard } from "./ConfirmationCard";
import { Search, CheckCircle2, ShieldAlert } from "lucide-react";

interface ChatMessageItemProps {
  message: ChatMessage;
  onProposeProduct: (item: CatalogItem) => void;
  onConfirmOrder: (token: string, idempotencyKey: string, simulateDecline?: boolean) => Promise<void>;
  onCancelProposal: (token: string) => Promise<void>;
  perOrderCap?: number;
  perSessionCap?: number;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onProposeProduct,
  onConfirmOrder,
  onCancelProposal,
  perOrderCap = 5000,
  perSessionCap = 10000,
}) => {
  const isUser = message.role === "user";

  // Format time helper
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    } catch {
      return "";
    }
  };

  return (
    <div className={`flex flex-col gap-1 my-4 max-w-3xl w-full mx-auto ${isUser ? "items-end" : "items-start"} animate-fade-in`}>
      {/* Meta Row: Actor Name + Time */}
      <div className="flex items-center gap-2 px-1 text-[10px] font-mono text-slate-500 uppercase tracking-wider select-none">
        <span>{isUser ? "You" : "Shopping Agent"}</span>
        <span>•</span>
        <span>{formatTime(message.timestamp)}</span>
      </div>

      <div className="max-w-[90%] sm:max-w-[85%] space-y-2.5">
        {/* Tool Activity Timeline (Quiet and Integrated) */}
        {!isUser && message.tool_calls && message.tool_calls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1.5 select-none">
            {message.tool_calls.map((tool, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 text-[10px] font-mono bg-slate-900 text-slate-400 border border-white/5 px-2 py-0.5 rounded"
              >
                <Search className="w-3 h-3 text-indigo-400" />
                <span>
                  Query: <strong className="text-slate-300 font-medium">{tool.name}</strong>
                </span>
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              </div>
            ))}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`p-4 rounded-xl text-sm leading-relaxed ${
            isUser
              ? "bg-indigo-600 text-white rounded-tr-none shadow-sm font-medium"
              : "bg-[#0d111c] border border-white/5 text-slate-100 rounded-tl-none shadow-sm"
          }`}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {/* Spend-Cap Refusal Alert (Rule R2 / R3 Enforced) */}
        {message.refusal && (
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 text-xs space-y-2.5 animate-fade-in shadow-sm">
            <div className="flex items-center gap-2 text-rose-400 font-semibold uppercase tracking-wider text-[10px] font-mono">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Spend-Cap Refusal</span>
            </div>
            <p className="text-slate-300 leading-relaxed">{message.refusal.reason}</p>
            <div className="text-[10px] text-slate-400 bg-slate-950/60 p-2.5 rounded border border-white/5 font-mono leading-normal">
              Deterministic Gate: Order blocked in backend policy check before purchase proposal creation. No payment API was hit.
            </div>
          </div>
        )}

        {/* Grounded Products List */}
        {message.grounded_products && message.grounded_products.length > 0 && (
          <div className="grid grid-cols-1 gap-3 pt-1">
            {message.grounded_products.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                onPropose={onProposeProduct}
                perOrderCap={perOrderCap}
              />
            ))}
          </div>
        )}

        {/* Purchase Proposal / Gated Confirmation Card */}
        {message.proposal && (
          <ConfirmationCard
            proposal={message.proposal}
            onConfirm={onConfirmOrder}
            onCancel={onCancelProposal}
            perOrderCap={perOrderCap}
            perSessionCap={perSessionCap}
          />
        )}
      </div>
    </div>
  );
};
