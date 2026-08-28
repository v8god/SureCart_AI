"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, CatalogItem } from "@/types";
import { ChatMessageItem } from "./ChatMessageItem";
import { Send, Shield, Sparkles } from "lucide-react";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onProposeProduct: (item: CatalogItem) => void;
  onConfirmOrder: (token: string, idempotencyKey: string, simulateDecline?: boolean) => Promise<void>;
  onCancelProposal: (token: string) => Promise<void>;
  isLoading: boolean;
  perOrderCap: number;
  perSessionCap: number;
}

const QUICK_PROMPTS = [
  {
    label: "🎧 Aura Wireless Earbuds (₹2,499)",
    prompt: "I want to buy the Aura Wireless Noise-Cancelling Earbuds for ₹2,499.",
    description: "Happy path order setup",
  },
  {
    label: "🚫 SonicStudio Soundbar (₹15,999)",
    prompt: "Order the SonicStudio Reference Studio Soundbar for ₹15,999.",
    description: "Test spend-cap refusal limit",
  },
  {
    label: "⚡ VoltCore Charger (₹2,899)",
    prompt: "Show me the VoltCore 100W GaN Fast Charger and prepare an order.",
    description: "Multi-order session testing",
  },
  {
    label: "🔍 Browse Audio accessories",
    prompt: "Search the catalog for all available audio accessories.",
    description: "Search live inventory catalog",
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
}) => {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText("");
    await onSendMessage(text);
  };

  const handlePromptClick = async (prompt: string) => {
    if (isLoading) return;
    await onSendMessage(prompt);
  };

  return (
    <div className="flex flex-col h-full bg-[#080a0f] text-slate-200">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Onboarding Empty State Greeting */}
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto py-12 px-4 space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto shadow-sm">
                <Shield className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h2 className="font-display font-semibold text-2xl text-white tracking-tight pt-2">
                Secure Conversational Checkout
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Describe a product or query the inventory catalog. I can prepare purchase proposals, but payments are strictly locked behind your explicit confirmation.
              </p>
            </div>

            {/* Policy Limits Summary Widget */}
            <div className="grid grid-cols-2 gap-3 bg-slate-900/40 border border-white/5 rounded-xl p-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 uppercase font-mono text-[9px] tracking-wider block">Per-Order Cap</span>
                <span className="text-sm font-semibold text-white font-numeric">₹{perOrderCap.toLocaleString("en-IN")}</span>
                <p className="text-[10px] text-slate-400 leading-normal">Blocked automatically at proposal stage.</p>
              </div>
              <div className="space-y-1 border-l border-white/5 pl-4">
                <span className="text-slate-500 uppercase font-mono text-[9px] tracking-wider block">Cumulative Session Cap</span>
                <span className="text-sm font-semibold text-white font-numeric">₹{perSessionCap.toLocaleString("en-IN")}</span>
                <p className="text-[10px] text-slate-400 leading-normal">Total spend limits across multiple orders.</p>
              </div>
            </div>

            {/* Suggested Prompt Cards */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-mono tracking-wider text-slate-500 font-medium">Suggested Test Flows</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {QUICK_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePromptClick(item.prompt)}
                    disabled={isLoading}
                    className="text-left bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-indigo-500/30 p-3.5 rounded-xl transition-all disabled:opacity-50 focus-ring"
                  >
                    <div className="font-medium text-xs text-white truncate">{item.label}</div>
                    <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{item.description}</div>
                  </button>
                ))}
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
            perOrderCap={perOrderCap}
            perSessionCap={perSessionCap}
          />
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 animate-fade-in my-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            </div>
            <div className="bg-[#0d111c] border border-white/5 px-4 py-2.5 rounded-2xl rounded-tl-none text-xs text-slate-400 flex items-center gap-2 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              <span>Evaluating catalog &amp; policy rules...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts (Only visible when chat has messages, as a horizontal slider) */}
      {messages.length > 0 && (
        <div className="px-4 sm:px-6 py-2.5 border-t border-white/5 bg-[#0a0e17]">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
            {QUICK_PROMPTS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handlePromptClick(item.prompt)}
                disabled={isLoading}
                title={item.prompt}
                className="text-[11px] font-medium whitespace-nowrap bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Composer */}
      <div className="p-4 sm:px-6 border-t border-white/5 bg-[#0a0e17]">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-4xl mx-auto w-full">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Search catalog or request purchase (e.g. 'I want to buy the earbuds')..."
            disabled={isLoading}
            className="flex-1 bg-slate-900 border border-white/5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 disabled:text-slate-600 text-white font-medium p-3 rounded-xl transition-all shadow-md shrink-0 focus-ring"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
