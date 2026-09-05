"use client";

import React, { useState, useEffect } from "react";
import { Order } from "@/types";
import { X, ShoppingBag, Download, ExternalLink, Truck, CheckCircle2, Clock, XCircle, FileText } from "lucide-react";

interface OrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  onSelectOrder?: (order: Order) => void;
}

export const OrdersModal: React.FC<OrdersModalProps> = ({ isOpen, onClose, sessionId, onSelectOrder }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/history?type=orders&sessionId=${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen, sessionId]);

  const handleExportCSV = () => {
    window.open(`/api/history?type=export&format=csv&sessionId=${encodeURIComponent(sessionId)}`, "_blank");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" role="dialog" aria-modal="true" aria-label="Purchase History & Receipts">
      <div className="bg-surface border border-border rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:px-6 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-subtle flex items-center justify-center text-accent">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-text-primary">Orders & Receipts</h3>
              <p className="text-xs text-text-secondary">Track verified orders and download receipts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {orders.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary bg-surface hover:bg-surface-subtle border border-border px-3 py-1.5 rounded-button transition-colors focus-ring"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-button text-text-muted hover:text-text-primary hover:bg-surface border border-transparent hover:border-border transition-colors focus-ring"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className="p-4 sm:px-6 overflow-y-auto flex-1 space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-text-muted">Loading purchase history…</div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-medium text-text-primary">No orders placed yet in this session.</p>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Ask the agent to find products or compare offers, then confirm to see your completed orders here.
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const isCOD = order.status === "cod_confirmed" || order.payment_method?.includes("Cash on Delivery");
              const isCaptured = order.status === "captured";

              return (
                <div
                  key={order.id}
                  className="p-4 rounded-card border border-border bg-surface-subtle/60 hover:border-accent/40 transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-text-primary">{order.item_name}</span>
                        <span
                          className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded font-semibold ${
                            isCaptured
                              ? "bg-success-subtle text-success border border-success/20"
                              : isCOD
                              ? "bg-accent-subtle text-accent border border-accent/20"
                              : "bg-error-subtle text-error border border-error/20"
                          }`}
                        >
                          {isCOD ? "COD Confirmed" : isCaptured ? "Payment Captured" : order.status}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {order.seller ? `Seller: ${order.seller}` : "Verified Seller Partner"} •{" "}
                        {order.website || "Online Store"}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-numeric font-bold text-sm text-text-primary">
                        ₹{order.amount.toLocaleString("en-IN")}
                      </div>
                      <span className="text-[10px] font-mono text-text-muted">
                        {new Date(order.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-text-secondary bg-surface p-2.5 rounded-button border border-border">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Order ID:</span>
                      <span className="text-text-primary select-all">{order.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Payment:</span>
                      <span className="text-text-primary truncate max-w-[140px]">{order.payment_method || "Prepaid"}</span>
                    </div>
                    {order.delivery_date && (
                      <div className="flex justify-between sm:col-span-2">
                        <span className="text-text-muted">Estimated Delivery:</span>
                        <span className="text-accent font-medium">{order.delivery_date}</span>
                      </div>
                    )}
                  </div>

                  {/* Action links */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const receiptText = `SURECART AI OFFICIAL RECEIPT\n--------------------------------\nOrder ID: ${order.id}\nItem: ${order.item_name}\nAmount: ₹${order.amount}\nStatus: ${order.status}\nPayment Method: ${order.payment_method}\nSeller: ${order.seller || "Verified Retailer"}\nETA: ${order.delivery_date || "2-3 Days"}\nDate: ${order.created_at}`;
                          const blob = new Blob([receiptText], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `Receipt-${order.id}.txt`;
                          a.click();
                        }}
                        className="text-text-muted hover:text-text-primary flex items-center gap-1 text-[11px] font-medium"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Download Receipt</span>
                      </button>

                      {onSelectOrder && (
                        <button
                          onClick={() => {
                            onSelectOrder(order);
                            onClose();
                          }}
                          className="text-accent hover:text-accent-hover flex items-center gap-1 text-[11px] font-semibold"
                        >
                          <span>View in Workspace &rarr;</span>
                        </button>
                      )}
                    </div>

                    {order.tracking_url && (
                      <a
                        href={order.tracking_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:text-accent-hover font-semibold flex items-center gap-1 text-[11px]"
                      >
                        <Truck className="w-3 h-3" />
                        <span>Track Package</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
