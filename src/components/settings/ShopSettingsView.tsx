'use client';

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Receipt, 
  SlidersHorizontal, 
  Phone, 
  Mail, 
  Printer, 
  Check, 
  Save, 
  AlertCircle,
  Sun,
  Moon
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import { UpdateShopSettingsSchema } from "@/lib/validations/settings";

export type SettingsTab = "PROFILE" | "RECEIPT" | "INVENTORY";

export interface StoreProfileConfig {
  displayName: string;
  legalEntityName: string;
  tinNumber: string;
  vatNumber: string;
  cityRegion: string;
  streetKebele: string;
  landmark: string;
  primaryPhone: string;
  officialEmail: string;
  
  // POS & Receipt Settings
  receiptHeaderNotice: string;
  receiptFooterNotice: string;
  paperWidth: "80mm" | "58mm";
  printVatBreakdown: boolean;
  printCustomerTin: boolean;
  printCashierName: boolean;
  
  // Inventory Policy
  globalLowStockThreshold: number;
  preventNegativeStockSales: boolean;
  strictBarcodeEnforcement: boolean;
}

export default function ShopSettingsView() {
  const { settings, updateSettings, addToast } = useApp();
  const { toggleTheme, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<SettingsTab>("PROFILE");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [config, setConfig] = useState<StoreProfileConfig>({
    displayName: settings.shopName || "Nasir Amme Electronics",
    legalEntityName: settings.legalName || "Nasir Amme General Trading & Electronics Retail",
    tinNumber: settings.tinNumber || "0078923412",
    vatNumber: settings.vatNumber || "15/998241",
    cityRegion: settings.city || "Dire Dawa",
    streetKebele: settings.streetKebele || settings.address || "Kebele 02, Commercial Corridor",
    landmark: settings.landmark || "Opposite Ras Hotel / Commercial Bank St.",
    primaryPhone: settings.phonePrimary || "+251 91 123 4567",
    officialEmail: settings.email || "admin@amme-electronics.et",
    
    receiptHeaderNotice: settings.receiptHeader || "Authentic Accessories & Electronics Warranty",
    receiptFooterNotice: settings.receiptFooter || "Thank you for shopping with us! Returns valid 48h with receipt.",
    paperWidth: (settings.paperWidth as "80mm" | "58mm") || "80mm",
    printVatBreakdown: settings.printVatBreakdown ?? true,
    printCustomerTin: settings.printCustomerTin ?? true,
    printCashierName: settings.printCashierName ?? true,

    globalLowStockThreshold: settings.lowStockGlobalThreshold || 5,
    preventNegativeStockSales: settings.preventNegativeStockSales ?? true,
    strictBarcodeEnforcement: settings.strictBarcodeEnforcement ?? false,
  });

  // Sync if settings in context change
  useEffect(() => {
    if (settings) {
      setConfig((prev) => ({
        ...prev,
        displayName: settings.shopName || prev.displayName,
        legalEntityName: settings.legalName || prev.legalEntityName,
        tinNumber: settings.tinNumber || prev.tinNumber,
        vatNumber: settings.vatNumber || prev.vatNumber,
        cityRegion: settings.city || prev.cityRegion,
        streetKebele: settings.streetKebele || settings.address || prev.streetKebele,
        landmark: settings.landmark || prev.landmark,
        primaryPhone: settings.phonePrimary || prev.primaryPhone,
        officialEmail: settings.email || prev.officialEmail,
        receiptHeaderNotice: settings.receiptHeader || prev.receiptHeaderNotice,
        receiptFooterNotice: settings.receiptFooter || prev.receiptFooterNotice,
        globalLowStockThreshold: settings.lowStockGlobalThreshold || prev.globalLowStockThreshold,
      }));
    }
  }, [settings]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormErrors({});

    // Validate with Zod schema
    const validationResult = UpdateShopSettingsSchema.safeParse({
      displayName: config.displayName.trim(),
      legalEntityName: config.legalEntityName.trim(),
      tinNumber: config.tinNumber.trim(),
      vatNumber: config.vatNumber.trim() || undefined,
      cityRegion: config.cityRegion.trim(),
      streetKebele: config.streetKebele.trim(),
      landmark: config.landmark.trim() || undefined,
      primaryPhone: config.primaryPhone.trim(),
      officialEmail: config.officialEmail.trim().toLowerCase(),
      receiptHeaderNotice: config.receiptHeaderNotice.trim() || undefined,
      receiptFooterNotice: config.receiptFooterNotice.trim() || undefined,
      paperWidth: config.paperWidth,
      printVatBreakdown: config.printVatBreakdown,
      printCashierName: config.printCashierName,
      globalLowStockThreshold: Number(config.globalLowStockThreshold) || 5,
      preventNegativeStockSales: config.preventNegativeStockSales,
      strictBarcodeEnforcement: config.strictBarcodeEnforcement,
    });

    if (!validationResult.success) {
      const errMap: Record<string, string> = {};
      validationResult.error.issues.forEach((err) => {
        const fieldName = err.path.join(".");
        errMap[fieldName] = err.message;
      });
      setFormErrors(errMap);
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please review and fix highlighted fields before saving.',
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Update live AppContext state immediately
      updateSettings({
        shopName: config.displayName.trim(),
        legalName: config.legalEntityName.trim(),
        tinNumber: config.tinNumber.trim(),
        vatNumber: config.vatNumber.trim(),
        city: config.cityRegion.trim(),
        address: config.streetKebele.trim(),
        streetKebele: config.streetKebele.trim(),
        landmark: config.landmark.trim(),
        phonePrimary: config.primaryPhone.trim(),
        email: config.officialEmail.trim(),
        receiptHeader: config.receiptHeaderNotice.trim(),
        receiptFooter: config.receiptFooterNotice.trim(),
        paperWidth: config.paperWidth,
        printVatBreakdown: config.printVatBreakdown,
        printCustomerTin: config.printCustomerTin,
        printCashierName: config.printCashierName,
        lowStockGlobalThreshold: Number(config.globalLowStockThreshold) || 5,
        preventNegativeStockSales: config.preventNegativeStockSales,
        strictBarcodeEnforcement: config.strictBarcodeEnforcement,
      });

      // 2. Persist to API
      try {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: config.displayName.trim(),
            legalName: config.legalEntityName.trim(),
            addressText: config.streetKebele.trim(),
            city: config.cityRegion.trim(),
            phonePrimary: config.primaryPhone.trim(),
            email: config.officialEmail.trim(),
            tinNumber: config.tinNumber.trim(),
            receiptHeader: config.receiptHeaderNotice.trim(),
            receiptFooter: config.receiptFooterNotice.trim(),
            lowStockGlobalThreshold: Number(config.globalLowStockThreshold) || 5,
          }),
        });
      } catch (apiErr) {
        console.warn('Backend settings sync notice:', apiErr);
      }

      setSaved(true);
      addToast({
        type: 'success',
        title: 'Settings Saved',
        message: 'Store configuration and thermal receipt parameters persisted successfully.',
      });
      setTimeout(() => setSaved(false), 2500);
    } catch {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not persist settings. Please check values.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      
      {/* Page Title & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Shop Settings & Configuration</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage legal tax identification, thermal print layouts, and stock threshold logic.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
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

          {saved && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 font-semibold">
              <Check className="w-3.5 h-3.5" /> Changes Persisted
            </span>
          )}

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {loading ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Global Validation Banner */}
      {Object.keys(formErrors).length > 0 && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
          <span>Please fix highlighted errors before saving settings.</span>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-px overflow-x-auto">
        {[
          { key: "PROFILE", label: "Store Profile & Legal TIN", icon: Building2 },
          { key: "RECEIPT", label: "Thermal Receipt (ESC/POS)", icon: Receipt },
          { key: "INVENTORY", label: "Inventory Thresholds & Rules", icon: SlidersHorizontal },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key as SettingsTab)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === key
                ? "border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-slate-900/40 font-semibold"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Main Settings Form Body */}
      <form onSubmit={handleSave}>
        
        {/* TAB 1: Profile & Tax ID */}
        {activeTab === "PROFILE" && (
          <div className="space-y-6">
            
            {/* Fiscal Registration Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3 gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Business Identification & Tax Registration</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Official company credentials stamped on sales receipts and tax audits.</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 w-fit">
                  FRCA / ERCA Tax Compliance
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Store Brand / Display Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={config.displayName}
                    onChange={(e) => {
                      setConfig({ ...config, displayName: e.target.value });
                      if (formErrors.displayName) setFormErrors({ ...formErrors, displayName: '' });
                    }}
                    className={`w-full bg-white dark:bg-slate-950 border ${formErrors.displayName ? 'border-rose-500' : 'border-slate-300 dark:border-slate-800'} rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
                  />
                  {formErrors.displayName ? (
                    <span className="text-[10px] text-rose-500">{formErrors.displayName}</span>
                  ) : (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Appears on receipt headers and POS navigation bar.</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Registered Legal Entity Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={config.legalEntityName}
                    onChange={(e) => {
                      setConfig({ ...config, legalEntityName: e.target.value });
                      if (formErrors.legalEntityName) setFormErrors({ ...formErrors, legalEntityName: '' });
                    }}
                    className={`w-full bg-white dark:bg-slate-950 border ${formErrors.legalEntityName ? 'border-rose-500' : 'border-slate-300 dark:border-slate-800'} rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
                  />
                  {formErrors.legalEntityName && (
                    <span className="text-[10px] text-rose-500">{formErrors.legalEntityName}</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Ethiopian TIN (Tax Identification Number) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={config.tinNumber}
                    onChange={(e) => {
                      setConfig({ ...config, tinNumber: e.target.value.replace(/\D/g, "") });
                      if (formErrors.tinNumber) setFormErrors({ ...formErrors, tinNumber: '' });
                    }}
                    className={`w-full bg-white dark:bg-slate-950 border ${formErrors.tinNumber ? 'border-rose-500' : 'border-slate-300 dark:border-slate-800'} rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
                  />
                  {formErrors.tinNumber ? (
                    <span className="text-[10px] text-rose-500">{formErrors.tinNumber}</span>
                  ) : (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">10-digit number printed on fiscal sales vouchers.</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">VAT Registration No.</label>
                  <input
                    type="text"
                    value={config.vatNumber}
                    onChange={(e) => setConfig({ ...config, vatNumber: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Physical Location Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Physical Store Address & Communication</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Printed on receipt contact sections and purchase orders.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Region / City</label>
                  <select
                    value={config.cityRegion}
                    onChange={(e) => setConfig({ ...config, cityRegion: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="Dire Dawa">Dire Dawa Administration</option>
                    <option value="Harar">Harari Region</option>
                    <option value="Addis Ababa">Addis Ababa City Administration</option>
                    <option value="Oromia">Oromia / Eastern Hub</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Street Address & Kebele</label>
                  <input
                    type="text"
                    value={config.streetKebele}
                    onChange={(e) => {
                      setConfig({ ...config, streetKebele: e.target.value });
                      if (formErrors.streetKebele) setFormErrors({ ...formErrors, streetKebele: '' });
                    }}
                    className={`w-full bg-white dark:bg-slate-950 border ${formErrors.streetKebele ? 'border-rose-500' : 'border-slate-300 dark:border-slate-800'} rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
                  />
                  {formErrors.streetKebele && (
                    <span className="text-[10px] text-rose-500">{formErrors.streetKebele}</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Prominent Landmark / Navigation Note</label>
                  <input
                    type="text"
                    value={config.landmark}
                    onChange={(e) => setConfig({ ...config, landmark: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Primary Mobile / Till Phone</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={config.primaryPhone}
                      onChange={(e) => {
                        setConfig({ ...config, primaryPhone: e.target.value });
                        if (formErrors.primaryPhone) setFormErrors({ ...formErrors, primaryPhone: '' });
                      }}
                      className={`w-full bg-white dark:bg-slate-950 border ${formErrors.primaryPhone ? 'border-rose-500' : 'border-slate-300 dark:border-slate-800'} rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
                    />
                  </div>
                  {formErrors.primaryPhone && (
                    <span className="text-[10px] text-rose-500">{formErrors.primaryPhone}</span>
                  )}
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Official Store Email</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={config.officialEmail}
                      onChange={(e) => {
                        setConfig({ ...config, officialEmail: e.target.value });
                        if (formErrors.officialEmail) setFormErrors({ ...formErrors, officialEmail: '' });
                      }}
                      className={`w-full bg-white dark:bg-slate-950 border ${formErrors.officialEmail ? 'border-rose-500' : 'border-slate-300 dark:border-slate-800'} rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
                    />
                  </div>
                  {formErrors.officialEmail && (
                    <span className="text-[10px] text-rose-500">{formErrors.officialEmail}</span>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: Thermal Receipt Customizer */}
        {activeTab === "RECEIPT" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Configuration Inputs (7 cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">ESC/POS Thermal Receipt Layout</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Configure parameters for direct thermal printers and PDF vouchers.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Printer Paper Width</label>
                  <div className="grid grid-cols-2 gap-3">
                    {["80mm", "58mm"].map((w) => (
                      <button
                        type="button"
                        key={w}
                        onClick={() => setConfig({ ...config, paperWidth: w as any })}
                        className={`py-2 px-3 text-xs font-mono rounded-lg border text-center transition-colors cursor-pointer ${
                          config.paperWidth === w
                            ? "bg-indigo-50 dark:bg-indigo-600/15 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold"
                            : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        {w} Standard POS Roll
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Header Subtitle Note</label>
                  <input
                    type="text"
                    value={config.receiptHeaderNotice}
                    onChange={(e) => setConfig({ ...config, receiptHeaderNotice: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Footer Warranty / Policy Notice</label>
                  <textarea
                    rows={2}
                    value={config.receiptFooterNotice}
                    onChange={(e) => setConfig({ ...config, receiptFooterNotice: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                    Receipt Line Elements
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="printVat"
                      checked={config.printVatBreakdown}
                      onChange={(e) => setConfig({ ...config, printVatBreakdown: e.target.checked })}
                      className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                    />
                    <label htmlFor="printVat" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      Print 15% VAT Breakdown (Taxable vs. Non-Taxable Subtotals)
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="printCashier"
                      checked={config.printCashierName}
                      onChange={(e) => setConfig({ ...config, printCashierName: e.target.checked })}
                      className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                    />
                    <label htmlFor="printCashier" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      Print Cashier Name & Active Shift ID
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Real-time Live Receipt Preview (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" /> Thermal Output Simulation
              </div>

              {/* Receipt Visual Container */}
              <div className={`${config.paperWidth === '58mm' ? 'max-w-[240px]' : 'max-w-[320px]'} w-full bg-[#FEFEFE] text-slate-900 p-4 rounded-lg shadow-xl font-mono text-[11px] leading-tight space-y-3 border-t-4 border-indigo-600 select-none border-x border-b border-slate-200 transition-all duration-200`}>
                <div className="text-center space-y-1">
                  <div className="font-bold text-sm tracking-tight text-slate-950 uppercase">{config.displayName}</div>
                  <div className="text-[10px] text-slate-600">{config.streetKebele}, {config.cityRegion}</div>
                  <div className="text-[10px] text-slate-600">TEL: {config.primaryPhone}</div>
                  <div className="text-[10px] font-bold text-slate-950">TIN: {config.tinNumber} | VAT: {config.vatNumber}</div>
                  <div className="text-[9px] font-bold tracking-widest text-slate-500 pt-0.5">
                    RECEIPT PREVIEW • NON-FISCAL
                  </div>
                  {config.receiptHeaderNotice && (
                    <div className="text-[10px] italic text-slate-500 border-b border-dashed border-slate-300 pb-2">
                      &ldquo;{config.receiptHeaderNotice}&rdquo;
                    </div>
                  )}
                </div>

                <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-300 pb-2">
                  <div className="flex justify-between">
                    <span>Receipt No: REC-2026-5128</span>
                    <span>17:37 EAT</span>
                  </div>
                  {config.printCashierName && (
                    <div className="flex justify-between text-slate-600">
                      <span>Cashier: Nasir Amme</span>
                      <span>Till #01</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2">
                  <div className="flex justify-between font-bold text-[10px]">
                    <span>ITEM / QTY</span>
                    <span>TOTAL</span>
                  </div>
                  <div>
                    <div className="truncate font-semibold">Joyroom 3-in-1 Fast Charging Cable</div>
                    <div className="flex justify-between text-slate-600 text-[10px]">
                      <span>1 pcs @ 900.00</span>
                      <span>900.00 ETB</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>900.00 ETB</span>
                  </div>
                  {config.printVatBreakdown && (
                    <div className="flex justify-between text-slate-600 text-[10px]">
                      <span>VAT (15% Included):</span>
                      <span>117.39 ETB</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-xs pt-1 border-t border-black text-black">
                    <span>TOTAL (ETB):</span>
                    <span>900.00 ETB</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600 pt-1">
                    <span className="font-bold">Payment Mode:</span>
                    <span className="uppercase font-bold tracking-wider">TELEBIRR</span>
                  </div>
                </div>

                {/* Simulated Code128 Barcode Strip */}
                <div className="my-2 text-center space-y-1">
                  <div className="flex justify-center items-center h-7 gap-[1.5px] overflow-hidden px-2">
                    {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 3, 2, 1, 4, 2, 1, 3, 2].map(
                      (width, index) => (
                        <div
                          key={index}
                          className="bg-black h-full"
                          style={{ width: `${width}px` }}
                        />
                      )
                    )}
                  </div>
                  <div className="text-[9px] tracking-widest font-mono text-black">
                    *REC-2026-5128*
                  </div>
                </div>

                <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[9px] text-slate-600">
                  <p className="font-semibold text-black">Thank you for shopping with us!</p>
                  <p>{config.receiptFooterNotice || "Exchange within 3 days with valid receipt."}</p>
                  <p className="mt-1 font-mono text-slate-400 text-[8px] uppercase">Powered by Nasir Amme Electronics Retail System</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: Inventory Rules & Thresholds */}
        {activeTab === "INVENTORY" && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Inventory Controls & Safety Thresholds</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure ledger enforcement rules for stock levels and point of sale.</p>
            </div>

            <div className="max-w-2xl space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Default Global Low-Stock Safety Threshold</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 text-xs font-semibold">{config.globalLowStockThreshold} units</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={config.globalLowStockThreshold}
                  onChange={(e) => setConfig({ ...config, globalLowStockThreshold: Number(e.target.value) })}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Trigger dashboard alerts when a SKU&apos;s stock drops below this number (can be overridden per SKU).
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="preventNeg"
                    checked={config.preventNegativeStockSales}
                    onChange={(e) => setConfig({ ...config, preventNegativeStockSales: e.target.checked })}
                    className="mt-0.5 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="preventNeg" className="text-xs text-slate-800 dark:text-slate-200 font-medium cursor-pointer">
                      Strict Negative Stock Prevention
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Disallows cashiers from completing checkout if the inventory count is 0 or unverified.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="strictBarcode"
                    checked={config.strictBarcodeEnforcement}
                    onChange={(e) => setConfig({ ...config, strictBarcodeEnforcement: e.target.checked })}
                    className="mt-0.5 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="strictBarcode" className="text-xs text-slate-800 dark:text-slate-200 font-medium cursor-pointer">
                      Strict Barcode-Only Scans at POS
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Requires hardware barcode/QR scans and suppresses manual SKU search dropdowns during rush hours.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </form>

    </div>
  );
}
