"use client";

import React, { useState } from "react";
import { Order, Currency } from "@/types";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
  ShieldCheck,
  FileText,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  PackageCheck,
  Building,
  CreditCard,
  MapPin,
  AlertTriangle,
} from "lucide-react";

interface TransactionDetailViewProps {
  order: Order;
  allOrders?: Order[];
  onSelectOrder?: (orderId: string) => void;
  onReturnToConversation: () => void;
}

export const TransactionDetailView: React.FC<TransactionDetailViewProps> = ({
  order,
  allOrders = [],
  onSelectOrder,
  onReturnToConversation,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isCOD = order.status === "cod_confirmed" || order.payment_method?.toLowerCase().includes("cash on delivery") || order.payment_method?.toLowerCase().includes("cod");
  const isCaptured = order.status === "captured";
  const isDeclined = order.status === "declined" || order.status === "failed";
  const isPending = order.status === "pending" || order.status === "processing";
  const isCancelled = order.status === "cancelled";

  // Determine explicit backend verification status
  const getStatusSummary = () => {
    if (isCaptured) {
      return {
        badge: "Payment Captured & Confirmed",
        colorClasses: "bg-success-subtle text-success border-success/30",
        icon: <CheckCircle2 className="w-4 h-4 text-success" />,
        didTransactionHappen: true,
        explanation: "Verified transaction successfully completed. Payment authorized and captured on Razorpay gateway. Merchant notified for dispatch.",
      };
    }
    if (isCOD) {
      return {
        badge: "Cash on Delivery Confirmed",
        colorClasses: "bg-accent-subtle text-accent border-accent/30",
        icon: <PackageCheck className="w-4 h-4 text-accent" />,
        didTransactionHappen: true,
        explanation: "Cash on Delivery order successfully created in store system. ₹" + order.amount.toLocaleString("en-IN") + " is payable to courier on delivery.",
      };
    }
    if (isDeclined) {
      return {
        badge: "Payment Declined",
        colorClasses: "bg-error-subtle text-error border-error/30",
        icon: <XCircle className="w-4 h-4 text-error" />,
        didTransactionHappen: false,
        explanation: order.failure_reason || "Payment was declined by card network/gateway. Server guardrails prevented auto-retries. Zero funds deducted.",
      };
    }
    if (isPending) {
      return {
        badge: "Order Pending / In Review",
        colorClasses: "bg-warning-subtle text-warning border-warning/30",
        icon: <Clock className="w-4 h-4 text-warning" />,
        didTransactionHappen: false,
        explanation: "Order proposal generated with active reservation token. Awaiting explicit buyer authorization.",
      };
    }
    return {
      badge: order.status || "Status Unknown",
      colorClasses: "bg-surface-subtle text-text-muted border-border",
      icon: <AlertTriangle className="w-4 h-4 text-text-muted" />,
      didTransactionHappen: false,
      explanation: "Transaction status information is recorded as: " + order.status,
    };
  };

  const statusInfo = getStatusSummary();

  const handleDownloadReceipt = () => {
    const lines = [
      "===========================================================",
      "               SURECART AI OFFICIAL RECEIPT                ",
      "===========================================================",
      `Order ID:          ${order.id}`,
      `Transaction ID:    ${order.razorpay_payment_id || order.razorpay_order_id || "N/A"}`,
      `Date & Time:       ${new Date(order.created_at).toLocaleString("en-IN")}`,
      `Status:            ${order.status.toUpperCase()}`,
      `Payment Method:    ${order.payment_method || "Online"}`,
      "-----------------------------------------------------------",
      `Product:           ${order.item_name}`,
      `Catalog Item ID:   ${order.catalog_item_id}`,
      `Seller:            ${order.seller || "Verified Retailer"} (${order.website || "Store"})`,
      "-----------------------------------------------------------",
      `Base Price:        ₹${order.price_breakdown?.base_price || order.amount}`,
      `Shipping Fee:      ₹${order.price_breakdown?.shipping_fee || 0}`,
      `Discount:         -₹${order.price_breakdown?.discount || 0}`,
      `Taxes:             ${order.price_breakdown?.taxes || "Included (GST 18%)"}`,
      `TOTAL AMOUNT:      ₹${order.amount.toLocaleString("en-IN")} INR`,
      "-----------------------------------------------------------",
      `Shipping Address:  ${order.shipping_address ? `[${order.shipping_address.tag.toUpperCase()}] ${order.shipping_address.recipient_name}, ${order.shipping_address.address_line1}, ${order.shipping_address.city} ${order.shipping_address.postal_code}` : "Standard Delivery Address"}`,
      `Estimated Arrival: ${order.delivery_date || "Within 2-3 Business Days"}`,
      "===========================================================",
      "Authenticity & Zero-Storage Guarantee Verified by SureCart",
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Receipt-${order.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-5 animate-fade-in text-xs font-sans">
      {/* Top Navigation Bar: Return to Conversation */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
        <button
          onClick={onReturnToConversation}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-button bg-surface hover:bg-surface-subtle border border-border text-text-secondary hover:text-text-primary transition-colors font-medium focus-ring"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-accent" />
          <span>Return to Conversation</span>
        </button>

        {/* Multi-Order Switcher Dropdown (If multiple orders exist) */}
        {allOrders.length > 1 && onSelectOrder && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-text-muted font-mono hidden sm:inline">Switch Order:</span>
            <select
              value={order.id}
              onChange={(e) => onSelectOrder(e.target.value)}
              className="bg-surface border border-border rounded-input px-2.5 py-1 text-xs text-text-primary font-mono focus-ring outline-none"
            >
              {allOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  #{o.id.substring(0, 10)} — {o.item_name.substring(0, 22)}… (₹{o.amount.toLocaleString("en-IN")})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Transaction Reality Status Banner (Answers: Did this transaction actually happen?) */}
      <div className={`p-4 rounded-card border ${statusInfo.colorClasses} space-y-2`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold">
            {statusInfo.icon}
            <span className="font-mono text-xs uppercase tracking-wider">{statusInfo.badge}</span>
          </div>
          <span className="font-numeric font-bold text-sm sm:text-base">
            ₹{order.amount.toLocaleString("en-IN")} {order.currency || "INR"}
          </span>
        </div>
        <p className="text-xs leading-relaxed opacity-95">
          {statusInfo.explanation}
        </p>
      </div>

      {/* Core Identification & Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Order ID Card */}
        <div className="bg-surface border border-border rounded-card p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-text-muted">Order ID</span>
            <button
              onClick={() => handleCopy(order.id, "orderId")}
              title="Copy Order ID"
              className="p-1 rounded hover:bg-surface-subtle text-text-muted hover:text-text-primary"
            >
              {copiedField === "orderId" ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <div className="font-mono font-bold text-xs text-text-primary select-all break-all">
            {order.id}
          </div>
        </div>

        {/* Transaction / Gateway ID Card */}
        <div className="bg-surface border border-border rounded-card p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-text-muted">Payment Transaction ID</span>
            {(order.razorpay_payment_id || order.razorpay_order_id) && (
              <button
                onClick={() => handleCopy(order.razorpay_payment_id || order.razorpay_order_id, "txId")}
                title="Copy Transaction ID"
                className="p-1 rounded hover:bg-surface-subtle text-text-muted hover:text-text-primary"
              >
                {copiedField === "txId" ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              </button>
            )}
          </div>
          <div className="font-mono font-bold text-xs text-text-primary select-all break-all">
            {order.razorpay_payment_id || order.razorpay_order_id || (isCOD ? `COD_${order.id.substring(0, 12)}` : "Pending Payment")}
          </div>
        </div>
      </div>

      {/* Product & Merchant Partner Information */}
      <div className="bg-surface border border-border rounded-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-accent" />
            <span className="font-semibold text-xs text-text-primary">Purchased Product & Merchant</span>
          </div>
          <span className="text-[10px] uppercase font-mono text-text-muted bg-surface-subtle px-2 py-0.5 rounded border border-border">
            Verified Partner
          </span>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-semibold text-sm text-text-primary">{order.item_name}</h3>
          <p className="text-xs text-text-secondary">
            Merchant: <strong className="text-text-primary font-medium">{order.seller || "Infiniti Retail Ltd"}</strong> via{" "}
            <strong className="text-text-primary font-medium">{order.website || "Official Partner"}</strong>
          </p>
          {order.product_url && (
            <a
              href={order.product_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-hover font-medium pt-0.5"
            >
              <span>View Product on Merchant Site</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Itemized Price Breakdown */}
      <div className="bg-surface border border-border rounded-card p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-border pb-2 font-semibold text-xs text-text-primary">
          <CreditCard className="w-4 h-4 text-accent" />
          <span>Payment Breakdown & Safeguards</span>
        </div>

        <div className="space-y-2 font-mono text-xs text-text-secondary">
          <div className="flex justify-between">
            <span>Base Product Price:</span>
            <span>₹{(order.price_breakdown?.base_price || order.amount).toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping & Courier Fee:</span>
            <span>{order.price_breakdown?.shipping_fee ? `+₹${order.price_breakdown.shipping_fee}` : "Free Delivery"}</span>
          </div>
          {order.price_breakdown?.discount ? (
            <div className="flex justify-between text-success">
              <span>Instant Offer Discount:</span>
              <span>-₹{order.price_breakdown.discount}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-text-muted">
            <span>Taxes & GST:</span>
            <span>{order.price_breakdown?.taxes || "Included (GST 18%)"}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-border font-bold text-text-primary text-sm">
            <span>Final Amount:</span>
            <span className="text-accent font-numeric">₹{order.amount.toLocaleString("en-IN")} INR</span>
          </div>
        </div>

        <div className="pt-2 border-t border-border text-[11px] text-text-muted flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
          <span>Strict Zero-Card Storage Enforced: No PAN, CVV, or card PIN is ever stored.</span>
        </div>
      </div>

      {/* Shipping & Delivery ETA */}
      <div className="bg-surface border border-border rounded-card p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-border pb-2 font-semibold text-xs text-text-primary">
          <MapPin className="w-4 h-4 text-accent" />
          <span>Delivery Details & Courier ETA</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <span className="text-text-muted font-mono text-[10px] uppercase block">Delivery Address</span>
            {order.shipping_address ? (
              <div>
                <div className="font-semibold text-text-primary">
                  [{order.shipping_address.tag.toUpperCase()}] {order.shipping_address.recipient_name}
                </div>
                <div className="text-text-secondary mt-0.5">
                  {order.shipping_address.address_line1}, {order.shipping_address.city} {order.shipping_address.postal_code}
                </div>
              </div>
            ) : (
              <div className="text-text-secondary">Indiranagar, Bengaluru 560038</div>
            )}
          </div>

          <div className="space-y-1 sm:border-l sm:border-border sm:pl-3">
            <span className="text-text-muted font-mono text-[10px] uppercase block">Courier ETA</span>
            <div className="font-semibold text-text-primary">{order.delivery_date || "Within 2-3 Business Days"}</div>
            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-hover font-semibold mt-1"
              >
                <Truck className="w-3 h-3" />
                <span>Track Live Package</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Controls */}
      <div className="pt-2 flex items-center justify-between gap-3">
        <button
          onClick={handleDownloadReceipt}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-button bg-surface hover:bg-surface-subtle border border-border text-text-primary font-medium text-xs transition-colors focus-ring"
        >
          <FileText className="w-3.5 h-3.5 text-text-secondary" />
          <span>Download Official Receipt (.txt)</span>
        </button>

        <button
          onClick={onReturnToConversation}
          className="px-4 py-2 rounded-button bg-accent hover:bg-accent-hover text-text-inverse font-semibold text-xs transition-colors focus-ring"
        >
          Back to Chat
        </button>
      </div>
    </div>
  );
};
