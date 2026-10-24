'use client';

import React, { useState, useMemo } from "react";
import { 
  RotateCcw, 
  PackageCheck, 
  PackageX, 
  Receipt, 
  Search, 
  CheckCircle2, 
  Banknote, 
  Smartphone, 
  FileText,
  Sun,
  Moon,
  AlertCircle
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { formatETB } from "@/lib/formatters";
import { ProcessReturnSchema, ProcessReturnInput } from "@/lib/validations/return";

interface ReturnLog {
  id: string;
  originalReceipt: string;
  timestamp: string;
  customer: string;
  itemName: string;
  sku: string;
  reason: "CUSTOMER_REGRET" | "DEFECTIVE_HARDWARE" | "WRONG_SPECIFICATION";
  refundAmount: number;
  disposition: "RESTOCKED_TO_SHELF" | "QUARANTINE_DEFECTIVE" | "SUPPLIER_RMA_PENDING";
}

const DEFAULT_PAST_RETURNS: ReturnLog[] = [
  {
    id: "RET-2026-0012",
    originalReceipt: "REC-2026-0075",
    timestamp: "11 Oct 2026, 05:10 pm",
    customer: "Rahel Mehari",
    itemName: "Oraimo FreePods 4 ANC TWS Wireless Earbuds",
    sku: "AUD-ORA-FP4",
    reason: "CUSTOMER_REGRET",
    refundAmount: 2950.0,
    disposition: "RESTOCKED_TO_SHELF",
  },
  {
    id: "RET-2026-0011",
    originalReceipt: "REC-2026-0062",
    timestamp: "09 Oct 2026, 02:20 pm",
    customer: "Dr. Henok Tadesse",
    itemName: "LDNIO 32W Dual QC3.0 Fast Car Charger with LED",
    sku: "CHG-LDN-32W",
    reason: "DEFECTIVE_HARDWARE",
    refundAmount: 750.0,
    disposition: "QUARANTINE_DEFECTIVE",
  },
];

export default function ReturnsAndRefundsView() {
  const { returns: appReturns, sales, processReturn, addToast } = useApp();
  const { user: authUser } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  // Search filter for history
  const [searchTerm, setSearchTerm] = useState("");

  // Intake Form State
  const defaultReceipt = sales.length > 0 ? sales[0].receiptNumber : "REC-2026-0082";
  const [selectedReceipt, setSelectedReceipt] = useState(defaultReceipt);
  const [selectedProductSku, setSelectedProductSku] = useState<string>("");
  const [returnQty, setReturnQty] = useState<number>(1);
  const [reason, setReason] = useState<"DEFECTIVE_HARDWARE" | "CUSTOMER_REGRET" | "WRONG_SPECIFICATION">("DEFECTIVE_HARDWARE");
  const [disposition, setDisposition] = useState<"QUARANTINE_DEFECTIVE" | "RESTOCKED_TO_SHELF">("QUARANTINE_DEFECTIVE");
  const [payoutMode, setPayoutMode] = useState<"CASH_DRAWER" | "TELEBIRR_REVERSAL" | "STORE_CREDIT">("CASH_DRAWER");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Dynamic receipt context loaded from sales ledger
  const matchedSale = useMemo(() => {
    return sales.find((s) => s.receiptNumber === selectedReceipt);
  }, [sales, selectedReceipt]);

  const activeLineItem = useMemo(() => {
    if (matchedSale && matchedSale.items.length > 0) {
      if (selectedProductSku) {
        const found = matchedSale.items.find((i) => i.sku === selectedProductSku || i.productId === selectedProductSku);
        if (found) return found;
      }
      return matchedSale.items[0];
    }
    // Fallback context item
    return {
      productId: "p-sam-45w",
      sku: "ADP-SAM-45W",
      name: "Samsung 45W Super Fast Type-C Adapter EP-T4510",
      unitPrice: 3600.0,
      quantity: 1,
      total: 3600.0,
      discount: 0,
      costPrice: 2500,
    };
  }, [matchedSale, selectedProductSku]);

  const receiptContext = useMemo(() => {
    if (matchedSale) {
      return {
        receiptId: matchedSale.receiptNumber,
        customer: matchedSale.customerName,
        originalDate: new Date(matchedSale.date).toLocaleString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        originalPayment: matchedSale.paymentMethod.toUpperCase().replace("_", " "),
        item: {
          sku: activeLineItem.sku,
          name: activeLineItem.name,
          soldPrice: activeLineItem.unitPrice,
          soldQty: activeLineItem.quantity,
          productId: activeLineItem.productId,
        },
      };
    }
    return {
      receiptId: "REC-2026-0082",
      customer: "Dr. Henok Tadesse",
      originalDate: "14 Oct 2026, 12:05 pm",
      originalPayment: "Cash",
      item: {
        sku: "ADP-SAM-45W",
        name: "Samsung 45W Super Fast Type-C Adapter EP-T4510",
        soldPrice: 3600.0,
        soldQty: 1,
        productId: "p-sam-45w",
      },
    };
  }, [matchedSale, activeLineItem]);

  const calculatedRefund = returnQty * receiptContext.item.soldPrice;

  // Combine AppContext returns with default logs
  const allReturns: ReturnLog[] = useMemo(() => {
    const dynamicLogs: ReturnLog[] = appReturns.map((r) => {
      const firstItem = r.items[0];
      const reasonMapping: Record<string, ReturnLog["reason"]> = {
        defective: "DEFECTIVE_HARDWARE",
        wrong_item: "WRONG_SPECIFICATION",
        customer_regret: "CUSTOMER_REGRET",
      };
      const dispMapping: Record<string, ReturnLog["disposition"]> = {
        restock: "RESTOCKED_TO_SHELF",
        quarantine: "QUARANTINE_DEFECTIVE",
        quarantine_damaged: "QUARANTINE_DEFECTIVE",
        write_off: "QUARANTINE_DEFECTIVE",
        discard: "QUARANTINE_DEFECTIVE",
      };

      const itemAction = firstItem?.action || (firstItem as any)?.disposition || "restock";

      return {
        id: r.returnNumber,
        originalReceipt: r.originalReceiptNumber,
        timestamp: new Date(r.date).toLocaleString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        customer: r.customerName,
        itemName: firstItem?.productName || "Electronics Accessory",
        sku: firstItem?.sku || "SKU-GEN",
        reason: reasonMapping[firstItem?.reason] || "DEFECTIVE_HARDWARE",
        refundAmount: r.totalRefundETB,
        disposition: dispMapping[itemAction] || "RESTOCKED_TO_SHELF",
      };
    });

    const existingIds = new Set(dynamicLogs.map((l) => l.id));
    const defaults = DEFAULT_PAST_RETURNS.filter((d) => !existingIds.has(d.id));
    return [...dynamicLogs, ...defaults];
  }, [appReturns]);

  const filteredReturns = useMemo(() => {
    return allReturns.filter((r) => {
      const matchSearch =
        searchTerm === "" ||
        r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.originalReceipt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.sku.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [allReturns, searchTerm]);

  // Aggregate KPI metrics
  const totalPayouts = useMemo(() => {
    return allReturns.reduce((sum, r) => sum + r.refundAmount, 0);
  }, [allReturns]);

  const restockedCount = useMemo(() => {
    return allReturns.filter((r) => r.disposition === "RESTOCKED_TO_SHELF").length;
  }, [allReturns]);

  const quarantinedCount = useMemo(() => {
    return allReturns.filter((r) => r.disposition === "QUARANTINE_DEFECTIVE").length;
  }, [allReturns]);

  // Handle Form Submission with Zod validation
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const payload: ProcessReturnInput = {
      originalReceiptId: selectedReceipt,
      productId: receiptContext.item.sku || receiptContext.item.productId,
      quantity: Number(returnQty),
      reason,
      disposition,
      payoutMode,
      inspectionNotes: inspectionNotes.trim() || undefined,
    };

    const validationResult = ProcessReturnSchema.safeParse(payload);
    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.issues.forEach((err) => {
        const field = err.path[0] as string;
        errors[field] = err.message;
      });
      setFormErrors(errors);
      addToast({
        title: "Validation Error",
        message: "Please correct the highlighted return fields.",
        type: "warning",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Map payout mode to AppContext method
      const refundMethodMap: Record<string, "cash" | "telebirr" | "credit_note"> = {
        CASH_DRAWER: "cash",
        TELEBIRR_REVERSAL: "telebirr",
        STORE_CREDIT: "credit_note",
      };

      const reasonMap: Record<string, 'defective' | 'wrong_item' | 'customer_regret' | 'warranty_claim'> = {
        DEFECTIVE_HARDWARE: "defective",
        CUSTOMER_REGRET: "customer_regret",
        WRONG_SPECIFICATION: "wrong_item",
      };

      const actionMap: Record<string, 'restock' | 'quarantine_damaged' | 'write_off'> = {
        RESTOCKED_TO_SHELF: "restock",
        QUARANTINE_DEFECTIVE: "quarantine_damaged",
      };

      const createdReturn = processReturn({
        originalReceiptNumber: receiptContext.receiptId,
        saleId: matchedSale?.id || "sale-default",
        customerName: receiptContext.customer,
        items: [
          {
            saleItemId: activeLineItem.productId || "item-1",
            productId: receiptContext.item.productId,
            productName: receiptContext.item.name,
            sku: receiptContext.item.sku,
            quantity: returnQty,
            unitPrice: receiptContext.item.soldPrice,
            refundAmount: calculatedRefund,
            reason: reasonMap[reason] || "defective",
            action: actionMap[disposition] || "restock",
          },
        ],
        totalRefundETB: calculatedRefund,
        refundMethod: refundMethodMap[payoutMode] || "cash",
        processedBy: authUser?.fullName || "Nasir Amme",
        notes: inspectionNotes || undefined,
      });

      setSuccessNotice(`Return #${createdReturn.returnNumber} processed. ${formatETB(calculatedRefund)} refunded via ${payoutMode.replace("_", " ")}.`);
      setInspectionNotes("");
      setReturnQty(1);

      addToast({
        title: "Return Processed Atomically",
        message: `${createdReturn.returnNumber} logged. Inventory & audit updated.`,
        type: "success",
      });

      setTimeout(() => setSuccessNotice(null), 6000);
    } catch (err: any) {
      addToast({
        title: "Processing Error",
        message: err.message || "Failed to process reverse settlement.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Returns, RMA & Reverse Logistics
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Process item returns, authorize cash/electronic drawer reversals, and route inventory dispositions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Theme Switcher */}
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

          <span className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg shadow-xs">
            Policy Window: <strong className="text-slate-900 dark:text-slate-200">48h Customer / 1-Yr Mfr Warranty</strong>
          </span>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400">Total Payouts (Current Cycle)</div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {totalPayouts.toLocaleString("en-US", { minimumFractionDigits: 2 })} <span className="text-xs text-slate-500 dark:text-slate-400">ETB</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">{allReturns.length} approved claims settled</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Restocked to Inventory</span>
            <PackageCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{restockedCount} pcs</div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">Returned to active store shelves</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Quarantined / Defective</span>
            <PackageX className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">{quarantinedCount} pcs</div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">Locked in warranty repair / RMA cage</div>
        </div>
      </div>

      {/* Main Dual Grid: Ledger Table (Left 7 cols) & Process Wizard (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Audited Returns History */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950/40">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Reverse Settlement Journal</h2>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Audited Records</span>
            </div>

            {/* Fast search filter */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search return or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 font-mono">
                <tr>
                  <th className="py-2.5 px-4">Return ID</th>
                  <th className="py-2.5 px-4">Item & Reason</th>
                  <th className="py-2.5 px-4">Disposition</th>
                  <th className="py-2.5 px-4 text-right">Refund (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No matching return claims found.
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-slate-200">
                        {ret.id}
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-sans">Ref: {ret.originalReceipt}</span>
                        <span className="block text-[10px] text-slate-400 dark:text-slate-500">{ret.timestamp}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 dark:text-slate-200">{ret.itemName}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{ret.sku}</div>
                        <span className="inline-block mt-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {ret.reason.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {ret.disposition === "RESTOCKED_TO_SHELF" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <PackageCheck className="w-3 h-3" /> Resellable
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                            <PackageX className="w-3 h-3" /> Defect Quarantine
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                        -{ret.refundAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Intake Return Wizard Form */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-xs">
          <div className="border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Intake New Return Claim
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Verify receipt validity and execute reverse inventory ledger adjustments.
            </p>
          </div>

          {successNotice && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successNotice}</span>
            </div>
          )}

          <form onSubmit={handleSubmitReturn} className="space-y-4">
            
            {/* Step 1: Receipt Selection */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Original Sale Voucher / Receipt <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedReceipt}
                onChange={(e) => {
                  setSelectedReceipt(e.target.value);
                  const sale = sales.find((s) => s.receiptNumber === e.target.value);
                  if (sale && sale.items.length > 0) {
                    setSelectedProductSku(sale.items[0].sku);
                  }
                }}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {sales.length > 0 ? (
                  sales.map((sale) => (
                    <option key={sale.id} value={sale.receiptNumber}>
                      {sale.receiptNumber} ({new Date(sale.date).toLocaleDateString()} • {formatETB(sale.grandTotal)} • {sale.customerName})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="REC-2026-0082">REC-2026-0082 (14 Oct 2026 • 3,600.00 ETB • Dr. Henok)</option>
                    <option value="REC-2026-0083">REC-2026-0083 (14 Oct 2026 • 5,000.00 ETB • Phone Clinic)</option>
                    <option value="REC-2026-0084">REC-2026-0084 (14 Oct 2026 • 2,450.00 ETB • Walk-in)</option>
                  </>
                )}
              </select>
            </div>

            {/* Context Verification Badge */}
            <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Customer:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-200">{receiptContext.customer}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Original Payment:</span>
                <span className="font-mono text-slate-900 dark:text-slate-200">{receiptContext.originalPayment}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800/80">
                <span className="truncate pr-2 font-medium text-slate-800 dark:text-slate-300">{receiptContext.item.name}</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-300 shrink-0 font-semibold">
                  {receiptContext.item.soldPrice.toFixed(2)} ETB
                </span>
              </div>
            </div>

            {/* Step 2: Return Quantity & Math */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Returning Qty <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={receiptContext.item.soldQty}
                  value={returnQty}
                  onChange={(e) => setReturnQty(Math.min(receiptContext.item.soldQty, Math.max(1, Number(e.target.value))))}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Authorized Refund</label>
                <div className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-mono font-bold text-rose-600 dark:text-rose-400 text-right">
                  {calculatedRefund.toFixed(2)} ETB
                </div>
              </div>
            </div>

            {/* Step 3: Technical Reason & Physical Disposition */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Claim Reason <span className="text-rose-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="DEFECTIVE_HARDWARE">Hardware Failure / Defective (Under Warranty)</option>
                <option value="CUSTOMER_REGRET">Customer Return / Regret (Unopened Box)</option>
                <option value="WRONG_SPECIFICATION">Incorrect SKU / Model Compatibility Error</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Warehouse Disposition Route <span className="text-rose-500">*</span>
              </label>
              <select
                value={disposition}
                onChange={(e) => setDisposition(e.target.value as any)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
              >
                <option value="QUARANTINE_DEFECTIVE">Quarantine Cage (Defective, Lock from POS Sales)</option>
                <option value="RESTOCKED_TO_SHELF">Restock to Active Shelf (+1 Inventory Balance)</option>
              </select>
            </div>

            {/* Step 4: Refund Payout Channel */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Settlement Payout Channel <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "CASH_DRAWER", label: "Cash Till", icon: Banknote },
                  { id: "TELEBIRR_REVERSAL", label: "telebirr", icon: Smartphone },
                  { id: "STORE_CREDIT", label: "Ledger Credit", icon: Receipt },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setPayoutMode(id as any)}
                    className={`p-2 rounded-lg border flex flex-col items-center gap-1 text-[11px] transition-colors cursor-pointer shadow-2xs ${
                      payoutMode === id
                        ? "bg-indigo-50 dark:bg-indigo-600/15 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold"
                        : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Inspection / Serial Notes */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Technician Inspection & Serial Notes</label>
              <textarea
                rows={2}
                placeholder="Serial number inspection, physical seal condition, or fault diagnosis..."
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none shadow-2xs"
              />
            </div>

            {/* Action Row */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {isSubmitting ? "Authorizing Reversal..." : "Execute Reverse Sale & Issue Refund"}
              </button>
            </div>
          </form>
        </div>

      </div>

    </div>
  );
}
