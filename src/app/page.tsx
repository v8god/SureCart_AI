"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ChatPanel } from "@/components/ChatPanel";
import { AuditPanel } from "@/components/AuditPanel";
import { ChatMessage, AuditEntry, CatalogItem } from "@/types";
import { X, ShieldAlert } from "lucide-react";

export default function Home() {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [perOrderCap, setPerOrderCap] = useState<number>(5000);
  const [perSessionCap, setPerSessionCap] = useState<number>(10000);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMobileAuditOpen, setIsMobileAuditOpen] = useState<boolean>(false);

  // Initialize or restore session
  useEffect(() => {
    let currentSession = localStorage.getItem("surecart_session_id");
    if (!currentSession) {
      currentSession = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem("surecart_session_id", currentSession);
    }
    setSessionId(currentSession);
  }, []);

  // Fetch audit trail & session spend
  const fetchAuditData = useCallback(async (sid: string) => {
    if (!sid) return;
    try {
      const res = await fetch(`/api/audit?sessionId=${encodeURIComponent(sid)}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
        setTotalSpent(data.totalSpent || 0);
        if (data.perOrderCap) setPerOrderCap(data.perOrderCap);
        if (data.perSessionCap) setPerSessionCap(data.perSessionCap);
      }
    } catch (err) {
      console.error("Error fetching audit trail:", err);
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      fetchAuditData(sessionId);
    }
  }, [sessionId, fetchAuditData]);

  // Send message handler
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !sessionId || isLoading) return;

    const userMessageId = `msg_${Date.now()}`;
    const newUserMsg: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: text,
          history: messages,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to get agent response");
      }

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content: data.message || "I have processed your request.",
        timestamp: new Date().toISOString(),
        tool_calls: data.toolCallsExecuted?.map((t: { name: string; args: Record<string, unknown>; result: unknown }, i: number) => ({
          id: `tool_${i}`,
          name: t.name,
          args: t.args,
          result: t.result,
          status: "completed",
        })),
        proposal: data.proposal,
        refusal: data.refusal,
        grounded_products: data.groundedProducts,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      await fetchAuditData(sessionId);
    } catch (error: unknown) {
      const err = error as Error;
      const errorMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: "assistant",
        content: `Error: ${err.message}. Please check that the server is running.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Direct product proposal handler
  const handleProposeProduct = async (item: CatalogItem) => {
    await handleSendMessage(`I want to buy the ${item.name} for ₹${item.price.toLocaleString("en-IN")}.`);
  };

  // Order confirmation handler
  const handleConfirmOrder = async (
    token: string,
    idempotencyKey: string,
    simulateDecline?: boolean
  ) => {
    if (!sessionId) return;

    // Set proposal state to confirming in UI
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.proposal && msg.proposal.token === token) {
          return {
            ...msg,
            proposal: {
              ...msg.proposal,
              status: "confirming",
            },
          };
        }
        return msg;
      })
    );

    try {
      const res = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          token,
          idempotencyKey,
          action: "confirm",
          simulateDecline: Boolean(simulateDecline),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Successful capture (Flow A)
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.proposal && msg.proposal.token === token) {
              return {
                ...msg,
                proposal: {
                  ...msg.proposal,
                  status: "success",
                  order: data.order,
                },
              };
            }
            return msg;
          })
        );
      } else {
        // Declined / Failed (Flow C)
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.proposal && msg.proposal.token === token) {
              return {
                ...msg,
                proposal: {
                  ...msg.proposal,
                  status: "declined",
                  error_message: data.error_description || data.refusal_reason || "Payment was declined by gateway.",
                  decline_code: data.error_code,
                  order: data.order,
                },
              };
            }
            return msg;
          })
        );
      }

      await fetchAuditData(sessionId);
    } catch (err: unknown) {
      const error = err as Error;
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.proposal && msg.proposal.token === token) {
            return {
              ...msg,
              proposal: {
                ...msg.proposal,
                status: "declined",
                error_message: `Network/Gateway error: ${error.message}`,
              },
            };
          }
          return msg;
        })
      );
    }
  };

  // Proposal cancellation handler
  const handleCancelProposal = async (token: string) => {
    if (!sessionId) return;

    try {
      await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          token,
          action: "cancel",
        }),
      });

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.proposal && msg.proposal.token === token) {
            return {
              ...msg,
              proposal: {
                ...msg.proposal,
                status: "cancelled",
              },
            };
          }
          return msg;
        })
      );

      await fetchAuditData(sessionId);
    } catch (err) {
      console.error("Cancel proposal error:", err);
    }
  };

  // Reset session handler
  const handleResetSession = async () => {
    if (!sessionId) return;
    try {
      await fetch("/api/session/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      setMessages([]);
      await fetchAuditData(sessionId);
    } catch (err) {
      console.error("Error resetting session:", err);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#07090e] text-slate-100 overflow-hidden font-sans">
      {/* Header */}
      <AppHeader
        sessionId={sessionId}
        totalSpent={totalSpent}
        perSessionCap={perSessionCap}
        onResetSession={handleResetSession}
        onToggleMobileAudit={() => setIsMobileAuditOpen(true)}
        auditCount={auditLogs.length}
      />

      {/* Main 2-Column Workspace */}
      <main className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto px-4 lg:px-6">
        {/* Left Column: Chat Conversation (65-70% on desktop) */}
        <section className="flex-1 flex flex-col h-full border-r border-white/5 overflow-hidden">
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            onProposeProduct={handleProposeProduct}
            onConfirmOrder={handleConfirmOrder}
            onCancelProposal={handleCancelProposal}
            isLoading={isLoading}
            perOrderCap={perOrderCap}
            perSessionCap={perSessionCap}
          />
        </section>

        {/* Right Column: Agent Activity & Audit Trail (30-35% on desktop) */}
        <aside className="w-80 lg:w-96 hidden lg:flex flex-col h-full overflow-hidden">
          <AuditPanel
            logs={auditLogs}
            totalSpent={totalSpent}
            perOrderCap={perOrderCap}
            perSessionCap={perSessionCap}
            onRefresh={() => fetchAuditData(sessionId)}
          />
        </aside>
      </main>

      {/* Mobile Audit Drawer */}
      {isMobileAuditOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md ml-auto bg-[#0d111c] h-full flex flex-col shadow-2xl relative border-l border-white/5">
            <div className="p-3.5 border-b border-white/5 flex items-center justify-between bg-[#121829]">
              <span className="font-display font-semibold text-xs uppercase tracking-wider text-white">Audit Log</span>
              <button
                onClick={() => setIsMobileAuditOpen(false)}
                className="p-1.5 rounded-md bg-slate-900 text-slate-400 hover:text-white border border-white/5 focus-ring"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AuditPanel
                logs={auditLogs}
                totalSpent={totalSpent}
                perOrderCap={perOrderCap}
                perSessionCap={perSessionCap}
                onRefresh={() => fetchAuditData(sessionId)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
