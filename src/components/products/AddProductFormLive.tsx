"use client";

import React, { useState } from "react";
import { createProductWithOpeningStock } from "@/app/actions/retail";
import { 
  PackagePlus, 
  Barcode, 
  Save, 
  Check, 
  AlertCircle 
} from "lucide-react";

export function calculateEAN13Checksum(raw12Digits: string): string {
  const digits = raw12Digits.replace(/\D/g, "").slice(0, 12);
  if (digits.length !== 12) return raw12Digits;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${digits}${checkDigit}`;
}

export default function AddProductFormLive({
  categories,
  adminUserId = "usr-01",
  onSuccess,
}: {
  categories: { id: string; name: string }[];
  adminUserId?: string;
  onSuccess?: () => void;
}) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [brand, setBrand] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [costPrice, setCostPrice] = useState<number>(0);
  const [retailPrice, setRetailPrice] = useState<number>(0);
  const [openingStock, setOpeningStock] = useState<number>(0);
  const [minThreshold, setMinThreshold] = useState<number>(5);
  const [warrantyMonths, setWarrantyMonths] = useState<number>(12);
  const [shelfLocation, setShelfLocation] = useState("");
  const [trackSerials, setTrackSerials] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Financial calculations
  const markupETB = Math.max(0, retailPrice - costPrice);
  const grossMarginPct = retailPrice > 0 ? (markupETB / retailPrice) * 100 : 0;
  const markupRatePct = costPrice > 0 ? (markupETB / costPrice) * 100 : 0;

  const handleGenerateEAN13 = () => {
    const random9 = Math.floor(100000000 + Math.random() * 900000000).toString();
    const raw12 = `693${random9}`;
    setBarcode(calculateEAN13Checksum(raw12));
  };

  const handleAutoGenerateSKU = () => {
    const brandPrefix = brand ? brand.slice(0, 3).toUpperCase() : "GEN";
    const namePrefix = name ? name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() : "PROD";
    const rand = Math.floor(100 + Math.random() * 900);
    setSku(`${brandPrefix}-${namePrefix}-${rand}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (retailPrice < costPrice) {
      setFeedback("Selling price cannot be less than cost price.");
      return;
    }
    setSubmitting(true);
    setFeedback(null);

    try {
      await createProductWithOpeningStock(
        {
          name,
          sku,
          barcode,
          brand,
          categoryId,
          costPrice,
          retailPrice,
          openingStock,
          minThreshold,
          warrantyMonths,
          shelfLocation,
          trackSerials,
          description,
        },
        adminUserId
      );

      setFeedback("Product saved and initial stock movement committed to PostgreSQL.");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      setFeedback(err.message || "Failed to commit product to database.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-slate-800 dark:text-slate-100 max-w-3xl w-full font-sans shadow-xl">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <PackagePlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Add New Electronics Product
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure specifications, live ETB pricing, barcode, opening stock, and warranty.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs mb-4 border flex items-center gap-2 ${
            feedback.includes("saved")
              ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300"
          }`}
        >
          {feedback.includes("saved") ? (
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{feedback}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Product Title / Model *</label>
            <input
              type="text"
              required
              placeholder="e.g., Anker Soundcore Life P2i True Wireless Earbuds"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-slate-700 dark:text-slate-300">SKU Code *</label>
              <button
                type="button"
                onClick={handleAutoGenerateSKU}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Auto Generate
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="e.g., AUD-ANK-P2I"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Barcode / EAN-13 *</label>
              <button
                type="button"
                onClick={handleGenerateEAN13}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Barcode className="w-3 h-3" /> Generate Checksum
              </button>
            </div>
            <input
              type="text"
              required
              maxLength={13}
              placeholder="13-digit EAN barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Brand *</label>
            <input
              type="text"
              required
              placeholder="e.g., Anker, Baseus, Oraimo, Apple"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Category *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="dark:bg-slate-900">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pricing & Margin Card */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Cost Price (ETB) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={costPrice || ""}
                onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-right"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">Selling Price (ETB) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={retailPrice || ""}
                onChange={(e) => setRetailPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 font-mono text-emerald-600 dark:text-emerald-400 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-right"
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-[11px] font-mono border-t border-slate-200 dark:border-slate-800/80 pt-2 text-slate-500 dark:text-slate-400">
            <span>
              Live Markup: <strong className="text-slate-900 dark:text-white">{markupETB.toFixed(2)} ETB</strong>
            </span>
            <span>
              Gross Margin: <strong className="text-emerald-600 dark:text-emerald-400">+{grossMarginPct.toFixed(1)}%</strong>
            </span>
            <span>
              Markup Rate: <strong className="text-indigo-600 dark:text-indigo-400">+{markupRatePct.toFixed(1)}%</strong>
            </span>
          </div>
        </div>

        {/* Stock & Inventory Rules */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Opening Stock Qty *</label>
            <input
              type="number"
              min={0}
              required
              value={openingStock}
              onChange={(e) => setOpeningStock(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Low Stock Min *</label>
            <input
              type="number"
              min={1}
              required
              value={minThreshold}
              onChange={(e) => setMinThreshold(parseInt(e.target.value, 10) || 1)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Warranty (Months)</label>
            <select
              value={warrantyMonths}
              onChange={(e) => setWarrantyMonths(parseInt(e.target.value, 10))}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value={0} className="dark:bg-slate-900">No Warranty</option>
              <option value={3} className="dark:bg-slate-900">3 Months</option>
              <option value={6} className="dark:bg-slate-900">6 Months</option>
              <option value={12} className="dark:bg-slate-900">12 Months</option>
              <option value={24} className="dark:bg-slate-900">24 Months</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Shelf / Bin Location</label>
            <input
              type="text"
              placeholder="e.g., Aisle 2 • Shelf B3"
              value={shelfLocation}
              onChange={(e) => setShelfLocation(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="trackSerials"
              checked={trackSerials}
              onChange={(e) => setTrackSerials(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
            />
            <label htmlFor="trackSerials" className="text-slate-700 dark:text-slate-300 select-none cursor-pointer">
              Track Serial Numbers (IMEI / Device SN)
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {submitting ? "Committing to Ledger..." : "Save Product & Stock Movement"}
          </button>
        </div>
      </form>
    </div>
  );
}
