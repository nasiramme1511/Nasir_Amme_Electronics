'use client';

import React, { useState } from "react";
import { 
  UserPlus, 
  ShieldCheck, 
  KeyRound, 
  Phone, 
  Mail, 
  Copy, 
  Check, 
  RefreshCw, 
  X, 
  Lock, 
  Eye, 
  EyeOff,
  AlertCircle 
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { RoleType } from "@/types";
import { ProvisionStaffSchema } from "@/lib/validations/staff";

export type StaffRole = "CASHIER" | "INVENTORY_CLERK" | "STORE_MANAGER" | "ADMIN";

interface RoleMetadata {
  label: string;
  scope: string;
  privileges: string[];
}

export const ROLE_DEFINITIONS: Record<StaffRole, RoleMetadata> = {
  CASHIER: {
    label: "POS Cashier",
    scope: "Live checkout, receipt issuance, and cash drawer management.",
    privileges: [
      "Access /pos terminal",
      "Process cash, Telebirr & CBE transfers",
      "Issue standard customer receipts",
      "Restricted: Cannot view stock cost valuations or edit prices"
    ]
  },
  INVENTORY_CLERK: {
    label: "Inventory / Warehouse Clerk",
    scope: "Stock adjustments, supplier receipts, and SKU count auditing.",
    privileges: [
      "Record Purchase Orders & GRNs",
      "Perform stock audits and wastage adjustments",
      "Manage catalog barcodes and categories",
      "Restricted: Cannot access financial reports or manage staff"
    ]
  },
  STORE_MANAGER: {
    label: "Store Operations Manager",
    scope: "Floor operations, discounts, supplier records, and shift closures.",
    privileges: [
      "Authorize register overrides & custom discounts",
      "Open and finalize cashier shifts (Z-Reports)",
      "Manage customer credit terms and supplier masters",
      "Access store-level daily sales analytics"
    ]
  },
  ADMIN: {
    label: "System Administrator",
    scope: "Complete operational, audit, tax, and credential oversight.",
    privileges: [
      "Full read/write across all modules",
      "Audit trail & user management",
      "Financial ledger, COGS, and margin inspection",
      "System configurations, TIN, and backup exports"
    ]
  }
};

const ROLE_PERMISSIONS_MAP: Record<StaffRole, string[]> = {
  CASHIER: ['create_sales', 'view_products', 'reprint_receipts'],
  INVENTORY_CLERK: ['view_products', 'manage_inventory', 'receive_purchase_orders', 'stock_counts'],
  STORE_MANAGER: ['create_sales', 'view_products', 'manage_inventory', 'view_reports', 'manage_customers', 'manage_suppliers', 'close_shifts'],
  ADMIN: ['create_sales', 'view_products', 'manage_inventory', 'view_reports', 'manage_users', 'manage_settings', 'export_data', 'audit_logs'],
};

interface RegisterStaffModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function RegisterStaffModal({ 
  isOpen = true, 
  onClose,
  onSuccess,
}: RegisterStaffModalProps) {
  const { addUser, addToast } = useApp();

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<StaffRole>("CASHIER");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [quickPin, setQuickPin] = useState("");
  const [forcePasswordChange, setForcePasswordChange] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Secure temporary password generator
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    if (typeof window !== "undefined" && window.crypto) {
      const array = new Uint32Array(12);
      window.crypto.getRandomValues(array);
      for (let i = 0; i < 12; i++) {
        pwd += chars[array[i] % chars.length];
      }
    } else {
      for (let i = 0; i < 12; i++) {
        pwd += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    setTempPassword(pwd);
    if (formErrors.tempPassword) {
      setFormErrors((prev) => ({ ...prev, tempPassword: '' }));
    }
  };

  const handleCopyCredentials = () => {
    if (!tempPassword) return;
    navigator.clipboard.writeText(`Login: ${email || "[Email]"}\nTemporary Password: ${tempPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Validate with Zod schema
    const validationResult = ProvisionStaffSchema.safeParse({
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      role,
      tempPassword,
      quickPin: quickPin ? quickPin.trim() : undefined,
      forcePasswordChange,
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

    setSubmitting(true);

    try {
      const internalRoleMap: Record<StaffRole, RoleType> = {
        CASHIER: 'cashier',
        INVENTORY_CLERK: 'stock_keeper',
        STORE_MANAGER: 'manager',
        ADMIN: 'admin',
      };

      const mappedRole: RoleType = internalRoleMap[role];
      const permissions = ROLE_PERMISSIONS_MAP[role];

      // 1. Add to live application state
      addUser({
        name: fullName.trim(),
        role: mappedRole,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        status: 'active',
        lastActive: 'Just now',
        permissions,
        quickPin: quickPin.trim() || undefined,
        forcePasswordChange,
        initialPassword: tempPassword,
        temporaryPassword: tempPassword,
      });

      // 2. Persist to server API
      try {
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            roleCode: mappedRole,
            temporaryPassword: tempPassword,
            quickPin: quickPin.trim() || undefined,
            forcePasswordChange,
          }),
        });
      } catch (apiErr) {
        console.warn('Backend user persistence notice:', apiErr);
      }

      addToast({
        type: 'success',
        title: 'Staff Account Provisioned',
        message: `${fullName} has been granted access as ${ROLE_DEFINITIONS[role].label}.`,
      });

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch {
      addToast({
        type: 'error',
        title: 'Provisioning Failed',
        message: 'Could not create staff credentials. Please check details.',
      });
    } finally {
      setSubmitting(false);
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
              <UserPlus className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-semibold tracking-tight text-white">Provision Staff Account</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure credentials, assign operational scope, and establish POS terminal access.
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Error Banner */}
        {Object.keys(formErrors).length > 0 && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Please correct highlighted fields before submitting.</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Identity & Basic Contacts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Full Legal Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Tigist Alem Bekele"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
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
                Primary Phone <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  required
                  placeholder="+251 91 234 5678"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                  }}
                  className={`w-full bg-slate-950 border ${formErrors.phone ? 'border-rose-500' : 'border-slate-800'} rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                />
              </div>
              {formErrors.phone && (
                <p className="text-[11px] text-rose-400">{formErrors.phone}</p>
              )}
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-medium text-slate-300">
                Institutional Email / Login ID <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="tigist@amme-electronics.et"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                  }}
                  className={`w-full bg-slate-950 border ${formErrors.email ? 'border-rose-500' : 'border-slate-800'} rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                />
              </div>
              {formErrors.email && (
                <p className="text-[11px] text-rose-400">{formErrors.email}</p>
              )}
            </div>
          </div>

          {/* Role & Privilege Matrix */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Operational Role Assignment
              </label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(Object.keys(ROLE_DEFINITIONS) as StaffRole[]).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`px-3 py-2.5 rounded-lg text-xs font-medium border text-left transition-all cursor-pointer ${
                    role === r 
                      ? "bg-indigo-600/10 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/50" 
                      : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <span className="block font-semibold text-slate-200">{ROLE_DEFINITIONS[r].label}</span>
                </button>
              ))}
            </div>

            {/* Privilege Preview Card */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5 space-y-2">
              <p className="text-xs text-slate-300 font-medium">{ROLE_DEFINITIONS[role].scope}</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-400">
                {ROLE_DEFINITIONS[role].privileges.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-indigo-400 shrink-0"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Access Credentials & Auth Security */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" /> Authentication Credentials
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">
                    Temporary Provisioning Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Generate High-Entropy
                  </button>
                </div>
                
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Min. 8 characters"
                    value={tempPassword}
                    onChange={(e) => {
                      setTempPassword(e.target.value);
                      if (formErrors.tempPassword) setFormErrors({ ...formErrors, tempPassword: '' });
                    }}
                    className={`w-full bg-slate-950 border ${formErrors.tempPassword ? 'border-rose-500' : 'border-slate-800'} rounded-lg pl-3 pr-20 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-slate-500 hover:text-slate-300 rounded cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      disabled={!tempPassword}
                      onClick={handleCopyCredentials}
                      className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-40 rounded cursor-pointer"
                      title="Copy credentials"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                {formErrors.tempPassword && (
                  <p className="text-[11px] text-rose-400">{formErrors.tempPassword}</p>
                )}
              </div>

              {/* POS Fast-Switch PIN */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  POS Switch PIN <span className="text-[10px] text-slate-400">(Optional)</span>
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="4 digits"
                    value={quickPin}
                    onChange={(e) => {
                      setQuickPin(e.target.value.replace(/\D/g, ""));
                      if (formErrors.quickPin) setFormErrors({ ...formErrors, quickPin: '' });
                    }}
                    className={`w-full bg-slate-950 border ${formErrors.quickPin ? 'border-rose-500' : 'border-slate-800'} rounded-lg pl-9 pr-3 py-2 text-xs font-mono tracking-widest text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                  />
                </div>
                {formErrors.quickPin && (
                  <p className="text-[11px] text-rose-400">{formErrors.quickPin}</p>
                )}
              </div>
            </div>

            {/* Mandatory Rotation Policy */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="forcePasswordChange"
                checked={forcePasswordChange}
                onChange={(e) => setForcePasswordChange(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
              />
              <label htmlFor="forcePasswordChange" className="text-xs text-slate-300 select-none cursor-pointer">
                Require password reset on initial login at <span className="font-mono text-slate-200">/login</span>
              </label>
            </div>
          </div>

          {/* Action Row */}
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
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {submitting ? "Provisioning..." : "Provision Staff Account"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
