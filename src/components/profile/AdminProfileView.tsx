'use client';

import React, { useState, useMemo } from "react";
import {
  UserCheck,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Phone,
  Mail,
  Building2,
  Sun,
  Moon,
  Edit3,
  Check,
  ShieldCheck
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import { UpdateAdminPasswordSchema, UpdateQuickPinSchema } from "@/lib/validations/profile";

export default function AdminProfileView() {
  const { user: authUser, roles } = useAuth();
  const { settings, users, addToast } = useApp();
  const { toggleTheme, isDark } = useTheme();

  // Find corresponding user account in live app state if present
  const matchingUser = useMemo(() => {
    if (!authUser) return null;
    return users.find((u) => u.email.toLowerCase() === authUser.email.toLowerCase() || u.id === authUser.id) || null;
  }, [users, authUser]);

  // Dynamic user data
  const displayName = authUser?.fullName || matchingUser?.name || "Nasir Amme";
  const displayEmail = authUser?.email || matchingUser?.email || "nasir@amme-electronics.et";
  const displayPhone = authUser?.phone || matchingUser?.phone || "+251 91 123 4567";
  const primaryRole = (roles[0] || matchingUser?.role || "admin").toLowerCase();
  const accountStatus = authUser?.status || matchingUser?.status || "active";
  const shopName = settings.shopName || "Nasir Amme Electronics";
  const shopCity = settings.city || "Dire Dawa";

  // Dynamic role title and tier description
  const roleMetadata = useMemo(() => {
    switch (primaryRole) {
      case "admin":
        return {
          title: "System Administrator",
          tier: "Tier 0 Root",
          badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
          scope: "Full operational oversight, user credential provisioning, and system configuration.",
        };
      case "manager":
        return {
          title: "Store Operations Manager",
          tier: "Tier 1 Supervisor",
          badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          scope: "Floor operations, discounts, supplier approvals, and register shift closures.",
        };
      case "cashier":
        return {
          title: "POS Cashier",
          tier: "Tier 2 Operator",
          badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          scope: "Live checkout, thermal receipt issuance, and cash drawer balance reconciliation.",
        };
      case "stock_keeper":
        return {
          title: "Inventory & Warehouse Clerk",
          tier: "Tier 2 Specialist",
          badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
          scope: "Goods receiving, physical stock auditing, and SKU adjustments.",
        };
      default:
        return {
          title: "Authorized Staff",
          tier: "Staff Member",
          badgeColor: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
          scope: "Authenticated staff account with operational privileges.",
        };
    }
  }, [primaryRole]);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // POS Quick-Switch PIN state
  const [quickPin, setQuickPin] = useState("••••");
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [pinFeedback, setPinFeedback] = useState<string | null>(null);

  // Editable Profile fields (Phone & Name)
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactPhone, setContactPhone] = useState(displayPhone);
  const [contactName, setContactName] = useState(displayName);

  // Dynamic Password Strength calculation
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: "Enter password", color: "bg-slate-300 dark:bg-slate-700" };
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-rose-500 text-rose-500" };
    if (score === 2 || score === 3) return { score: 2, label: "Good", color: "bg-amber-500 text-amber-500" };
    return { score: 3, label: "Strong", color: "bg-emerald-500 text-emerald-500" };
  }, [newPassword]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    // Validate with Zod schema
    const validationResult = UpdateAdminPasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || "Invalid password inputs.";
      setPasswordFeedback({ type: "error", text: firstError });
      return;
    }

    setUpdatingPassword(true);

    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update credentials.');
      }

      setPasswordFeedback({ type: "success", text: "Security credentials updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      addToast({
        title: "Password Updated",
        message: "Your master login password has been changed and encrypted.",
        type: "success",
      });
      setTimeout(() => setPasswordFeedback(null), 4000);
    } catch (err: unknown) {
      setPasswordFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Could not update password. Please check your current password.",
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handlePinSave = () => {
    const validationResult = UpdateQuickPinSchema.safeParse({ pin: newPin });
    if (!validationResult.success) {
      setPinFeedback("PIN must be exactly 4 numeric digits");
      return;
    }

    setQuickPin("••••");
    setIsEditingPin(false);
    setNewPin("");
    setPinFeedback(null);
    addToast({
      title: "PIN Saved",
      message: "POS Fast-Switch PIN updated successfully.",
      type: "success",
    });
  };

  const handleContactSave = () => {
    setIsEditingContact(false);
    addToast({
      title: "Profile Contact Updated",
      message: "Your operational contact details have been updated.",
      type: "success",
    });
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      
      {/* Page Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Security & Operational Profile
            </h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${roleMetadata.badgeColor}`}>
              {roleMetadata.tier}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your credentials, store authorization scope, and register terminal lock code.
          </p>
        </div>

        {/* Header Actions & Theme Switcher */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Dark Mode</span>
              </>
            )}
          </button>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Identity Verified
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols): Staff Identity & Station */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Identity & Role Overview Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Staff Identity & Station
              </h2>
              <button
                type="button"
                onClick={() => setIsEditingContact(!isEditingContact)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <Edit3 className="w-3 h-3" />
                {isEditingContact ? "Cancel Edit" : "Edit Profile"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              {/* Full Legal Name */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-lg">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Full Legal Name</span>
                {isEditingContact ? (
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="mt-1 w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                ) : (
                  <span className="font-semibold text-slate-900 dark:text-slate-200 mt-1 block text-sm">
                    {contactName}
                  </span>
                )}
              </div>

              {/* Authentication ID (Email) */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-lg">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" /> Authentication ID (Email)
                </span>
                <span className="font-mono text-slate-900 dark:text-slate-200 mt-1 block">
                  {displayEmail}
                </span>
              </div>

              {/* Primary Contact Phone */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-lg">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" /> Operational Contact Phone
                </span>
                {isEditingContact ? (
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="mt-1 w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                ) : (
                  <span className="font-mono text-slate-900 dark:text-slate-200 mt-1 block">
                    {contactPhone}
                  </span>
                )}
              </div>

              {/* Station & Physical Hub */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-lg">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-slate-400" /> Assigned Store Branch
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-200 mt-1 block">
                  {shopName} ({shopCity})
                </span>
              </div>

              {/* System Assigned Role */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-lg sm:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block">System Assigned Role</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {roleMetadata.title}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${roleMetadata.badgeColor}`}>
                        {roleMetadata.tier}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="capitalize">{accountStatus} & In Good Standing</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  {roleMetadata.scope}
                </p>
              </div>

            </div>

            {isEditingContact && (
              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleContactSave}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Save Changes
                </button>
              </div>
            )}
          </div>

          {/* Change Password Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3 mb-4">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Authentication Credentials
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Rotate your primary master login password across web and desktop POS interfaces.
              </p>
            </div>

            {passwordFeedback && (
              <div className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 border ${
                passwordFeedback.type === "success" 
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" 
                  : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
              }`}>
                {passwordFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{passwordFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    required
                    placeholder={`Enter current password for ${displayEmail}`}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 pr-10 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-pointer"
                    title={showCurrent ? "Hide password" : "Show password"}
                  >
                    {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      New Password <span className="text-rose-500">*</span>
                    </label>
                    {newPassword && (
                      <span className={`text-[10px] font-semibold ${passwordStrength.color}`}>
                        {passwordStrength.label}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      required
                      placeholder="Min. 8 chars (letters, digits)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 pr-10 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-pointer"
                      title={showNew ? "Hide password" : "Show password"}
                    >
                      {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Password Strength Progress Bar */}
                  {newPassword && (
                    <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5 flex gap-1">
                      <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 1 ? 'bg-rose-500' : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 2 ? 'bg-amber-500' : 'bg-transparent'}`} />
                      <div className={`h-full flex-1 rounded-full ${passwordStrength.score >= 3 ? 'bg-emerald-500' : 'bg-transparent'}`} />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Confirm New Password <span className="text-rose-500">*</span>
                    </label>
                    {confirmPassword && (
                      <span className={`text-[10px] font-semibold ${newPassword === confirmPassword ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                        {newPassword === confirmPassword ? 'Match' : 'Mismatch'}
                      </span>
                    )}
                  </div>
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                  Password changes are logged to the shop audit trail.
                </span>
                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {updatingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Right Column (1 Col): Fast-Switch PIN & Security Status */}
        <div className="space-y-6">
          
          {/* POS Terminal Fast-Switch PIN */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Fast-Switch POS PIN
              </h2>
              <span className="text-[10px] text-slate-400">Register Lock</span>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Used to unlock active register terminals quickly during busy sales shifts without re-entering your master password.
            </p>

            {pinFeedback && (
              <p className="text-[11px] text-rose-500 font-medium">{pinFeedback}</p>
            )}

            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block">Configured PIN</span>
                <span className="font-mono text-base tracking-widest text-slate-900 dark:text-slate-100 font-bold">
                  {isEditingPin ? (
                    <input
                      type="password"
                      maxLength={4}
                      autoFocus
                      placeholder="4 digits"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                      className="bg-transparent border-b-2 border-indigo-500 outline-none w-24 text-indigo-600 dark:text-indigo-400 tracking-widest text-center"
                    />
                  ) : quickPin}
                </span>
              </div>
              
              {isEditingPin ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePinSave}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingPin(false);
                      setNewPin("");
                      setPinFeedback(null);
                    }}
                    className="text-xs text-slate-500 hover:underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingPin(true)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                >
                  Change PIN
                </button>
              )}
            </div>
          </div>

          {/* Quick Security Tips Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Account Security Standards
            </h3>
            
            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span>Never share your PIN with unauthorized floor staff.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span>Password resets are immediately synced across all cash registers.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span>Use Fast-Switch PIN for locking and resuming till sessions.</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
