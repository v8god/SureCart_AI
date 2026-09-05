"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ChatPanel } from "@/components/ChatPanel";
import { AuditPanel } from "@/components/AuditPanel";
import { OrdersModal } from "@/components/OrdersModal";
import { AddressManagerModal } from "@/components/AddressManagerModal";
import { AdminAnalyticsModal } from "@/components/AdminAnalyticsModal";
import { ChatMessage, AuditEntry, CatalogItem, Order } from "@/types";
import { X } from "lucide-react";

export default function Home() {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [perOrderCap, setPerOrderCap] = useState<number>(5000);
  const [perSessionCap, setPerSessionCap] = useState<number>(10000);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMobileAuditOpen, setIsMobileAuditOpen] = useState<boolean>(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState<boolean>(false);
  const [isAddressesOpen, setIsAddressesOpen] = useState<boolean>(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [ordersCount, setOrdersCount] = useState<number>(0);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Initialize theme from localStorage or default to dark
  useEffect(() => {
    const savedTheme = localStorage.getItem("surecart_theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const handleToggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("surecart_theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  // Initialize or restore session
  useEffect(() => {
    let currentSession = localStorage.getItem("surecart_session_id");
    if (!currentSession) {
      currentSession = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem("surecart_session_id", currentSession);
    }
    setSessionId(currentSession);
  }, []);

  // Fetch audit trail, session spend & orders count
  const fetchAuditData = useCallback(async (sid: string) => {
    if (!sid) return;
    try {
      const res = await fetch(`/api/audit?sessionId=${encodeURIComponent(sid)}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
        setTotalSpent(data.totalSpent || 0);
      }
      // Fetch session caps
      const capsRes = await fetch(`/api/session/caps?sessionId=${encodeURIComponent(sid)}`);
      if (capsRes.ok) {
        const capsData = await capsRes.json();
        if (capsData.per_order_cap) setPerOrderCap(capsData.per_order_cap);
        if (capsData.per_session_cap) setPerSessionCap(capsData.per_session_cap);
      }
      // Fetch orders list & count
      const ordersRes = await fetch(`/api/history?type=orders&sessionId=${encodeURIComponent(sid)}`);
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        const loadedOrders = ordersData.orders || [];
        setOrders(loadedOrders);
        setOrdersCount(loadedOrders.length);
      }
    } catch (err) {
      console.error("Error fetching audit trail:", err);
    }
  }, []);

  const handleUpdateCaps = async (orderCap: number, sessionCap: number) => {
    if (!sessionId) return;
    try {
      const res = await fetch("/api/session/caps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          per_order_cap: orderCap,
          per_session_cap: sessionCap,
        }),
      });
      if (res.ok) {
        setPerOrderCap(orderCap);
        setPerSessionCap(sessionCap);
        await fetchAuditData(sessionId);
      }
    } catch (err) {
      console.error("Error updating caps:", err);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchAuditData(sessionId);
    }
  }, [sessionId, fetchAuditData]);

  // Send message handler
  const handleSendMessage = async (text: string, referencedMessage?: ChatMessage) => {
    if (!text.trim() || !sessionId || isLoading) return;

    const userMessageId = `msg_${Date.now()}`;
    const newUserMsg: ChatMessage = {
      id: userMessageId,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      referenced_message_id: referencedMessage?.id,
      referenced_snippet: referencedMessage ? referencedMessage.content.substring(0, 80) : undefined,
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const referencedContext = referencedMessage
        ? `[Referenced ${referencedMessage.role === "user" ? "User Prompt" : "Agent Message"}]: "${referencedMessage.content}"`
        : undefined;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: text,
          history: messages,
          referencedContext,
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
        comparison: data.comparison,
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

  // Direct product proposal handler with cross-site offer support
  const handleProposeProduct = async (item: CatalogItem, offer?: import("@/types").ProductOffer) => {
    if (offer) {
      await handleSendMessage(`I want to order ${item.name} from ${offer.site_name} (${offer.seller_name}) for ₹${offer.final_price.toLocaleString("en-IN")}.`);
    } else {
      await handleSendMessage(`I want to buy the ${item.name} for ₹${item.price.toLocaleString("en-IN")}.`);
    }
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
        if (data.order) {
          setOrders((prev) => [data.order, ...prev.filter((o) => o.id !== data.order.id)]);
        }
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

  // Order selection handler for Workspace View
  const handleSelectOrder = (orderOrId: Order | string) => {
    if (typeof orderOrId === "string") {
      const found = orders.find((o) => o.id === orderOrId);
      if (found) {
        setSelectedOrder(found);
      } else if (sessionId) {
        fetch(`/api/history?type=orders&sessionId=${encodeURIComponent(sessionId)}`)
          .then((res) => res.json())
          .then((data) => {
            const fetched = (data.orders || []).find((o: Order) => o.id === orderOrId);
            if (fetched) setSelectedOrder(fetched);
          })
          .catch(console.error);
      }
    } else {
      setSelectedOrder(orderOrId);
    }
  };

  const handleClearSelectedOrder = () => {
    setSelectedOrder(null);
  };

  return (
    <div className="flex flex-col h-screen bg-background text-text-primary overflow-hidden font-sans">
      {/* Application Header */}
      <AppHeader
        sessionId={sessionId}
        totalSpent={totalSpent}
        perOrderCap={perOrderCap}
        perSessionCap={perSessionCap}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onResetSession={handleResetSession}
        onToggleMobileAudit={() => setIsMobileAuditOpen(true)}
        onUpdateCaps={handleUpdateCaps}
        auditCount={auditLogs.length}
        ordersCount={ordersCount}
        onOpenOrders={() => setIsOrdersOpen(true)}
        onOpenAddresses={() => setIsAddressesOpen(true)}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
      />

      {/* Main 2-Column Application Layout */}
      <main className="flex-1 flex min-h-0 overflow-hidden max-w-7xl w-full mx-auto px-4 lg:px-6">
        {/* Left Column: Chat Conversation (~68% on desktop) */}
        <section className="flex-1 flex flex-col min-h-0 h-full border-r border-border overflow-hidden">
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            onProposeProduct={handleProposeProduct}
            onConfirmOrder={handleConfirmOrder}
            onCancelProposal={handleCancelProposal}
            isLoading={isLoading}
            perOrderCap={perOrderCap}
            perSessionCap={perSessionCap}
            selectedOrder={selectedOrder}
            allOrders={orders}
            onSelectOrder={handleSelectOrder}
            onClearSelectedOrder={handleClearSelectedOrder}
          />
        </section>

        {/* Right Column: Agent Activity & Audit Trail (~32% on desktop) */}
        <aside className="w-80 lg:w-96 hidden lg:flex flex-col min-h-0 h-full overflow-hidden">
          <AuditPanel
            logs={auditLogs}
            totalSpent={totalSpent}
            perOrderCap={perOrderCap}
            perSessionCap={perSessionCap}
            onRefresh={() => fetchAuditData(sessionId)}
            onSelectOrder={handleSelectOrder}
          />
        </aside>
      </main>

      {/* Mobile Audit Drawer */}
      {isMobileAuditOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-label="Agent Activity Drawer">
          <div className="w-full max-w-md ml-auto bg-surface h-full flex flex-col shadow-2xl relative border-l border-border">
            <div className="p-3.5 border-b border-border flex items-center justify-between bg-surface-subtle">
              <span className="font-semibold text-xs uppercase tracking-wider text-text-primary">Agent Activity</span>
              <button
                onClick={() => setIsMobileAuditOpen(false)}
                aria-label="Close activity drawer"
                className="p-1.5 rounded-button bg-surface text-text-muted hover:text-text-primary border border-border focus-ring"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AuditPanel
                logs={auditLogs}
                totalSpent={totalSpent}
                perOrderCap={perOrderCap}
                perSessionCap={perSessionCap}
                onRefresh={() => fetchAuditData(sessionId)}
                onSelectOrder={handleSelectOrder}
              />
            </div>
          </div>
        </div>
      )}

      {/* Orders & Purchase History Modal */}
      <OrdersModal
        isOpen={isOrdersOpen}
        onClose={() => setIsOrdersOpen(false)}
        sessionId={sessionId}
        onSelectOrder={handleSelectOrder}
      />

      {/* Address Presets Manager Modal */}
      <AddressManagerModal
        isOpen={isAddressesOpen}
        onClose={() => setIsAddressesOpen(false)}
        sessionId={sessionId}
      />

      {/* Admin Aggregate Analytics Modal */}
      <AdminAnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
      />
    </div>
  );
}
