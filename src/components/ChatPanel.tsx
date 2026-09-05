"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, CatalogItem, ProductOffer, Order } from "@/types";
import { ChatMessageItem } from "./ChatMessageItem";
import { AsciiDonut } from "./AsciiDonut";
import { ActivityDonutWindow } from "./ActivityDonutWindow";
import { TransactionDetailView } from "./TransactionDetailView";
import {
  Send,
  Shield,
  Volume2,
  ShieldAlert,
  Zap,
  Search,
  Loader2,
  GitCompare,
  MapPin,
  Tag,
  CornerUpLeft,
  X,
} from "lucide-react";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, referencedMessage?: ChatMessage) => Promise<void>;
  onProposeProduct: (item: CatalogItem, offer?: ProductOffer) => void;
  onConfirmOrder: (token: string, idempotencyKey: string, simulateDecline?: boolean) => Promise<void>;
  onCancelProposal: (token: string) => Promise<void>;
  isLoading: boolean;
  perOrderCap: number;
  perSessionCap: number;
  selectedOrder?: Order | null;
  allOrders?: Order[];
  onSelectOrder?: (order: Order | string) => void;
  onClearSelectedOrder?: () => void;
}

const QUICK_PROMPTS = [
  {
    id: "prompt-filter",
    icon: Tag,
    label: "Earbuds under ₹3,000 in Black",
    prompt: "Show me earbuds under ₹3,000 in black color across verified sellers.",
    description: "Multi-filter: price range, color, and genuine seller offers",
  },
  {
    id: "prompt-compare",
    icon: GitCompare,
    label: "Compare Amazon & Croma offers",
    prompt: "Compare the Aura Earbuds and Pulse Bluetooth Speaker side by side.",
    description: "Grounded comparison matrix with cross-site price highlights",
  },
  {
    id: "prompt-shipping",
    icon: MapPin,
    label: "Buy earbuds & ship to Home",
    prompt: "I want to buy the Aura Wireless Earbuds on Amazon and ship them to my home address.",
    description: "Tagged shipping address and itemized price breakdown",
  },
  {
    id: "prompt-soundbar",
    icon: ShieldAlert,
    label: "SonicStudio Soundbar (₹15,999)",
    prompt: "Order the SonicStudio Reference Studio Soundbar for ₹15,999.",
    description: "Over-cap purchase refusal check (Rule R2)",
  },
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  onProposeProduct,
  onConfirmOrder,
  onCancelProposal,
  isLoading,
  perOrderCap,
  perSessionCap,
  selectedOrder,
  allOrders = [],
  onSelectOrder,
  onClearSelectedOrder,
}) => {
  const [inputText, setInputText] = useState("");
  const [referencedMessage, setReferencedMessage] = useState<ChatMessage | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    if (!selectedOrder) {
      scrollToBottom();
    }
  }, [messages, isLoading, selectedOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    const refMsg = referencedMessage || undefined;
    setInputText("");
    setReferencedMessage(null);
    if (selectedOrder) {
      onClearSelectedOrder?.();
    }
    await onSendMessage(text, refMsg);
  };

  const handlePromptClick = async (prompt: string) => {
    if (isLoading) return;
    if (selectedOrder) {
      onClearSelectedOrder?.();
    }
    await onSendMessage(prompt);
  };

  const handleReference = (msg: ChatMessage) => {
    setReferencedMessage(msg);
    inputRef.current?.focus();
  };

  const handleEdit = (msg: ChatMessage) => {
    setInputText(msg.content);
    inputRef.current?.focus();
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 w-full bg-background text-text-primary relative overflow-hidden">
      {/* Floating Corner Customer Activity Window during agent requests */}
      <ActivityDonutWindow isActive={isLoading} />

      {/* Main Scrollable Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6 space-y-4"
        role="log"
        aria-live="polite"
      >
        {selectedOrder ? (
          <TransactionDetailView
            order={selectedOrder}
            allOrders={allOrders}
            onSelectOrder={onSelectOrder}
            onReturnToConversation={onClearSelectedOrder || (() => {})}
          />
        ) : (
          <>
        {/* Onboarding Empty State Greeting with Classic Rotating ASCII Donut */}
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto py-6 px-4 space-y-6 animate-fade-in">
            {/* Signature Classic Rotating ASCII Donut (Torus) */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <AsciiDonut speed={0.9} className="opacity-90 transition-opacity" />
              <span className="text-[10px] font-mono tracking-widest uppercase text-text-muted select-none">
                Autonomous Commerce Engine
              </span>
            </div>

            <div className="text-center space-y-2">
              <h2 className="font-semibold text-xl text-text-primary tracking-tight">
                What are you looking for?
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
                Describe a product in your own words. The agent searches verified sellers (Amazon, Croma, Flipkart), compares offers with itemized pricing, and attaches your saved delivery address.
              </p>
            </div>

            {/* Policy Limits Summary */}
            <div className="grid grid-cols-2 gap-3 bg-surface border border-border rounded-card p-4 text-xs">
              <div className="space-y-1">
                <span className="text-text-muted uppercase font-mono text-[9px] tracking-wider block">Per-Order Cap</span>
                <span className="text-sm font-semibold text-text-primary font-numeric">₹{perOrderCap.toLocaleString("en-IN")}</span>
                <p className="text-[11px] text-text-secondary leading-normal">Blocked automatically at proposal stage.</p>
              </div>
              <div className="space-y-1 border-l border-border pl-4">
                <span className="text-text-muted uppercase font-mono text-[9px] tracking-wider block">Session Cap</span>
                <span className="text-sm font-semibold text-text-primary font-numeric">₹{perSessionCap.toLocaleString("en-IN")}</span>
                <p className="text-[11px] text-text-secondary leading-normal">Cumulative ceiling across orders.</p>
              </div>
            </div>

            {/* Suggested Prompt Cards */}
            <div className="space-y-2.5">
              <h3 className="text-xs uppercase font-mono tracking-wider text-text-muted font-medium">Suggested Test Prompts</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {QUICK_PROMPTS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handlePromptClick(item.prompt)}
                      disabled={isLoading}
                      className="text-left bg-surface hover:bg-surface-subtle border border-border hover:border-accent/40 p-3.5 rounded-card transition-colors disabled:opacity-50 focus-ring group"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-text-muted group-hover:text-accent shrink-0 transition-colors" aria-hidden="true" />
                        <span className="font-medium text-xs text-text-primary truncate">{item.label}</span>
                      </div>
                      <div className="text-[11px] text-text-secondary mt-1 line-clamp-1 pl-5.5">{item.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Message Stream */}
        {messages.length > 0 && messages.map((msg) => (
          <ChatMessageItem
            key={msg.id}
            message={msg}
            onProposeProduct={onProposeProduct}
            onConfirmOrder={onConfirmOrder}
            onCancelProposal={onCancelProposal}
            onReferenceMessage={handleReference}
            onEditMessage={handleEdit}
            onSelectOrder={onSelectOrder}
            perOrderCap={perOrderCap}
            perSessionCap={perSessionCap}
          />
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 my-2" role="status">
            <div className="w-8 h-8 rounded-button bg-accent-subtle border border-accent/20 flex items-center justify-center text-accent">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            </div>
            <div className="bg-surface border border-border px-4 py-2 rounded-card text-xs text-text-secondary flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
              <span>Searching genuine stores & verifying policies…</span>
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* Suggested Quick Prompts Row */}
      {!selectedOrder && messages.length > 0 && (
        <div className="px-4 sm:px-6 py-2 border-t border-border bg-surface-subtle shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {QUICK_PROMPTS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handlePromptClick(item.prompt)}
                  disabled={isLoading}
                  title={item.prompt}
                  className="flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap bg-surface hover:bg-surface-muted text-text-secondary hover:text-text-primary border border-border px-3 py-1.5 rounded-button transition-colors disabled:opacity-50 focus-ring"
                >
                  <Icon className="w-3 h-3 text-text-muted" aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Referenced Message Active Banner */}
      {referencedMessage && (
        <div className="px-4 sm:px-6 py-2 bg-surface-subtle border-t border-accent/30 flex items-center justify-between gap-2 text-xs animate-slide-in shrink-0">
          <div className="flex items-center gap-2 text-text-secondary truncate">
            <CornerUpLeft className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />
            <span className="font-medium text-accent shrink-0">
              Referencing {referencedMessage.role === "user" ? "Your Prompt" : "Agent Message"}:
            </span>
            <span className="truncate italic">&ldquo;{referencedMessage.content}&rdquo;</span>
          </div>
          <button
            onClick={() => setReferencedMessage(null)}
            title="Dismiss reference"
            className="text-text-muted hover:text-text-primary p-1 rounded transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Input Composer */}
      <div className="p-4 sm:px-6 border-t border-border bg-surface shrink-0 z-10">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-4xl mx-auto w-full">
          <label htmlFor="chat-input" className="sr-only">Message the shopping agent</label>
          <input
            id="chat-input"
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              selectedOrder
                ? `Ask a follow-up about Order #${selectedOrder.id.substring(0, 8)}…`
                : referencedMessage
                ? "Ask a follow-up about the referenced message…"
                : "Describe what you're looking for…"
            }
            disabled={isLoading}
            className="flex-1 bg-surface-subtle border border-border focus:border-accent rounded-input px-4 py-2.5 text-sm text-text-primary placeholder-text-muted outline-none transition-colors disabled:opacity-50 focus-ring"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            aria-label="Send message"
            className="bg-accent hover:bg-accent-hover disabled:bg-surface-muted disabled:text-text-muted text-text-inverse font-medium min-h-[44px] min-w-[44px] p-2.5 rounded-button transition-colors shrink-0 focus-ring flex items-center justify-center"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
};

