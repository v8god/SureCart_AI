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
  onSelectOrder?: (orderId: string) => void;
}

export const AuditItem: React.FC<AuditItemProps> = ({ entry, onSelectOrder }) => {
  const [showDetails, setShowDetails] = useState(false);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("en-US", { hour12: false });
    } catch {
      return isoString;
    }
  };

  const getActorBadge = (actor: AuditEntry["actor"]) => {
    switch (actor) {
      case "agent":
        return {
          label: "Agent",
          icon: <Bot className="w-3 h-3 text-accent" aria-hidden="true" />,
          classes: "bg-accent-subtle text-accent border-accent/20",
        };
      case "buyer":
        return {
          label: "Buyer",
          icon: <User className="w-3 h-3 text-success" aria-hidden="true" />,
          classes: "bg-success-subtle text-success border-success/20",
        };
      case "system":
        return {
          label: "System",
          icon: <Shield className="w-3 h-3 text-text-secondary" aria-hidden="true" />,
          classes: "bg-surface-subtle text-text-secondary border-border",
        };
    }
  };

  const getResultIcon = (result: AuditEntry["result"], actionType: AuditEntry["action_type"]) => {
    if (result === "refused" || actionType === "refusal") {
      return <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" aria-hidden="true" />;
    }
    if (result === "declined" || result === "failed") {
      return <XCircle className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" aria-hidden="true" />;
    }
    if (result === "success") {
      return <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" aria-hidden="true" />;
    }
    if (actionType === "search") {
      return <Search className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" aria-hidden="true" />;
    }
    return <Cpu className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" aria-hidden="true" />;
  };

  const actorInfo = getActorBadge(entry.actor);

  return (
    <div className="bg-surface border border-border rounded-card p-3 transition-colors hover:border-accent/30 text-xs space-y-2">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 select-none">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-text-muted">{formatTime(entry.timestamp)}</span>
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded border ${actorInfo.classes}`}
          >
            {actorInfo.icon}
            <span>{actorInfo.label}</span>
          </span>
        </div>

        <span
          className={`text-[10px] font-mono uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded border ${
            entry.result === "success"
              ? "bg-success-subtle text-success border-success/20"
              : entry.result === "refused"
              ? "bg-warning-subtle text-warning border-warning/20"
              : entry.result === "declined" || entry.result === "failed"
              ? "bg-error-subtle text-error border-error/20"
              : "bg-surface-subtle text-text-muted border-border"
          }`}
        >
          {entry.result}
        </span>
      </div>

      {/* Reasoning Content Block */}
      <div className="flex items-start gap-2">
        {getResultIcon(entry.result, entry.action_type)}
        <p className="text-text-primary leading-relaxed text-xs">{entry.reasoning}</p>
      </div>

      {/* Accordion Payload Inspector */}
      {entry.payload && Object.keys(entry.payload).length > 0 && (
        <div className="pt-1.5 border-t border-border">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors focus-ring"
          >
            <FileCode className="w-3 h-3 text-accent" aria-hidden="true" />
            <span>{showDetails ? "Hide Payload Data" : "Inspect Payload Data"}</span>
            {showDetails ? <ChevronUp className="w-3 h-3" aria-hidden="true" /> : <ChevronDown className="w-3 h-3" aria-hidden="true" />}
          </button>

          {showDetails && (
            <pre className="mt-1.5 p-2.5 rounded-button bg-surface-subtle text-[10px] font-mono text-text-secondary overflow-x-auto border border-border max-h-48 leading-relaxed">
              {JSON.stringify(entry.payload, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Quick Order Link if entry relates to an order */}
      {(entry.payload?.order_id || (entry.payload as Record<string, unknown>)?.order) && onSelectOrder && (
        <div className="pt-1 border-t border-border/50">
          <button
            onClick={() => onSelectOrder((entry.payload?.order_id || ((entry.payload as Record<string, unknown>)?.order as Record<string, unknown>)?.id) as string)}
            className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-hover font-mono font-semibold"
          >
            <span>Inspect Order in Workspace &rarr;</span>
          </button>
        </div>
      )}
    </div>
  );
};
