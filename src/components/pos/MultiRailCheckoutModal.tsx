"use client";

import React, { useState } from "react";
import {
  Smartphone,
  CreditCard,
  Banknote,
  Receipt,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck
} from "lucide-react";

export type PaymentRailType =
  | "TELEBIRR_DIRECT"
  | "CBE_BIRR"
  | "CASH"
  | "STORE_CREDIT";

export interface SplitEntry {
  rail: PaymentRailType;
  amount: number;
  txnRef: string;
}

interface MultiRailCheckoutModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  grandTotal?: number;
  receiptNo?: string;
  onFinalize: (splits: SplitEntry[]) => void;
}

export default function MultiRailCheckoutModal({
  isOpen = true,
  onClose,
  grandTotal = 4500.0,
  receiptNo = "REC-2026-0042",
  onFinalize,
}: MultiRailCheckoutModalProps) {
  const [splits, setSplits] = useState<SplitEntry[]>([
    { rail: "TELEBIRR_DIRECT", amount: grandTotal, txnRef: "" },
  ]);

  if (!isOpen) return null;

  const allocatedTotal = splits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
  const remainingDue = Number((grandTotal - allocatedTotal).toFixed(2));
  const isBalanced = Math.abs(remainingDue) < 0.01;

  const updateSplit = (index: number, field: keyof SplitEntry, value: any) => {
    setSplits((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const addRail = () => {
    if (remainingDue <= 0) return;
    setSplits((prev) => [
      ...prev,
      { rail: "CASH", amount: Math.max(0, remainingDue), txnRef: "" },
    ]);
  };

  const removeRail = (index: number) => {
    if (splits.length === 1) return;
    setSplits((prev) => prev.filter((_, idx) => idx !== index));
  };

  const getRailIcon = (rail: PaymentRailType) => {
    switch (rail) {
      case "TELEBIRR_DIRECT":
        return <Smartphone className="w-4 h-4 text-indigo-400" />;
      case "CBE_BIRR":
        return <CreditCard className="w-4 h-4 text-purple-400" />;
      case "CASH":
        return <Banknote className="w-4 h-4 text-emerald-400" />;
      case "STORE_CREDIT":
        return <Receipt className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full text-slate-100 font-sans shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Multi-Rail Payment Settlement
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Allocate ticket balance across settlement channels • {receiptNo}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-mono block uppercase">Ticket Due</span>
              <span className="text-base font-mono font-bold text-emerald-400">
                {grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} ETB
              </span>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Allocation List */}
        <div className="space-y-3 my-4 max-h-[50vh] overflow-y-auto pr-1">
          {splits.map((split, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 flex-1">
                  {getRailIcon(split.rail)}
                  <select
                    value={split.rail}
                    onChange={(e) => updateSplit(idx, "rail", e.target.value as PaymentRailType)}
                    className="bg-transparent text-slate-200 font-medium focus:outline-none w-full cursor-pointer text-xs"
                  >
                    <option value="TELEBIRR_DIRECT" className="bg-slate-900">Telebirr SuperApp / QR</option>
                    <option value="CBE_BIRR" className="bg-slate-900">CBE Birr Transfer</option>
                    <option value="CASH" className="bg-slate-900">Physical Cash Till</option>
                    <option value="STORE_CREDIT" className="bg-slate-900">Customer Credit Ledger</option>
                  </select>
                </div>

                <div className="relative w-36">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={split.amount === 0 ? "" : split.amount}
                    onChange={(e) =>
                      updateSplit(idx, "amount", parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 font-mono text-right text-emerald-400 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="0.00"
                  />
                  <span className="absolute right-8 top-1.5 text-slate-500 text-[10px] pointer-events-none">
                    ETB
                  </span>
                </div>

                {splits.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRail(idx)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded transition-colors cursor-pointer"
                    title="Remove Rail"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Electronic Txn Ref */}
              {split.rail !== "CASH" && split.rail !== "STORE_CREDIT" && (
                <input
                  type="text"
                  value={split.txnRef}
                  onChange={(e) => updateSplit(idx, "txnRef", e.target.value)}
                  placeholder="Enter SMS confirmation or reference number (e.g., CI492819 / FT2610...)"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-[11px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              )}
            </div>
          ))}
        </div>

        {/* Add Split Button */}
        {remainingDue > 0 && (
          <button
            type="button"
            onClick={addRail}
            className="w-full py-2 border border-dashed border-slate-700 hover:border-indigo-500 text-slate-400 hover:text-indigo-300 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-slate-950/40"
          >
            <Plus className="w-3.5 h-3.5" /> Add Split Rail ({remainingDue.toFixed(2)} ETB Remaining)
          </button>
        )}

        {/* Reconciliation Summary Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-mono space-y-1.5">
          <div className="flex justify-between text-slate-400">
            <span>Allocated Tender:</span>
            <span className="text-slate-200 font-semibold">{allocatedTotal.toFixed(2)} ETB</span>
          </div>
          <div className="flex justify-between font-bold">
            <span className="font-sans text-slate-300">Balance Status:</span>
            {isBalanced ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Fully Reconciled
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {remainingDue > 0
                  ? `${remainingDue.toFixed(2)} ETB Unpaid`
                  : `${Math.abs(remainingDue).toFixed(2)} ETB Overpaid`}
              </span>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="mt-5 flex items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            disabled={!isBalanced}
            onClick={() => onFinalize(splits)}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Commit Multi-Rail Settlement & Print
          </button>
        </div>
      </div>
    </div>
  );
}
