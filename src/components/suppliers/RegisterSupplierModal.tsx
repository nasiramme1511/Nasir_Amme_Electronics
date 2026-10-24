'use client';

import React, { useState } from "react";
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  FileCheck2, 
  X, 
  Save, 
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { CreateSupplierSchema } from "@/lib/validations/supplier";

export interface SupplierFormData {
  companyName: string;
  tinNumber: string;
  vatRegistered: boolean;
  contactPerson: string;
  phone: string;
  altPhone: string;
  email: string;
  cityHub: string;
  address: string;
  paymentTerms: "COD" | "NET_7" | "NET_15" | "NET_30" | "NET_60";
  creditLimit: string;
  bankName: string;
  bankAccountNumber: string;
  notes: string;
}

interface RegisterSupplierModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function RegisterSupplierModal({
  isOpen = true,
  onClose,
  onSuccess,
}: RegisterSupplierModalProps) {
  const { addSupplier, addToast } = useApp();

  const [formData, setFormData] = useState<SupplierFormData>({
    companyName: "",
    tinNumber: "",
    vatRegistered: true,
    contactPerson: "",
    phone: "",
    altPhone: "",
    email: "",
    cityHub: "Dire Dawa",
    address: "",
    paymentTerms: "NET_15",
    creditLimit: "0.00",
    bankName: "Commercial Bank of Ethiopia",
    bankAccountNumber: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const formatPaymentTermsDisplay = (terms: string): "Immediate / Cash" | "Net 15" | "Net 30" | "Consignment" => {
    switch (terms) {
      case "COD":
        return "Immediate / Cash";
      case "NET_7":
      case "NET_15":
        return "Net 15";
      case "NET_30":
      case "NET_60":
        return "Net 30";
      default:
        return "Net 15";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Validate with Zod schema
    const validationResult = CreateSupplierSchema.safeParse({
      companyName: formData.companyName,
      tinNumber: formData.tinNumber,
      vatRegistered: formData.vatRegistered,
      contactPerson: formData.contactPerson,
      phone: formData.phone,
      altPhone: formData.altPhone || undefined,
      email: formData.email || "",
      cityHub: formData.cityHub as any,
      address: formData.address || undefined,
      paymentTerms: formData.paymentTerms,
      creditLimit: parseFloat(formData.creditLimit) || 0,
      bankDetails: formData.bankName ? {
        bankName: formData.bankName,
        accountNumber: formData.bankAccountNumber || "N/A",
      } : undefined,
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
      const supplierCode = `SUP-${Math.floor(100 + Math.random() * 900)}`;

      // 1. Add to live application state
      addSupplier({
        name: formData.companyName.trim(),
        code: supplierCode,
        contactPerson: formData.contactPerson.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        city: formData.cityHub,
        address: formData.address.trim(),
        paymentTerms: formatPaymentTermsDisplay(formData.paymentTerms),
        status: "active",
        activeOrdersCount: 0,
        totalPurchasedETB: 0,
        outstandingBalanceETB: 0,
        notes: [
          formData.notes,
          formData.tinNumber ? `TIN: ${formData.tinNumber}` : '',
          formData.vatRegistered ? 'VAT Registered' : '',
          formData.bankAccountNumber ? `Bank: ${formData.bankName} - ${formData.bankAccountNumber}` : '',
        ].filter(Boolean).join(' | '),
      });

      // 2. Persist to server API if available
      try {
        await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: supplierCode,
            name: formData.companyName.trim(),
            contactName: formData.contactPerson.trim(),
            phone: formData.phone.trim(),
            email: formData.email.trim(),
            city: formData.cityHub,
            addressText: formData.address.trim(),
            paymentTerms: formatPaymentTermsDisplay(formData.paymentTerms),
            notes: formData.notes,
          }),
        });
      } catch (apiErr) {
        console.warn('Backend persistence notice:', apiErr);
      }

      addToast({
        type: 'success',
        title: 'Supplier Registered',
        message: `${formData.companyName} registered with code ${supplierCode}.`,
      });

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch {
      addToast({
        type: 'error',
        title: 'Registration Error',
        message: 'Could not commit supplier record. Please check details.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-3xl w-full shadow-2xl text-slate-900 dark:text-slate-100 my-8 overflow-hidden transition-colors">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">Create Vendor Master Record</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Establish procurement profile, legal tax credentials, and default AP settlement terms.
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Section 1: Legal Entity & Identity */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5 font-mono">
              <FileCheck2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> 01. Legal Entity & Tax Data
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Registered Company / Trade Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Anker Eastern Africa Distribution PLC"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {formErrors.companyName && (
                  <p className="text-[11px] text-rose-500 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3" /> {formErrors.companyName}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Tax Identification No. (TIN) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="10-digit TIN"
                  maxLength={10}
                  value={formData.tinNumber}
                  onChange={(e) => setFormData({ ...formData, tinNumber: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {formErrors.tinNumber && (
                  <p className="text-[11px] text-rose-500 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3" /> {formErrors.tinNumber}
                  </p>
                )}
              </div>

              <div className="md:col-span-3 flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="vatRegistered"
                  checked={formData.vatRegistered}
                  onChange={(e) => setFormData({ ...formData, vatRegistered: e.target.checked })}
                  className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                />
                <label htmlFor="vatRegistered" className="text-xs text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                  Vendor is VAT registered (Issues official standard invoice with 15% VAT)
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Contacts & Logistics */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5 font-mono">
              <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> 02. Commercial Contact & Hub
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Primary Contact Person <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Full name & title"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {formErrors.contactPerson && (
                  <p className="text-[11px] text-rose-500 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3" /> {formErrors.contactPerson}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Primary Phone <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    placeholder="+251 91 123 4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                {formErrors.phone && (
                  <p className="text-[11px] text-rose-500 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3" /> {formErrors.phone}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Business Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    placeholder="sales@vendor.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                {formErrors.email && (
                  <p className="text-[11px] text-rose-500 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3" /> {formErrors.email}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Distribution Hub / Sourcing Region</label>
                <select
                  value={formData.cityHub}
                  onChange={(e) => setFormData({ ...formData, cityHub: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Dire Dawa">Dire Dawa (Local Distribution)</option>
                  <option value="Addis Ababa">Addis Ababa (Bole / Mercato Main Hub)</option>
                  <option value="Harar">Harar</option>
                  <option value="Hawassa">Hawassa</option>
                  <option value="Djibouti">Djibouti (Transit Sourcing)</option>
                  <option value="Import / UAE">Dubai / Direct Import</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Physical Warehouse / Dispatch Address</label>
                <input
                  type="text"
                  placeholder="Sub-city, Kebele, Building / Storefront No."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Trade Terms & Remittance */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5 font-mono">
              <CreditCard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> 03. AP Settlement & Bank Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Default Credit Terms</label>
                <select
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value as any })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                >
                  <option value="COD">Cash On Delivery (COD)</option>
                  <option value="NET_7">Net 7 Days</option>
                  <option value="NET_15">Net 15 Days</option>
                  <option value="NET_30">Net 30 Days</option>
                  <option value="NET_60">Net 60 Days</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Credit Ceiling (ETB)</span>
                  <HelpCircle className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                </label>
                <input
                  type="text"
                  placeholder="0.00"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-right"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Settlement Bank</label>
                <select
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Commercial Bank of Ethiopia">CBE</option>
                  <option value="Awash Bank">Awash Bank</option>
                  <option value="Dashen Bank">Dashen Bank</option>
                  <option value="Bank of Abyssinia">Bank of Abyssinia</option>
                  <option value="Telebirr Merchant">Telebirr SuperApp / Merchant</option>
                </select>
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Bank Account / IBAN / Merchant ID</label>
                <input
                  type="text"
                  placeholder="e.g., 1000293847291 (CBE Account Number)"
                  value={formData.bankAccountNumber}
                  onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Internal Operational Notes</label>
                <textarea
                  rows={2}
                  placeholder="Special RMA handling terms, warranty delivery windows, or direct distributor contacts..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {loading ? "Registering..." : "Commit Supplier Record"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
