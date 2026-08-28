"use client";

import React from "react";
import { ShieldCheck, RotateCcw, Activity } from "lucide-react";

interface AppHeaderProps {
  sessionId: string;
  totalSpent: number;
  perSessionCap: number;
  onResetSession: () => void;
  onToggleMobileAudit: () => void;
  auditCount: number;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  sessionId,
  totalSpent,
  perSessionCap,
  onResetSession,
  onToggleMobileAudit,
  auditCount,
}) => {
  const percentSpent = Math.min(100, Math.round((totalSpent / perSessionCap) * 100));

  return (
    <header className="w-full bg-[#0a0e17]/80 border-b border-white/5 sticky top-0 z-30 px-4 sm:px-6 py-3.5 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-semibold shadow-sm">
            <ShieldCheck className="w-5 h-5 text-indigo-400 stroke-[1.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-sm tracking-tight text-white">SureCart AI</span>
              <span className="text-[9px] uppercase font-mono tracking-widest px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-white/5 flex items-center gap-1.5 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Test Mode
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block mt-0.5">
              Gated agentic checkout and policy-enforced guardrails
            </p>
          </div>
        </div>

        {/* Status indicators and actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Session Spend Metric */}
          <div className="bg-[#0f1422] border border-white/5 rounded-lg px-3 py-1.5 text-xs hidden md:flex items-center gap-3">
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wider">Session Limit</span>
                <span className="font-numeric font-medium text-slate-200">
                  ₹{totalSpent.toLocaleString("en-IN")} <span className="text-slate-500">/ ₹{perSessionCap.toLocaleString("en-IN")}</span>
                </span>
              </div>
              <div className="w-32 h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    percentSpent > 80 ? "bg-amber-500" : "bg-indigo-500"
                  }`}
                  style={{ width: `${percentSpent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Reset button */}
          <button
            onClick={onResetSession}
            title="Reset session and audit log"
            className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-white/5 px-3 py-1.5 rounded-md transition-all select-none"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Reset Session</span>
          </button>

          {/* Mobile Audit Drawer Toggle */}
          <button
            onClick={onToggleMobileAudit}
            className="lg:hidden flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-950/20 border border-indigo-900/30 px-3 py-1.5 rounded-md transition-all"
          >
            <Activity className="w-4 h-4 text-indigo-400" />
            <span>Audit ({auditCount})</span>
          </button>
        </div>
      </div>
    </header>
  );
};
