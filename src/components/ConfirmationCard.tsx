"use client";

import React, { useState } from "react";
import { CatalogItem, Order } from "@/types";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Lock,
  ArrowRight,
} from "lucide-react";

interface ConfirmationCardProps {
  proposal: {
    token: string;
    item: CatalogItem;
    amount: number;
    currency: string;
    reason: string;
    idempotency_key: string;
    status: "pending" | "confirming" | "success" | "declined" | "cancelled";
    order?: Order;
    error_message?: string;
    decline_code?: string;
  };
  onConfirm: (token: string, idempotencyKey: string, simulateDecline?: boolean) => Promise<void>;
  onCancel: (token: string) => Promise<void>;
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

  // 1. SUCCESS STATE (Flow A) - Receipt/Invoice Redesign
  if (proposal.status === "success" && proposal.order) {
    return (
      <div className="bg-[#0b0f19] border border-emerald-500/20 rounded-xl p-5 shadow-sm my-4 animate-fade-in relative overflow-hidden">
        {/* Subtle top border accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500/80"></div>
        
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="font-mono text-[10px] tracking-wider uppercase text-emerald-400 font-bold">Transaction Success</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">ID: {proposal.order.id.substring(0, 10)}</span>
        </div>

        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <h4 className="font-display font-semibold text-sm text-white">{proposal.item.name}</h4>
              <p className="text-[11px] text-slate-400">Payment captured via Razorpay Test Mode</p>
            </div>
            <div className="text-right">
              <div className="font-numeric font-bold text-base text-emerald-400">
                ₹{proposal.amount.toLocaleString("en-IN")}
              </div>
              <span className="text-[9px] uppercase font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold select-none">
                {proposal.order.status}
              </span>
            </div>
          </div>

          {/* Dotted separator line */}
          <div className="border-t border-dashed border-white/10 my-1"></div>

          {/* Receipt Details block */}
          <div className="space-y-1.5 text-[11px] font-mono text-slate-400">
            <div className="flex justify-between">
              <span>Razorpay Order ID:</span>
              <span className="text-slate-200">{proposal.order.razorpay_order_id}</span>
            </div>
            {proposal.order.razorpay_payment_id && (
              <div className="flex justify-between">
                <span>Razorpay Payment ID:</span>
                <span className="text-slate-200">{proposal.order.razorpay_payment_id}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Timestamp:</span>
              <span className="text-slate-200">
                {new Date(proposal.order.created_at).toLocaleString("en-IN", { hour12: false })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. DECLINED / FAILURE STATE (Flow C)
  if (proposal.status === "declined") {
    return (
      <div className="bg-[#140b0f] border border-rose-500/20 rounded-xl p-5 shadow-sm my-4 animate-fade-in relative overflow-hidden">
        {/* Subtle top border accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500/80"></div>

        <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-white/5 text-rose-400">
          <XCircle className="w-4 h-4 text-rose-500" />
          <span className="font-mono text-[10px] tracking-wider uppercase font-bold">Checkout Declined</span>
        </div>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h4 className="font-display font-semibold text-sm text-white">{proposal.item.name}</h4>
              <p className="text-xs text-rose-300/90 leading-relaxed font-medium">
                {proposal.error_message || "The payment was declined by the payment system."}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="font-numeric font-bold text-base text-slate-300">
                ₹{proposal.amount.toLocaleString("en-IN")}
              </div>
              <span className="inline-block px-1.5 py-0.5 text-[9px] font-mono tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase rounded font-bold mt-1 select-none">
                Declined
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-lg p-3 text-[11px] border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-rose-400 font-semibold uppercase tracking-wider text-[9px] font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Policy Notice: Zero Retry</span>
            </div>
            <p className="text-slate-400 leading-normal">
              Rule R18 mandate: failed transactions never auto-retry. Control is returned to the buyer. You may cancel or choose an alternative method.
            </p>
          </div>

          <div className="pt-1 flex items-center justify-end gap-3.5">
            <button
              onClick={handleCancelClick}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel Order
            </button>
            <button
              onClick={() => {
                setSimulateDecline(false);
                handleConfirmClick();
              }}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm focus-ring select-none"
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
      <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3.5 my-3 text-slate-500 text-xs flex items-center justify-between font-mono">
        <div className="flex items-center gap-2 truncate">
          <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span className="truncate">Proposal cancelled for {proposal.item.name} (₹{proposal.amount.toLocaleString("en-IN")})</span>
        </div>
        <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider select-none shrink-0 pl-2">Cancelled</span>
      </div>
    );
  }

  // 4. PENDING / REVIEW STATE (Default Gated State)
  return (
    <div className="bg-[#0b0e17] border-l-2 border-indigo-500 border border-white/5 rounded-xl p-5 shadow-sm my-4 relative overflow-hidden transition-all">
      {/* Visual Accent Header */}
      <div className="flex items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 font-mono">
            Explicit Authorization
          </span>
        </div>
        <span className="text-[9px] font-mono text-slate-500 select-none">
          Token: {proposal.token.substring(0, 8)}...
        </span>
      </div>

      {/* Main Proposal Content */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="font-display font-semibold text-sm text-white tracking-tight leading-snug">{proposal.item.name}</h3>
            <p className="text-[11px] text-slate-500">Category: {proposal.item.category}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 select-none">Total Amount</div>
            <div className="font-numeric font-bold text-base sm:text-lg text-white">
              ₹{proposal.amount.toLocaleString("en-IN")}
            </div>
            <span className="text-[9px] text-slate-500 font-mono">INR</span>
          </div>
        </div>

        {/* Reason for proposal */}
        <div className="border-l border-indigo-500/40 pl-3 py-0.5">
          <span className="text-[9px] uppercase font-mono tracking-wider text-indigo-400/80 font-semibold block mb-0.5">
            Why this purchase
          </span>
          <p className="text-xs text-slate-300 italic leading-relaxed">
            &ldquo;{proposal.reason}&rdquo;
          </p>
        </div>

        {/* Server Policy Gating Checks (Checklist Redesign) */}
        <div className="bg-slate-950/40 rounded-xl p-3.5 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
            <span>Server Policy Checklist</span>
            <span className="text-indigo-400 tracking-normal normal-case">4-Gate Enforcement</span>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300 font-mono">
            <div className="flex items-center justify-between py-0.5">
              <span className="text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Per-order cap</span>
              </span>
              <span className="text-[11px] font-numeric text-slate-400">&le; ₹{perOrderCap.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Session cap</span>
              </span>
              <span className="text-[11px] font-numeric text-slate-400">&le; ₹{perSessionCap.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Idempotency token</span>
              </span>
              <span className="text-[11px] text-emerald-500">Verified</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Buyer confirmation</span>
              </span>
              <span className="text-[11px] text-amber-500 animate-pulse font-bold uppercase tracking-wider text-[10px]">Gating</span>
            </div>
          </div>
        </div>

        {/* Notice */}
        <div className="flex items-start gap-1.5 text-[10px] text-slate-500 leading-normal">
          <Lock className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
          <span>Confirming triggers the server Guardrail Layer and initiates Razorpay test capture.</span>
        </div>

        {/* Test Mode Decline Simulation Toggle */}
        <div className="pt-0.5">
          <label className="flex items-center gap-2 text-[10px] text-amber-400 cursor-pointer bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 px-2.5 py-1.5 rounded transition-all select-none">
            <input
              type="checkbox"
              checked={simulateDecline}
              onChange={(e) => setSimulateDecline(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 w-3 h-3 cursor-pointer"
            />
            <span className="font-mono tracking-wide uppercase font-semibold text-[9px]">Simulate Bank Decline (Flow C)</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-end gap-3.5">
          <button
            onClick={handleCancelClick}
            disabled={isSubmitting || proposal.status === "confirming"}
            className="px-3 py-2 rounded text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors select-none"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmClick}
            disabled={isSubmitting || proposal.status === "confirming"}
            className="flex items-center gap-1.5 px-4.5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus-ring select-none"
          >
            {isSubmitting || proposal.status === "confirming" ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Confirming Order...</span>
              </>
            ) : (
              <>
                <span>Confirm Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
