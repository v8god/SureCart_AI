"use client";

import React, { useState, useEffect } from "react";
import { AuditEntry, VendorOverride } from "@/types";
import { AuditItem } from "./AuditItem";
import { Activity, RefreshCw, Layers, ShieldCheck, ShieldAlert, Check, Plus, AlertCircle } from "lucide-react";

interface AuditPanelProps {
  logs: AuditEntry[];
  totalSpent: number;
  perOrderCap: number;
  perSessionCap: number;
  onRefresh: () => void;
  isLoading?: boolean;
  onSelectOrder?: (orderId: string) => void;
}

export const AuditPanel: React.FC<AuditPanelProps> = ({
  logs,
  totalSpent,
  perOrderCap,
  perSessionCap,
  onRefresh,
  isLoading = false,
  onSelectOrder,
}) => {
  const [activeTab, setActiveTab] = useState<"logs" | "vendors">("logs");
  const [filterActor, setFilterActor] = useState<"all" | "agent" | "buyer" | "system">("all");
  const [overrides, setOverrides] = useState<VendorOverride[]>([]);
  const [newSellerName, setNewSellerName] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [newStatus, setNewStatus] = useState<"allowed" | "blocked">("allowed");
  const [newNote, setNewNote] = useState("");
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  const fetchOverrides = async () => {
    try {
      const res = await fetch("/api/vendors");
      if (res.ok) {
        const data = await res.json();
        setOverrides(data.overrides || []);
      }
    } catch (e) {
      console.error("Failed to fetch overrides:", e);
    }
  };

  useEffect(() => {
    fetchOverrides();
  }, []);

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSellerName.trim() || !newSiteName.trim()) return;
    setIsSavingOverride(true);
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seller_name: newSellerName.trim(),
          site_name: newSiteName.trim(),
          status: newStatus,
          note: newNote.trim() || undefined,
        }),
      });
      if (res.ok) {
        setNewSellerName("");
        setNewSiteName("");
        setNewNote("");
        await fetchOverrides();
        onRefresh();
      }
    } finally {
      setIsSavingOverride(false);
    }
  };

  const handleToggleOverride = async (item: VendorOverride) => {
    const nextStatus = item.status === "allowed" ? "blocked" : "allowed";
    try {
      await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seller_name: item.seller_name,
          site_name: item.site_name,
          status: nextStatus,
          note: `Toggled to ${nextStatus} by admin`,
        }),
      });
      await fetchOverrides();
      onRefresh();
    } catch (e) {
      console.error("Failed to toggle override:", e);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterActor === "all") return true;
    return log.actor === filterActor;
  });

  const percentSpent = Math.min(100, Math.round((totalSpent / perSessionCap) * 100));

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border text-text-primary">
      {/* Panel Header */}
      <div className="p-4 border-b border-border bg-surface sticky top-0 z-10 space-y-3.5 select-none">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-button bg-accent-subtle border border-accent/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-accent stroke-[1.75]" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-semibold text-xs text-text-primary uppercase tracking-wider">Admin & Audit</h3>
              <p className="text-[11px] text-text-muted font-mono">Session & Vendor Controls</p>
            </div>
          </div>

          <button
            onClick={() => {
              onRefresh();
              fetchOverrides();
            }}
            disabled={isLoading}
            title="Refresh audit trail"
            aria-label="Refresh audit trail"
            className="p-1.5 rounded-button bg-surface-subtle hover:bg-surface-muted border border-border text-text-secondary hover:text-text-primary transition-colors focus-ring"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-accent" : ""}`} aria-hidden="true" />
          </button>
        </div>

        {/* Spend & Cap Tracker Widget */}
        <div className="bg-surface-subtle rounded-card p-3 border border-border space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-text-muted">SESSION SPEND:</span>
            <span className="font-numeric font-bold text-text-primary">
              ₹{totalSpent.toLocaleString("en-IN")}{" "}
              <span className="text-text-muted font-normal">/ ₹{perSessionCap.toLocaleString("en-IN")}</span>
            </span>
          </div>

          <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                percentSpent > 80 ? "bg-warning" : "bg-accent"
              }`}
              style={{ width: `${percentSpent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-text-muted font-mono pt-1 border-t border-border">
            <span>PER-ORDER LIMIT:</span>
            <span className="font-semibold text-text-secondary font-numeric">₹{perOrderCap.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Section View Mode (Logs vs Vendor Overrides) */}
        <div className="flex items-center p-0.5 bg-surface-subtle border border-border rounded-input select-none">
          <button
            onClick={() => setActiveTab("logs")}
            className={`flex-1 text-[10px] font-mono font-medium py-1 rounded transition-colors uppercase tracking-wider ${
              activeTab === "logs"
                ? "bg-surface text-accent border border-border font-bold shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Audit Log ({logs.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("vendors");
              fetchOverrides();
            }}
            className={`flex-1 text-[10px] font-mono font-medium py-1 rounded transition-colors uppercase tracking-wider ${
              activeTab === "vendors"
                ? "bg-surface text-accent border border-border font-bold shadow-sm"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Vendor Allowlist ({overrides.length})
          </button>
        </div>

        {/* Actor Filter Tabs (Shown when in Logs tab) */}
        {activeTab === "logs" && (
          <div className="flex items-center p-0.5 bg-surface-subtle border border-border rounded-input select-none">
            {(["all", "agent", "buyer", "system"] as const).map((actor) => (
              <button
                key={actor}
                onClick={() => setFilterActor(actor)}
                className={`flex-1 text-[10px] font-mono font-medium py-1 rounded transition-colors uppercase tracking-wider ${
                  filterActor === actor
                    ? "bg-surface text-accent border border-border font-bold shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                {actor}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {activeTab === "logs" ? (
          filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-text-muted select-none">
              <Layers className="w-8 h-8 mb-2 text-text-muted/60 stroke-[1.2]" aria-hidden="true" />
              <p className="text-xs font-semibold text-text-secondary">No activity yet</p>
              <p className="text-[11px] text-text-muted mt-1 max-w-[200px] leading-normal font-mono">
                Events will record here as you search the catalog or confirm proposals.
              </p>
            </div>
          ) : (
            filteredLogs.map((entry) => <AuditItem key={entry.id} entry={entry} onSelectOrder={onSelectOrder} />)
          )
        ) : (
          /* Vendor Allowlist / Override Section */
          <div className="space-y-4 text-xs">
            <div className="bg-surface-subtle p-3 rounded-card border border-border space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-text-primary">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span>Vendor Verification Rules</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-normal">
                Vendors must have genuine return/exchange policies, positive review authenticity, and high rating. Admins can directly allowlist or block any merchant below.
              </p>
            </div>

            {/* Existing Overrides */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted font-semibold block">
                Active Admin Directives ({overrides.length})
              </span>

              {overrides.map((item) => (
                <div
                  key={item.id}
                  className="bg-surface border border-border rounded-card p-3 space-y-2 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-text-primary">{item.seller_name}</span>
                      <span className="text-[10px] font-mono text-text-muted">({item.site_name})</span>
                    </div>
                    {item.note && <p className="text-[10px] text-text-secondary italic mt-0.5">{item.note}</p>}
                  </div>

                  <button
                    onClick={() => handleToggleOverride(item)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider border transition-colors ${
                      item.status === "allowed"
                        ? "bg-success-subtle text-success border-success/30 hover:bg-warning-subtle hover:text-warning"
                        : "bg-error-subtle text-error border-error/30 hover:bg-success-subtle hover:text-success"
                    }`}
                  >
                    {item.status === "allowed" ? "Allowed" : "Blocked"}
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Override Form */}
            <form onSubmit={handleAddOverride} className="bg-surface-subtle p-3 rounded-card border border-border space-y-2.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-accent font-semibold block">
                Add Direct Vendor Override
              </span>

              <input
                type="text"
                placeholder="Seller Name (e.g. Appario Retail)"
                value={newSellerName}
                onChange={(e) => setNewSellerName(e.target.value)}
                className="w-full bg-surface border border-border rounded p-2 text-xs text-text-primary outline-none focus:border-accent"
              />

              <input
                type="text"
                placeholder="Platform / Site (e.g. Amazon India)"
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                className="w-full bg-surface border border-border rounded p-2 text-xs text-text-primary outline-none focus:border-accent"
              />

              <div className="flex gap-2">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as "allowed" | "blocked")}
                  className="bg-surface border border-border rounded p-2 text-xs text-text-primary outline-none focus:border-accent flex-1"
                >
                  <option value="allowed">ALLOWLIST (Verified)</option>
                  <option value="blocked">BLOCKLIST (Reject)</option>
                </select>

                <button
                  type="submit"
                  disabled={isSavingOverride || !newSellerName.trim() || !newSiteName.trim()}
                  className="px-3 py-2 bg-accent hover:bg-accent-hover text-text-inverse font-medium rounded text-xs transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

