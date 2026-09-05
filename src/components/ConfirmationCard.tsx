"use client";

import React, { useState } from "react";
import { CatalogItem, Order, ShippingAddress } from "@/types";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Lock,
  ArrowRight,
  MapPin,
  FileText,
} from "lucide-react";

interface ConfirmationCardProps {
  proposal: {
    token: string;
    item: CatalogItem;
    amount: number;
    currency: string;
    reason: string;
    idempotency_key: string;
    offer?: import("@/types").ProductOffer;
    price_breakdown?: import("@/types").PriceBreakdown;
    payment_method?: string;
    shipping_address?: ShippingAddress;
    status: "pending" | "confirming" | "success" | "declined" | "cancelled";
    order?: Order;
    error_message?: string;
    decline_code?: string;
  };
  onConfirm: (token: string, idempotencyKey: string, simulateDecline?: boolean) => Promise<void>;
  onCancel: (token: string) => Promise<void>;
  onSelectOrder?: (order: Order) => void;
  perOrderCap?: number;
  perSessionCap?: number;
}

export const ConfirmationCard: React.FC<ConfirmationCardProps> = ({
  proposal,
  onConfirm,
  onCancel,
  perOrderCap = 5000,
  perSessionCap = 10000,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [simulateDecline, setSimulateDecline] = useState(false);

  const handleConfirmClick = async () => {
    if (isSubmitting || proposal.status !== "pending") return;
    setIsSubmitting(true);
    try {
      await onConfirm(proposal.token, proposal.idempotency_key, simulateDecline);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onCancel(proposal.token);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. SUCCESS / CAPTURED STATE (Flow A) - Clean Receipt Layout
  if (proposal.status === "success" && proposal.order) {
    const isCOD = proposal.order.status === "cod_confirmed" || proposal.order.payment_method?.includes("Cash on Delivery");
    const order = proposal.order;

    return (
      <div className="bg-surface border border-success/30 rounded-card p-5 my-3 relative overflow-hidden transition-colors animate-fade-in shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-1 bg-success"></div>
        
        <div className="flex items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" aria-hidden="true" />
            <span className="font-mono text-[11px] tracking-wider uppercase text-success font-semibold">
              {isCOD ? "COD Order Placed" : "Payment Authorized & Confirmed"}
            </span>
          </div>
          <span className="text-[11px] font-mono text-text-muted">Order #{order.id.substring(0, 12)}</span>
        </div>

        <div className="space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-semibold text-sm text-text-primary">{proposal.item.name}</h4>
              <p className="text-xs text-text-secondary mt-0.5">
                {order.offer
                  ? `Purchased via ${order.offer.site_name} • ${order.offer.seller_name}`
                  : order.seller
                  ? `Merchant: ${order.seller}`
                  : "Purchased through SureCart AI"}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="font-numeric font-bold text-base text-success">
                ₹{proposal.amount.toLocaleString("en-IN")}
              </div>
              <span className={`inline-block text-[10px] uppercase font-mono px-1.5 py-0.5 rounded font-semibold select-none mt-1 ${
                isCOD ? "bg-accent-subtle text-accent" : "bg-success-subtle text-success"
              }`}>
                {isCOD ? "Pay on Delivery" : "Paid via Razorpay"}
              </span>
            </div>
          </div>

          {/* Delivery & Seller Highlights */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-surface-subtle p-3 rounded-button border border-border">
            <div>
              <span className="text-text-muted font-mono text-[10px] uppercase block">Estimated Delivery</span>
              <span className="font-medium text-text-primary mt-0.5 block">
                {order.delivery_date || "Within 2-3 Business Days"}
              </span>
            </div>
            <div>
              <span className="text-text-muted font-mono text-[10px] uppercase block">Payment Method</span>
              <span className="font-medium text-text-primary mt-0.5 block truncate">
                {order.payment_method || (isCOD ? "Cash on Delivery" : "Razorpay (UPI / Card)")}
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs font-mono text-text-secondary bg-surface-subtle p-3 rounded-button border border-border">
            <div className="flex justify-between">
              <span className="text-text-muted">Order ID:</span>
              <span className="text-text-primary select-all">{order.id}</span>
            </div>
            {order.razorpay_payment_id && (
              <div className="flex justify-between">
                <span className="text-text-muted">Payment ID:</span>
                <span className="text-text-primary select-all">{order.razorpay_payment_id}</span>
              </div>
            )}
            {order.shipping_address && (
              <div className="flex justify-between">
                <span className="text-text-muted">Delivered To:</span>
                <span className="text-accent font-medium">
                  [{order.shipping_address.tag.toUpperCase()}] {order.shipping_address.recipient_name} ({order.shipping_address.postal_code})
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-text-muted">Timestamp:</span>
              <span className="text-text-primary">
                {new Date(order.created_at).toLocaleTimeString("en-IN", { hour12: false })}
              </span>
            </div>
          </div>

          {/* Interactive Actions: View Receipt / View Order Details / Track Order */}
          <div className="pt-2 border-t border-border flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const receiptText = `SURECART AI RECEIPT\nOrder: ${order.id}\nItem: ${proposal.item.name}\nAmount: ₹${proposal.amount}\nMethod: ${order.payment_method}\nSeller: ${order.seller || "Authorized Store"}\nETA: ${order.delivery_date || "2-3 Days"}\nStatus: ${order.status}`;
                  const blob = new Blob([receiptText], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `Receipt-${order.id}.txt`;
                  a.click();
                }}
                className="text-xs text-text-secondary hover:text-text-primary px-3 py-1.5 rounded bg-surface hover:bg-surface-subtle border border-border transition-colors font-medium"
              >
                Download Receipt
              </button>

              {onSelectOrder && (
                <button
                  onClick={() => onSelectOrder(order)}
                  className="text-xs text-accent hover:text-accent-hover font-semibold px-3 py-1.5 rounded bg-accent-subtle hover:bg-accent-subtle/80 border border-accent/20 transition-colors flex items-center gap-1.5 focus-ring"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Full Order Details</span>
                </button>
              )}
            </div>

            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent hover:text-accent-hover font-semibold px-3 py-1.5 rounded bg-accent-subtle hover:bg-accent-subtle/80 border border-accent/20 transition-colors flex items-center gap-1"
              >
                <span>Track Package</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. DECLINED / FAILURE STATE (Flow C)
  if (proposal.status === "declined") {
    return (
      <div className="bg-surface border border-error/30 rounded-card p-5 my-3 relative overflow-hidden transition-colors animate-fade-in">
        <div className="absolute top-0 left-0 right-0 h-1 bg-error"></div>

        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-border text-error">
          <XCircle className="w-4 h-4 text-error" aria-hidden="true" />
          <span className="font-mono text-[11px] tracking-wider uppercase font-semibold">Payment Wasn't Completed</span>
        </div>

        <div className="space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-semibold text-sm text-text-primary">{proposal.item.name}</h4>
              <p className="text-xs text-error font-medium mt-1">
                {proposal.error_message || "The payment was declined by the payment system."}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="font-numeric font-bold text-base text-text-primary">
                ₹{proposal.amount.toLocaleString("en-IN")}
              </div>
              <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono tracking-wider bg-error-subtle text-error uppercase rounded font-semibold mt-1 select-none">
                Declined
              </span>
            </div>
          </div>

          <div className="bg-surface-subtle rounded-button p-3 text-xs border border-border space-y-1">
            <div className="flex items-center gap-1.5 text-error font-semibold uppercase tracking-wider text-[10px] font-mono">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Policy Notice: Zero Retry</span>
            </div>
            <p className="text-text-secondary leading-normal">
              No automatic retry was made. You can try again with a supported payment method or cancel the order.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              onClick={handleCancelClick}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-button text-xs font-medium text-text-secondary hover:text-text-primary transition-colors min-h-[44px] focus-ring"
            >
              Cancel Order
            </button>
            <button
              onClick={() => {
                setSimulateDecline(false);
                handleConfirmClick();
              }}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-button text-xs font-semibold text-text-inverse bg-accent hover:bg-accent-hover transition-colors min-h-[44px] focus-ring"
            >
              Try Again with Standard Method
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. CANCELLED STATE
  if (proposal.status === "cancelled") {
    return (
      <div className="bg-surface-subtle border border-border rounded-card p-3.5 my-3 text-text-muted text-xs flex items-center justify-between font-mono animate-fade-in">
        <div className="flex items-center gap-2 truncate">
          <XCircle className="w-3.5 h-3.5 text-text-muted shrink-0" aria-hidden="true" />
          <span className="truncate">Proposal cancelled for {proposal.item.name} (₹{proposal.amount.toLocaleString("en-IN")})</span>
        </div>
        <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider select-none shrink-0 pl-2">Cancelled</span>
      </div>
    );
  }

  // 4. PENDING / REVIEW PURCHASE STATE (Default Gated State)
  return (
    <div className="bg-surface border-l-4 border-l-accent border border-border rounded-card p-5 my-3 relative overflow-hidden transition-colors animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-accent font-mono">
            Review Order Details
          </span>
        </div>
        <span className="text-[10px] font-mono text-text-muted select-none">
          Token: {proposal.token.substring(0, 10)}…
        </span>
      </div>

      {/* Product & Seller Identification */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-semibold text-sm text-text-primary leading-snug">{proposal.item.name}</h3>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            {proposal.offer ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-subtle border border-border font-medium text-text-primary">
                Seller: {proposal.offer.site_name} ({proposal.offer.seller_name})
              </span>
            ) : (
              <span>Category: {proposal.item.category}</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase font-mono tracking-wider text-text-muted select-none">Total Payable</div>
          <div className="font-numeric font-bold text-lg text-text-primary">
            ₹{proposal.amount.toLocaleString("en-IN")}
          </div>
          <span className="text-[10px] text-text-muted font-mono">INR</span>
        </div>
      </div>

      {/* Itemized Price Breakdown */}
      {proposal.price_breakdown && (
        <div className="bg-surface-subtle rounded-button p-3 border border-border text-xs font-mono space-y-1.5">
          <div className="flex justify-between text-text-secondary">
            <span>Product Base Price:</span>
            <span>₹{proposal.price_breakdown.base_price.toLocaleString("en-IN")}</span>
          </div>
          {proposal.price_breakdown.shipping_fee > 0 ? (
            <div className="flex justify-between text-text-secondary">
              <span>Delivery Fee:</span>
              <span>+₹{proposal.price_breakdown.shipping_fee}</span>
            </div>
          ) : (
            <div className="flex justify-between text-text-secondary">
              <span>Delivery:</span>
              <span className="text-success font-medium">Free Delivery</span>
            </div>
          )}
          {proposal.price_breakdown.discount > 0 && (
            <div className="flex justify-between text-success">
              <span>Instant Offer Discount:</span>
              <span>-₹{proposal.price_breakdown.discount.toLocaleString("en-IN")}</span>
            </div>
          )}
          <div className="flex justify-between text-text-muted pt-1 border-t border-border/50">
            <span>Taxes:</span>
            <span>{proposal.price_breakdown.taxes}</span>
          </div>
          <div className="flex justify-between font-bold text-text-primary pt-1 border-t border-border">
            <span>Final Expected Amount:</span>
            <span className="text-accent font-numeric">₹{proposal.price_breakdown.total.toLocaleString("en-IN")}</span>
          </div>
        </div>
      )}

      {/* Delivery Address Row */}
      {proposal.shipping_address && (
        <div className="bg-surface-subtle rounded-button p-3 border border-border flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-accent">
                  Ship To [{proposal.shipping_address.tag.toUpperCase()}]
                </span>
                <span className="text-xs text-text-primary font-medium">• {proposal.shipping_address.recipient_name}</span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                {proposal.shipping_address.address_line1}, {proposal.shipping_address.city} {proposal.shipping_address.postal_code}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-text-muted bg-surface px-2 py-0.5 rounded border border-border shrink-0">
            Confirmed
          </span>
        </div>
      )}

      {/* Payment Method Notice */}
      <div className="flex items-center justify-between p-2.5 rounded bg-surface-subtle border border-border text-xs">
        <span className="text-text-muted font-mono">Payment Method:</span>
        <span className="font-medium text-text-primary font-mono">{proposal.payment_method || "Authorized UPI (••••@okhdfcbank)"}</span>
      </div>

      {/* Reason for proposed purchase */}
      <div className="bg-surface-subtle rounded-button p-3 border border-border">
        <span className="text-[10px] uppercase font-mono tracking-wider text-accent font-semibold block mb-0.5">
          Why this purchase
        </span>
        <p className="text-xs text-text-secondary italic leading-relaxed">
          &ldquo;{proposal.reason}&rdquo;
        </p>
      </div>

        {/* 4-Gate Policy Checklist */}
        <div className="bg-surface-subtle rounded-button p-3.5 border border-border space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-text-secondary uppercase tracking-wider font-mono">
            <span>Purchase Checks</span>
            <span className="text-accent text-[10px] lowercase font-normal">server-enforced</span>
          </div>

          <div className="space-y-1 text-xs text-text-secondary font-mono">
            <div className="flex items-center justify-between py-0.5">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" aria-hidden="true" />
                <span>Per-order limit</span>
              </span>
              <span className="font-numeric text-text-muted">&le; ₹{perOrderCap.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" aria-hidden="true" />
                <span>Session limit</span>
              </span>
              <span className="font-numeric text-text-muted">&le; ₹{perSessionCap.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" aria-hidden="true" />
                <span>Idempotency token</span>
              </span>
              <span className="text-success">Verified</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-warning shrink-0" aria-hidden="true" />
                <span>Buyer confirmation</span>
              </span>
              <span className="text-warning font-semibold uppercase text-[10px]">Awaiting</span>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="flex items-start gap-1.5 text-[11px] text-text-muted leading-normal">
          <Lock className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
          <span>This action will authorize the payment. Confirmation is strictly required.</span>
        </div>

        {/* Bank Decline Simulation Toggle (For Testing Flow C) */}
        <div>
          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer bg-surface-subtle hover:bg-surface-muted border border-border px-3 py-2 rounded-button transition-colors select-none">
            <input
              type="checkbox"
              checked={simulateDecline}
              onChange={(e) => setSimulateDecline(e.target.checked)}
              className="rounded border-border text-accent focus:ring-accent w-3.5 h-3.5 cursor-pointer"
            />
            <span className="font-mono text-[11px]">Test Flow C: Simulate Bank Decline Scenario</span>
          </label>
        </div>

        {/* Actions - Explicitly Labelled */}
        <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
          <button
            onClick={handleCancelClick}
            disabled={isSubmitting || proposal.status === "confirming"}
            className="px-4 py-2 rounded-button text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors min-h-[44px] focus-ring"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmClick}
            disabled={isSubmitting || proposal.status === "confirming"}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-button text-xs font-semibold text-text-inverse bg-accent hover:bg-accent-hover transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
          >
            {isSubmitting || proposal.status === "confirming" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                <span>Confirming…</span>
              </>
            ) : (
              <>
                <span>
                  {proposal.payment_method?.includes("Cash on Delivery")
                    ? "Confirm Cash on Delivery"
                    : `Confirm & Pay ₹${proposal.amount.toLocaleString("en-IN")}`}
                </span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
    </div>
  );
};
