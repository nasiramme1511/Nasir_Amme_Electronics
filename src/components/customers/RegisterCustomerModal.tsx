'use client';

import React, { useState } from "react";
import { 
  UserCheck, 
  Phone, 
  Mail, 
  MapPin, 
  Building, 
  CreditCard, 
  Receipt, 
  X, 
  Save, 
  AlertCircle 
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { CreateCustomerSchema } from "@/lib/validations/customer";

export type CustomerType = "RETAIL" | "WHOLESALE" | "CORPORATE" | "REPAIR_CLINIC";
export type PriceTier = "STANDARD" | "TIER_1_WHOLESALE" | "TIER_2_VIP" | "STAFF";

export interface CustomerFormData {
  fullName: string;
  phone: string;
  email: string;
  customerType: CustomerType;
  priceTier: PriceTier;
  tinNumber: string;
  allowCredit: boolean;
  creditLimit: string;
  paymentTerms: "IMMEDIATE" | "NET_7" | "NET_15" | "NET_30";
  city: string;
  kebeleOrStreet: string;
  notes: string;
}

interface RegisterCustomerModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function RegisterCustomerModal({ 
  isOpen = true, 
  onClose,
  onSuccess,
}: RegisterCustomerModalProps) {
  const { addCustomer, addToast } = useApp();

  const [formData, setFormData] = useState<CustomerFormData>({
    fullName: "",
    phone: "",
    email: "",
    customerType: "RETAIL",
    priceTier: "STANDARD",
    tinNumber: "",
    allowCredit: false,
    creditLimit: "0.00",
    paymentTerms: "IMMEDIATE",
    city: "Dire Dawa",
    kebeleOrStreet: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const isB2B = formData.customerType !== "RETAIL";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Validate with Zod schema
    const validationResult = CreateCustomerSchema.safeParse({
      fullName: formData.fullName,
      phone: formData.phone,
      email: formData.email || "",
      customerType: formData.customerType,
      priceTier: formData.priceTier,
      tinNumber: formData.tinNumber || undefined,
      allowCredit: formData.allowCredit,
      creditLimit: parseFloat(formData.creditLimit) || 0,
      paymentTerms: formData.paymentTerms,
      city: formData.city,
      kebeleOrStreet: formData.kebeleOrStreet || undefined,
      notes: formData.notes || undefined,
    });

    if (!validationResult.success) {
      const errMap: Record<string, string> = {};
      validationResult.error.issues.forEach((err) => {
        const fieldName = err.path.join(".");
        errMap[fieldName] = err.message;
      });
      setFormErrors(errMap);
      return;
    }

    setLoading(true);

    try {
      const baseType: 'retail' | 'wholesale' = formData.customerType === 'RETAIL' ? 'retail' : 'wholesale';
      const parsedCreditLimit = parseFloat(formData.creditLimit) || 0;

      // 1. Add to live context
      addCustomer({
        name: formData.fullName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        customerType: baseType,
        city: formData.city,
        address: formData.kebeleOrStreet.trim() || undefined,
        creditBalanceETB: 0,
        totalSpentETB: 0,
        loyaltyPoints: 0,
        priceTier: formData.priceTier,
        tinNumber: formData.tinNumber.trim() || undefined,
        allowCredit: formData.allowCredit,
        creditLimit: parsedCreditLimit,
        paymentTerms: formData.paymentTerms,
        notes: [
          formData.notes.trim(),
          `Type: ${formData.customerType}`,
          `Tier: ${formData.priceTier}`,
          formData.tinNumber ? `TIN: ${formData.tinNumber.trim()}` : '',
          formData.allowCredit ? `Credit Ceiling: ETB ${parsedCreditLimit.toLocaleString()} (${formData.paymentTerms})` : '',
        ].filter(Boolean).join(' | '),
      });

      // 2. Persist to API
      try {
        await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: formData.fullName.trim(),
            phone: formData.phone.trim(),
            email: formData.email.trim() || null,
            customerType: baseType,
            city: formData.city,
            notes: formData.notes.trim() || undefined,
          }),
        });
      } catch (apiErr) {
        console.warn('Backend customer sync note:', apiErr);
      }

      addToast({
        type: 'success',
        title: 'Customer Account Created',
        message: `${formData.fullName} has been successfully added to customer records.`,
      });

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch {
      addToast({
        type: 'error',
        title: 'Creation Failed',
        message: 'Could not create customer record. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full shadow-2xl text-slate-100 my-8 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-semibold tracking-tight text-white">Create Customer Ledger Account</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Establish client profile for receipt settlement, wholesale tier pricing, and ledger credit limits.
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Error Banner */}
        {Object.keys(formErrors).length > 0 && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Please correct the highlighted fields before submitting.</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Section 1: Core Identity & Segmentation */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5 font-mono">
              <Building className="w-3.5 h-3.5 text-indigo-400" /> 01. Client Identity & Classification
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Full Name / Enterprise Trade Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Gende Kore Phone Clinic or Dr. Henok Tadesse"
                  value={formData.fullName}
                  onChange={(e) => {
                    setFormData({ ...formData, fullName: e.target.value });
                    if (formErrors.fullName) setFormErrors({ ...formErrors, fullName: '' });
                  }}
                  className={`w-full bg-slate-950 border ${formErrors.fullName ? 'border-rose-500' : 'border-slate-800'} rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                />
                {formErrors.fullName && (
                  <p className="text-[11px] text-rose-400">{formErrors.fullName}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Customer Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.customerType}
                  onChange={(e) => {
                    const type = e.target.value as CustomerType;
                    setFormData({
                      ...formData,
                      customerType: type,
                      priceTier: type === "WHOLESALE" || type === "REPAIR_CLINIC" ? "TIER_1_WHOLESALE" : "STANDARD",
                      allowCredit: type === "CORPORATE" || type === "WHOLESALE"
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="RETAIL">Individual Walk-in (Standard Retail)</option>
                  <option value="WHOLESALE">Wholesale / Sub-Dealer</option>
                  <option value="REPAIR_CLINIC">Electronics / Phone Repair Shop</option>
                  <option value="CORPORATE">Corporate / Institutional Account</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Price Matrix Tier</label>
                <select
                  value={formData.priceTier}
                  onChange={(e) => setFormData({ ...formData, priceTier: e.target.value as PriceTier })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                >
                  <option value="STANDARD">Standard Retail (0% markup relief)</option>
                  <option value="TIER_1_WHOLESALE">Tier 1 Wholesale (Volume pricing)</option>
                  <option value="TIER_2_VIP">Tier 2 VIP Commercial</option>
                  <option value="STAFF">Employee Cost-Plus</option>
                </select>
              </div>

              {/* Conditional TIN for B2B/Wholesale accounts */}
              {isB2B && (
                <div className="md:col-span-2 bg-indigo-950/20 border border-indigo-900/40 rounded-lg p-3 space-y-1">
                  <label className="text-xs font-medium text-indigo-300 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5" /> Client TIN (Required for B2B Tax Receipts)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="10-digit customer TIN"
                    value={formData.tinNumber}
                    onChange={(e) => {
                      setFormData({ ...formData, tinNumber: e.target.value.replace(/\D/g, "") });
                      if (formErrors.tinNumber) setFormErrors({ ...formErrors, tinNumber: '' });
                    }}
                    className={`w-full bg-slate-950 border ${formErrors.tinNumber ? 'border-rose-500' : 'border-slate-800'} rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                  />
                  {formErrors.tinNumber ? (
                    <p className="text-[11px] text-rose-400">{formErrors.tinNumber}</p>
                  ) : (
                    <p className="text-[10px] text-slate-400">Used for generating audited VAT sales attachments.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Contact & Location */}
          <div className="pt-4 border-t border-slate-800">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5 font-mono">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" /> 02. Communication & Logistics
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  Primary Mobile / Telebirr Phone <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    placeholder="+251 91 123 4567"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                    }}
                    className={`w-full bg-slate-950 border ${formErrors.phone ? 'border-rose-500' : 'border-slate-800'} rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                  />
                </div>
                {formErrors.phone && (
                  <p className="text-[11px] text-rose-400">{formErrors.phone}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Email for Digital Invoices</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    placeholder="account@company.et"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                    }}
                    className={`w-full bg-slate-950 border ${formErrors.email ? 'border-rose-500' : 'border-slate-800'} rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                  />
                </div>
                {formErrors.email && (
                  <p className="text-[11px] text-rose-400">{formErrors.email}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">City / Operational Hub</label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Dire Dawa">Dire Dawa</option>
                  <option value="Harar">Harar</option>
                  <option value="Addis Ababa">Addis Ababa</option>
                  <option value="Chiro / Asebe Teferi">Chiro / Asebe Teferi</option>
                  <option value="Jijiga">Jijiga</option>
                  <option value="Other">Other Region</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Specific Delivery Location</label>
                <input
                  type="text"
                  placeholder="e.g., Gende Kore, Kebele 02, Shop #14"
                  value={formData.kebeleOrStreet}
                  onChange={(e) => setFormData({ ...formData, kebeleOrStreet: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Credit Line & Store Account Terms */}
          <div className="pt-4 border-t border-slate-800">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5 font-mono">
              <CreditCard className="w-3.5 h-3.5 text-indigo-400" /> 03. Credit Terms & Receivables
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowCredit"
                  checked={formData.allowCredit}
                  onChange={(e) => setFormData({ ...formData, allowCredit: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                />
                <label htmlFor="allowCredit" className="text-xs text-slate-300 select-none cursor-pointer font-medium">
                  Enable Store Credit / Accounts Receivable (Post-paid purchases)
                </label>
              </div>

              {formData.allowCredit && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-slate-950/60 border border-slate-800 rounded-lg">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Credit Ceiling (ETB)</label>
                    <input
                      type="text"
                      placeholder="e.g., 50,000.00"
                      value={formData.creditLimit}
                      onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-right"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Settlement Cycle</label>
                    <select
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    >
                      <option value="IMMEDIATE">Strict Cash / Instant Transfer</option>
                      <option value="NET_7">Net 7 Days</option>
                      <option value="NET_15">Net 15 Days</option>
                      <option value="NET_30">Net 30 Days</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Account Notes / Credit Guarantor</label>
                <textarea
                  rows={2}
                  placeholder="Record guarantor contact, special warranty concessions, or business remarks..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {loading ? "Registering..." : "Create Customer Account"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
