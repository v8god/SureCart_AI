"use client";

import React, { useState, useEffect } from "react";
import { AsciiDonut } from "./AsciiDonut";
import { ShieldCheck, Activity, X } from "lucide-react";

interface ActivityDonutWindowProps {
  isActive: boolean;
  statusText?: string;
  stepIndex?: number;
}

const LIVE_ACTIVITY_STEPS = [
  "Searching catalog & cross-site seller offers…",
  "Verifying merchant authenticity & return policies…",
  "Normalizing delivery ETA and price deltas…",
  "Generating grounded comparison matrix…",
];

export function ActivityDonutWindow({
  isActive,
  statusText,
}: ActivityDonutWindowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % LIVE_ACTIVITY_STEPS.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40 animate-fade-in">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-accent/40 shadow-lg text-xs font-mono text-text-primary hover:border-accent transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
          <span>Activity</span>
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Agent Active Execution Window"
      className="fixed bottom-4 right-4 z-40 w-72 sm:w-80 bg-surface/95 backdrop-blur-md border border-accent/40 rounded-card p-3.5 shadow-2xl transition-all duration-300 animate-slide-in select-none"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
          </span>
          <span className="text-[11px] font-mono tracking-wider uppercase font-semibold text-accent">
            Customer Activity
          </span>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          title="Minimize activity window"
          className="text-text-muted hover:text-text-primary transition-colors p-0.5 rounded"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Compact Monospace ASCII Torus Container */}
      <div className="flex flex-col items-center justify-center py-1 bg-surface-subtle/50 rounded-lg border border-border/40 overflow-hidden">
        <div className="scale-[0.62] -my-7 -mx-4 transform origin-center">
          <AsciiDonut isSpinning={true} speed={1.1} />
        </div>
      </div>

      {/* Live Activity Step Notice */}
      <div className="mt-2.5 space-y-1">
        <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
          <span>Active Phase</span>
          <span className="text-accent font-medium">Live Grounding</span>
        </div>
        <p className="text-xs text-text-primary font-medium truncate">
          {statusText || LIVE_ACTIVITY_STEPS[currentStep]}
        </p>
      </div>
    </aside>
  );
}
