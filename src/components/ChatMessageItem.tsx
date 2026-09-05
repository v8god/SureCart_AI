"use client";

import React, { useState } from "react";
import { ChatMessage, CatalogItem } from "@/types";
import { ProductCard } from "./ProductCard";
import { ConfirmationCard } from "./ConfirmationCard";
import { ComparisonView } from "./ComparisonView";
import {
  Search,
  CheckCircle2,
  ShieldAlert,
  CornerUpLeft,
  Copy,
  Check,
  Pencil,
  Quote,
} from "lucide-react";

interface ChatMessageItemProps {
  message: ChatMessage;
  onProposeProduct: (item: CatalogItem, offer?: import("@/types").ProductOffer) => void;
  onConfirmOrder: (token: string, idempotencyKey: string, simulateDecline?: boolean) => Promise<void>;
  onCancelProposal: (token: string) => Promise<void>;
  onReferenceMessage?: (message: ChatMessage) => void;
  onEditMessage?: (message: ChatMessage) => void;
  perOrderCap?: number;
  perSessionCap?: number;
  onSelectOrder?: (order: import("@/types").Order) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onProposeProduct,
  onConfirmOrder,
  onCancelProposal,
  onReferenceMessage,
  onEditMessage,
  onSelectOrder,
  perOrderCap = 5000,
  perSessionCap = 10000,
}) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [editText, setEditText] = useState(message.content);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    } catch {
      return "";
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    setIsEditingInline(false);
    if (onEditMessage) {
      onEditMessage({
        ...message,
        content: editText.trim(),
      });
    }
  };

  return (
    <div className={`group flex flex-col gap-1 my-3 max-w-3xl w-full mx-auto ${isUser ? "items-end" : "items-start"} animate-fade-in`}>
      {/* Meta Row: Actor Name + Time + Action Toolbar */}
      <div className="flex items-center gap-2 px-1 text-[11px] font-mono text-text-muted select-none">
        <span>{isUser ? "You" : "Shopping Agent"}</span>
        <span>•</span>
        <span>{formatTime(message.timestamp)}</span>

        {/* Message Actions */}
        <div className="flex items-center gap-1 ml-2 opacity-80 group-hover:opacity-100 transition-opacity">
          {/* Reference Action (90-degree bent arrow) */}
          <button
            onClick={() => onReferenceMessage?.(message)}
            title="Reference"
            aria-label="Reference"
            className="p-1 rounded hover:bg-surface-muted text-text-muted hover:text-accent transition-colors flex items-center gap-1 text-[10px]"
          >
            <CornerUpLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="sr-only">Reference</span>
          </button>

          {/* Copy Action (Transitions to Tick when copied) */}
          <button
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy message"}
            aria-label={copied ? "Copied" : "Copy message"}
            className="p-1 rounded hover:bg-surface-muted text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 text-[10px]"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-success transition-transform scale-110" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
          </button>

          {/* Edit Action (USER MESSAGES ONLY - AI strictly excluded) */}
          {isUser && (
            <button
              onClick={() => {
                if (onEditMessage) {
                  onEditMessage(message);
                } else {
                  setIsEditingInline(true);
                }
              }}
              title="Edit prompt"
              aria-label="Edit prompt"
              className="p-1 rounded hover:bg-surface-muted text-text-muted hover:text-accent transition-colors flex items-center gap-1 text-[10px]"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="sr-only">Edit</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-w-[92%] sm:max-w-[85%] space-y-2.5">
        {/* Referenced Message Quote Banner */}
        {message.referenced_snippet && (
          <div className="flex items-start gap-1.5 p-2 rounded-md bg-surface-subtle border-l-2 border-accent text-xs text-text-secondary italic">
            <Quote className="w-3 h-3 text-accent shrink-0 mt-0.5" aria-hidden="true" />
            <span className="truncate">&ldquo;{message.referenced_snippet}&rdquo;</span>
          </div>
        )}

        {/* Tool Activity Indicator */}
        {!isUser && message.tool_calls && message.tool_calls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 select-none">
            {message.tool_calls.map((tool, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-1.5 text-[11px] font-mono bg-surface-subtle text-text-secondary border border-border px-2 py-0.5 rounded-button"
              >
                <Search className="w-3 h-3 text-accent" aria-hidden="true" />
                <span>
                  Query: <strong className="text-text-primary font-medium">{tool.name}</strong>
                </span>
                <CheckCircle2 className="w-3 h-3 text-success" aria-hidden="true" />
              </div>
            ))}
          </div>
        )}

        {/* Message Content Bubble or Inline Edit */}
        {isEditingInline ? (
          <div className="bg-surface border border-accent rounded-card p-3 space-y-2 text-xs">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-surface-subtle border border-border rounded p-2 text-text-primary font-sans outline-none focus:ring-1 focus:ring-accent resize-none min-h-[60px]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditingInline(false)}
                className="px-2.5 py-1 rounded text-text-muted hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 bg-accent hover:bg-accent-hover text-text-inverse rounded font-medium"
              >
                Resubmit
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`p-4 rounded-card text-sm leading-relaxed ${
              isUser
                ? "bg-accent text-text-inverse rounded-tr-none font-medium"
                : "bg-surface border border-border text-text-primary rounded-tl-none"
            }`}
          >
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        )}

        {/* Spend-Cap Refusal Alert (Rule R2 / R3 Enforced) */}
        {message.refusal && (
          <div className="bg-error-subtle border border-error/30 rounded-card p-4 text-xs space-y-2 animate-fade-in">
            <div className="flex items-center gap-2 text-error font-semibold uppercase tracking-wider text-[10px] font-mono">
              <ShieldAlert className="w-4 h-4 text-error" aria-hidden="true" />
              <span>Spend-Cap Refusal</span>
            </div>
            <p className="text-text-primary leading-relaxed">{message.refusal.reason}</p>
            <div className="text-[11px] text-text-secondary bg-surface p-2.5 rounded-button border border-border font-mono leading-normal">
              Policy Gate: Order blocked server-side before confirmation proposal creation. No payment was attempted.
            </div>
          </div>
        )}

        {/* Product Comparison View */}
        {message.comparison && (
          <ComparisonView
            comparison={message.comparison}
            onProposeProduct={onProposeProduct}
          />
        )}

        {/* Grounded Products List (if not a comparison) */}
        {!message.comparison && message.grounded_products && message.grounded_products.length > 0 && (
          <div className="grid grid-cols-1 gap-2.5 pt-1">
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
            onSelectOrder={onSelectOrder}
            perOrderCap={perOrderCap}
            perSessionCap={perSessionCap}
          />
        )}
      </div>
    </div>
  );
};
