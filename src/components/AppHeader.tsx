"use client";

import React from "react";
import { ShieldCheck, RotateCcw, Activity, Sun, Moon, ShoppingBag, MapPin, BarChart3 } from "lucide-react";

interface AppHeaderProps {
  sessionId: string;
  totalSpent: number;
  perOrderCap: number;
  perSessionCap: number;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onResetSession: () => void;
  onToggleMobileAudit: () => void;
  onUpdateCaps: (orderCap: number, sessionCap: number) => Promise<void>;
  auditCount: number;
  ordersCount?: number;
  onOpenOrders?: () => void;
  onOpenAddresses?: () => void;
  onOpenAnalytics?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  sessionId,
  totalSpent,
  perOrderCap,
  perSessionCap,
  theme,
  onToggleTheme,
  onResetSession,
  onToggleMobileAudit,
  onUpdateCaps,
  auditCount,
  ordersCount = 0,
  onOpenOrders,
  onOpenAddresses,
  onOpenAnalytics,
}) => {
  const [showCapModal, setShowCapModal] = React.useState(false);
  const [customOrderCap, setCustomOrderCap] = React.useState(perOrderCap);
  const [customSessionCap, setCustomSessionCap] = React.useState(perSessionCap);
  const [isSavingCaps, setIsSavingCaps] = React.useState(false);

  React.useEffect(() => {
    setCustomOrderCap(perOrderCap);
    setCustomSessionCap(perSessionCap);
  }, [perOrderCap, perSessionCap]);

  const percentSpent = Math.min(100, Math.round((totalSpent / perSessionCap) * 100));

  const handleSaveCaps = async () => {
    setIsSavingCaps(true);
    try {
      await onUpdateCaps(customOrderCap, customSessionCap);
      setShowCapModal(false);
    } finally {
      setIsSavingCaps(false);
    }
  };

  return (
    <header className="w-full bg-surface border-b border-border sticky top-0 z-30 px-4 sm:px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-button bg-accent-subtle border border-accent/20 flex items-center justify-center text-accent">
            <ShieldCheck className="w-4 h-4 stroke-[1.75]" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-text-primary">SureCart AI</span>
              <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-surface-subtle text-text-secondary border border-border flex items-center gap-1 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-warning"></span>
                Test Mode
              </span>
            </div>
            <p className="text-[11px] text-text-muted hidden sm:block mt-0.5">
              Conversational checkout with code-enforced guardrails
            </p>
          </div>
        </div>

        {/* Quick Access Navigation Buttons */}
        <div className="hidden md:flex items-center gap-1.5 bg-surface-subtle p-1 rounded-card border border-border">
          {onOpenOrders && (
            <button
              onClick={onOpenOrders}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface px-2.5 py-1.5 rounded-button transition-colors focus-ring"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-accent" />
              <span>Orders</span>
              {ordersCount > 0 && (
                <span className="text-[10px] font-mono font-bold bg-accent text-text-inverse px-1.5 py-0.2 rounded-full">
                  {ordersCount}
                </span>
              )}
            </button>
          )}

          {onOpenAddresses && (
            <button
              onClick={onOpenAddresses}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface px-2.5 py-1.5 rounded-button transition-colors focus-ring"
            >
              <MapPin className="w-3.5 h-3.5 text-accent" />
              <span>Addresses</span>
            </button>
          )}

          {onOpenAnalytics && (
            <button
              onClick={onOpenAnalytics}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface px-2.5 py-1.5 rounded-button transition-colors focus-ring"
            >
              <BarChart3 className="w-3.5 h-3.5 text-accent" />
              <span>Analytics</span>
            </button>
          )}
        </div>

        {/* Status indicators and actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Session Spend Metric + Cap Adjuster Button */}
          <div className="relative">
            <button
              onClick={() => setShowCapModal(!showCapModal)}
              title="Click to customize your spend limit caps"
              className="bg-surface-subtle hover:bg-surface-muted border border-border rounded-input px-3 py-1.5 text-xs flex items-center gap-3 transition-colors text-left focus-ring"
            >
              <div className="flex flex-col">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-text-muted text-[10px] uppercase font-mono tracking-wider">
                    Limit (₹{perOrderCap.toLocaleString("en-IN")} / ₹{perSessionCap.toLocaleString("en-IN")})
                  </span>
                  <span className="font-numeric font-medium text-text-primary">
                    ₹{totalSpent.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="w-28 sm:w-32 h-1 bg-surface-muted rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      percentSpent > 80 ? "bg-warning" : "bg-accent"
                    }`}
                    style={{ width: `${percentSpent}%` }}
                  />
                </div>
              </div>
            </button>

            {/* Cap Adjustment Popover */}
            {showCapModal && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-surface border border-border rounded-card p-4 shadow-xl z-50 animate-fade-in space-y-3">
                <div className="flex items-center justify-between border-b border-border/70 pb-2">
                  <span className="text-xs font-semibold text-text-primary">Custom Spending Caps</span>
                  <span className="text-[10px] font-mono text-accent uppercase">Policy Gate</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] text-text-muted font-medium mb-1">
                      Per-Order Hard Cap (₹)
                    </label>
                    <input
                      type="number"
                      min="500"
                      step="500"
                      value={customOrderCap}
                      onChange={(e) => setCustomOrderCap(Number(e.target.value))}
                      className="w-full bg-surface-subtle border border-border rounded-input px-2.5 py-1.5 text-xs font-mono text-text-primary focus-ring"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-text-muted font-medium mb-1">
                      Session Cumulative Cap (₹)
                    </label>
                    <input
                      type="number"
                      min="500"
                      step="1000"
                      value={customSessionCap}
                      onChange={(e) => setCustomSessionCap(Number(e.target.value))}
                      className="w-full bg-surface-subtle border border-border rounded-input px-2.5 py-1.5 text-xs font-mono text-text-primary focus-ring"
                    />
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomOrderCap(5000);
                        setCustomSessionCap(10000);
                      }}
                      className="text-[10px] font-mono px-2 py-1 bg-surface-subtle rounded border border-border text-text-secondary hover:border-accent"
                    >
                      Default (5k/10k)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomOrderCap(20000);
                        setCustomSessionCap(50000);
                      }}
                      className="text-[10px] font-mono px-2 py-1 bg-surface-subtle rounded border border-border text-text-secondary hover:border-accent"
                    >
                      High Cap (20k/50k)
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
                  <button
                    onClick={() => setShowCapModal(false)}
                    className="px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCaps}
                    disabled={isSavingCaps}
                    className="px-3 py-1 bg-accent hover:bg-accent-hover text-text-inverse font-semibold text-xs rounded-button transition-colors disabled:opacity-50"
                  >
                    {isSavingCaps ? "Saving…" : "Save Caps"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="flex items-center justify-center w-8 h-8 rounded-button text-text-secondary hover:text-text-primary bg-surface-subtle hover:bg-surface-muted border border-border transition-colors focus-ring"
          >
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Moon className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>

          {/* Reset button */}
          <button
            onClick={onResetSession}
            title="Reset session spend and audit log"
            className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary hover:text-text-primary bg-surface-subtle hover:bg-surface-muted border border-border px-3 py-1.5 rounded-button transition-colors select-none focus-ring"
          >
            <RotateCcw className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
            <span className="hidden sm:inline">Reset Session</span>
          </button>

          {/* Mobile Audit Drawer Toggle */}
          <button
            onClick={onToggleMobileAudit}
            className="lg:hidden flex items-center gap-1.5 text-xs text-accent bg-accent-subtle border border-accent/30 px-3 py-1.5 rounded-button transition-colors focus-ring"
          >
            <Activity className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Audit ({auditCount})</span>
          </button>
        </div>
      </div>
    </header>
  );
};
