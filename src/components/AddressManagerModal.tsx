"use client";

import React, { useState, useEffect } from "react";
import { ShippingAddress } from "@/types";
import { X, MapPin, Plus, Trash2, CheckCircle2, Home, Building2, GraduationCap, Phone, User } from "lucide-react";

interface AddressManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export const AddressManagerModal: React.FC<AddressManagerModalProps> = ({ isOpen, onClose, sessionId }) => {
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Form fields for new address
  const [tag, setTag] = useState("Home");
  const [recipientName, setRecipientName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [postalCode, setPostalCode] = useState("560001");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [isDefault, setIsDefault] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchAddresses = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/addresses?sessionId=${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
      }
    } catch (err) {
      console.error("Failed to fetch addresses:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAddresses();
    }
  }, [isOpen, sessionId]);

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim() || !addressLine1.trim() || !city.trim() || !postalCode.trim()) {
      setErrorMsg("Please complete all required address fields.");
      return;
    }

    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          tag,
          recipient_name: recipientName.trim(),
          address_line1: addressLine1.trim(),
          city: city.trim(),
          postal_code: postalCode.trim(),
          phone: phone.trim(),
          is_default: isDefault,
        }),
      });

      if (res.ok) {
        setIsAdding(false);
        setRecipientName("");
        setAddressLine1("");
        setErrorMsg("");
        await fetchAddresses();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Failed to save address");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to address service.");
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const res = await fetch(`/api/addresses?id=${encodeURIComponent(id)}&sessionId=${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchAddresses();
      }
    } catch (err) {
      console.error("Failed to delete address:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" role="dialog" aria-modal="true" aria-label="Address Presets Manager">
      <div className="bg-surface border border-border rounded-xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:px-6 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-subtle flex items-center justify-center text-accent">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-text-primary">Delivery Address Presets</h3>
              <p className="text-xs text-text-secondary">Used by the agent for natural language address resolution</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-button text-text-muted hover:text-text-primary hover:bg-surface border border-transparent hover:border-border transition-colors focus-ring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:px-6 overflow-y-auto flex-1 space-y-4">
          {!isAdding ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-mono tracking-wider text-text-muted">
                  Saved Presets ({addresses.length})
                </span>
                <button
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent-hover bg-accent-subtle hover:bg-accent-subtle/80 px-3 py-1.5 rounded-button transition-colors focus-ring"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Address</span>
                </button>
              </div>

              {isLoading ? (
                <div className="py-8 text-center text-xs text-text-muted">Loading saved addresses…</div>
              ) : addresses.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-xs text-text-secondary">No custom address presets saved yet.</p>
                  <button
                    onClick={() => setIsAdding(true)}
                    className="text-xs text-accent font-semibold hover:underline"
                  >
                    Create your first address preset
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {addresses.map((addr) => {
                    const tagUpper = addr.tag.toUpperCase();
                    let TagIcon = MapPin;
                    if (tagUpper.includes("HOME")) TagIcon = Home;
                    if (tagUpper.includes("WORK") || tagUpper.includes("OFFICE")) TagIcon = Building2;
                    if (tagUpper.includes("COLLEGE") || tagUpper.includes("HOSTEL")) TagIcon = GraduationCap;

                    return (
                      <div
                        key={addr.id}
                        className={`p-3.5 rounded-card border bg-surface-subtle transition-colors flex items-start justify-between gap-3 ${
                          addr.is_default ? "border-accent shadow-xs" : "border-border hover:border-accent/40"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-md bg-surface border border-border flex items-center justify-center text-accent shrink-0 mt-0.5">
                            <TagIcon className="w-4 h-4" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-text-primary tracking-wide">
                                [{addr.tag.toUpperCase()}]
                              </span>
                              <span className="text-xs text-text-secondary font-medium">• {addr.recipient_name}</span>
                              {addr.is_default && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase bg-accent-subtle text-accent px-1.5 py-0.2 rounded font-semibold">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-text-secondary leading-snug">
                              {addr.address_line1}, {addr.city} {addr.postal_code}
                            </p>
                            {addr.phone && (
                              <p className="text-[11px] font-mono text-text-muted flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                <span>{addr.phone}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          title="Delete address"
                          className="text-text-muted hover:text-error p-1.5 rounded hover:bg-surface transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSaveNewAddress} className="space-y-3.5 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h4 className="font-semibold text-xs text-text-primary uppercase tracking-wider font-mono">
                  New Address Preset
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-text-muted hover:text-text-primary"
                >
                  Cancel
                </button>
              </div>

              {errorMsg && (
                <div className="p-2.5 text-xs text-error bg-error-subtle rounded border border-error/20">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-text-muted uppercase">Tag / Keyword</label>
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="Home, Office, College, Hostel..."
                    className="w-full bg-surface-subtle border border-border rounded px-3 py-2 text-xs text-text-primary outline-none focus:border-accent"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-text-muted uppercase">Recipient Name</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-surface-subtle border border-border rounded px-3 py-2 text-xs text-text-primary outline-none focus:border-accent"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-text-muted uppercase">Street Address / Flat / Floor</label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="e.g. Flat 402, Green Glen Layout, Bellandur"
                  className="w-full bg-surface-subtle border border-border rounded px-3 py-2 text-xs text-text-primary outline-none focus:border-accent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-text-muted uppercase">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bengaluru"
                    className="w-full bg-surface-subtle border border-border rounded px-3 py-2 text-xs text-text-primary outline-none focus:border-accent"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-text-muted uppercase">Postal PIN Code</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="560001"
                    className="w-full bg-surface-subtle border border-border rounded px-3 py-2 text-xs text-text-primary outline-none focus:border-accent"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-text-muted uppercase">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-surface-subtle border border-border rounded px-3 py-2 text-xs text-text-primary outline-none focus:border-accent"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded border-border text-accent focus:ring-accent"
                  />
                  <span>Set as default address for this session</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3.5 py-1.5 rounded text-xs text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded text-xs font-semibold text-text-inverse bg-accent hover:bg-accent-hover transition-colors"
                >
                  Save Preset
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
