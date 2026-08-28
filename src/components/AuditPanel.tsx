"use client";

import React, { useState } from "react";
import { AuditEntry } from "@/types";
import { AuditItem } from "./AuditItem";
import { Activity, RefreshCw, Layers } from "lucide-react";

interface AuditPanelProps {
  logs: AuditEntry[];
  totalSpent: number;
  perOrderCap: number;
  perSessionCap: number;
  onRefresh: () => void;
  isLoading?: boolean;
}

export const AuditPanel: React.FC<AuditPanelProps> = ({
  logs,
  totalSpent,
  perOrderCap,
  perSessionCap,
  onRefresh,
  isLoading = false,
}) => {
  const [filterActor, setFilterActor] = useState<"all" | "agent" | "buyer" | "system">("all");

  const filteredLogs = logs.filter((log) => {
    if (filterActor === "all") return true;
    return log.actor === filterActor;
  });

  const percentSpent = Math.min(100, Math.round((totalSpent / perSessionCap) * 100));

  return (
    <div className="flex flex-col h-full bg-[#0d111c] border-l border-white/5 text-slate-200">
      {/* Panel Header */}
      <div className="p-4 border-b border-white/5 bg-[#0f1422]/90 sticky top-0 z-10 backdrop-blur-sm space-y-4 select-none">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-indigo-400 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-xs text-white uppercase tracking-wider">Audit Log</h3>
              <p className="text-[10px] text-slate-500 font-mono">Append-Only Policy Trail</p>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh audit trail"
            className="p-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-white/5 text-slate-400 hover:text-slate-200 transition-colors focus-ring"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>

        {/* Policy Limits Summary Widget */}
        <div className="bg-slate-950/40 rounded-xl p-3 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-slate-400">SESSION SPEND:</span>
            <span className="font-numeric font-bold text-white">
              ₹{totalSpent.toLocaleString("en-IN")}{" "}
              <span className="text-slate-500 font-normal">/ ₹{perSessionCap.toLocaleString("en-IN")}</span>
            </span>
          </div>

          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
            <div
              className={`h-full transition-all duration-300 ${
                percentSpent > 80 ? "bg-amber-500" : "bg-indigo-500"
              }`}
              style={{ width: `${percentSpent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-white/5">
            <span>PER-ORDER LIMIT:</span>
            <span className="font-semibold text-slate-400">₹{perOrderCap.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Actor Filters (Segment Control style) */}
        <div className="flex items-center p-0.5 bg-slate-950 border border-white/5 rounded-lg select-none">
          {(["all", "agent", "buyer", "system"] as const).map((actor) => (
            <button
              key={actor}
              onClick={() => setFilterActor(actor)}
              className={`flex-1 text-[9px] font-mono font-medium py-1.5 rounded uppercase tracking-wider transition-all ${
                filterActor === actor
                  ? "bg-slate-900 text-indigo-400 border border-white/5 shadow-sm font-semibold"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {actor === "system" ? "policy" : actor}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Event Timeline */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 select-none">
            <Layers className="w-8 h-8 mb-2 text-slate-700 stroke-[1.2]" />
            <p className="text-xs font-semibold text-slate-400">Empty Trail</p>
            <p className="text-[10px] text-slate-500 mt-1 max-w-[180px] leading-normal font-mono">
              Events will record here as you search the catalog or confirm proposals.
            </p>
          </div>
        ) : (
          filteredLogs.map((entry) => <AuditItem key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  );
};
