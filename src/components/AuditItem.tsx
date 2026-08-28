"use client";

import React, { useState } from "react";
import { AuditEntry } from "@/types";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCode,
  Shield,
  User,
  Bot,
  Cpu,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AuditItemProps {
  entry: AuditEntry;
}

export const AuditItem: React.FC<AuditItemProps> = ({ entry }) => {
  const [showDetails, setShowDetails] = useState(false);

  // Format timestamp into HH:MM:SS
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("en-US", { hour12: false });
    } catch {
      return isoString;
    }
  };

  // Actor badge details
  const getActorBadge = (actor: AuditEntry["actor"]) => {
    switch (actor) {
      case "agent":
        return {
          label: "Agent",
          icon: <Bot className="w-3 h-3 text-indigo-400" />,
          classes: "bg-indigo-500/5 text-indigo-400 border-indigo-500/10",
        };
      case "buyer":
        return {
          label: "Buyer",
          icon: <User className="w-3 h-3 text-emerald-400" />,
          classes: "bg-emerald-500/5 text-emerald-400 border-emerald-500/10",
        };
      case "system":
        return {
          label: "Policy Engine",
          icon: <Shield className="w-3 h-3 text-purple-400" />,
          classes: "bg-purple-500/5 text-purple-400 border-purple-500/10",
        };
    }
  };

  // Icon based on action result
  const getResultIcon = (result: AuditEntry["result"], actionType: AuditEntry["action_type"]) => {
    if (result === "refused" || actionType === "refusal") {
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />;
    }
    if (result === "declined" || result === "failed") {
      return <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />;
    }
    if (result === "success") {
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />;
    }
    if (actionType === "search") {
      return <Search className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />;
    }
    return <Cpu className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />;
  };

  const actorInfo = getActorBadge(entry.actor);

  return (
    <div className="bg-[#0b0e17] border border-white/5 rounded-xl p-3.5 transition-all hover:border-indigo-500/10 shadow-sm text-xs space-y-2.5">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2.5 select-none">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-500">{formatTime(entry.timestamp)}</span>
          <span
            className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${actorInfo.classes}`}
          >
            {actorInfo.icon}
            <span>{actorInfo.label}</span>
          </span>
        </div>

        <span
          className={`text-[9px] font-mono uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${
            entry.result === "success"
              ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/10"
              : entry.result === "refused"
              ? "bg-amber-500/5 text-amber-400 border-amber-500/10"
              : entry.result === "declined" || entry.result === "failed"
              ? "bg-rose-500/5 text-rose-400 border-rose-500/10"
              : "bg-slate-900 text-slate-500 border-white/5"
          }`}
        >
          {entry.result}
        </span>
      </div>

      {/* Reasoning Message Block */}
      <div className="flex items-start gap-2">
        {getResultIcon(entry.result, entry.action_type)}
        <p className="text-slate-300 leading-relaxed text-xs">{entry.reasoning}</p>
      </div>

      {/* Accordion Payload Inspector */}
      {entry.payload && Object.keys(entry.payload).length > 0 && (
        <div className="pt-2 border-t border-white/5">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors focus-ring"
          >
            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
            <span>{showDetails ? "Hide Payload Data" : "Inspect Payload Data"}</span>
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showDetails && (
            <pre className="mt-2 p-3 rounded-lg bg-black/40 text-[10px] font-mono text-slate-400 overflow-x-auto border border-white/5 max-h-48 leading-relaxed scrollbar-none">
              {JSON.stringify(entry.payload, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
