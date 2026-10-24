'use client';

import React, { useRef } from "react";
import { Printer, Download, CheckCircle2, ShieldCheck, AlertTriangle } from "lucide-react";
import { formatETB } from "@/lib/formatters";

export interface DenominationCounts {
  note200: number;
  note100: number;
  note50: number;
  note10: number;
  note5: number;
  coins: number;
}

export interface ZReportData {
  storeName: string;
  branchName: string;
  storeAddress: string;
  tin: string;
  tel: string;
  sessionNumber: string;
  terminalId: string;
  cashierName: string;
  supervisorName: string;
  openedAt: string;
  closedAt: string;
  openingFloat: number;
  netCashSales: number;
  cashRefunds: number;
  expectedDrawerCash: number;
  physicalCountedCash: number;
  discrepancy: number;
  denominations: DenominationCounts;
  safeDropRecordCode: string;
  baselineFloatRetained: number;
  netSafeDropAmount: number;
  telebirrTotal?: number;
  cbeBirrTotal?: number;
  otherTotal?: number;
  notes?: string;
}

interface ZReportThermalSlipProps {
  data: ZReportData;
  showToolbar?: boolean;
}

export default function ZReportThermalSlip({ data, showToolbar = true }: ZReportThermalSlipProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const printContent = receiptRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=380,height=800");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Z-Report — ${data.sessionNumber}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 78mm;
              margin: 0 auto;
              padding: 10px 4px;
              color: #000;
              background: #fff;
              font-size: 11px;
              line-height: 1.35;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: bold; }
            .border-t { border-top: 1px dashed #000; }
            .border-b { border-bottom: 1px dashed #000; }
            .py-1 { padding-top: 3px; padding-bottom: 3px; }
            .my-2 { margin-top: 6px; margin-bottom: 6px; }
            .flex { display: flex; justify-content: space-between; }
            .signature-box { margin-top: 18px; padding-top: 6px; }
            .sig-line { border-bottom: 1px solid #000; width: 100%; height: 26px; margin-bottom: 4px; }
            @media print {
              body { width: 100%; margin: 0; padding: 4px; }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isCleared = Math.abs(data.discrepancy) < 0.01;
  const isShortage = data.discrepancy < -0.01;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {showToolbar && (
        <div className="flex items-center justify-between w-full max-w-sm px-2 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Dual-Signature Clearance</span>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Thermal Z-Slip</span>
          </button>
        </div>
      )}

      {/* 80mm ESC/POS Thermal Paper Preview */}
      <div
        ref={receiptRef}
        className="w-[320px] bg-white text-black p-4 rounded shadow-md font-mono text-[11px] leading-tight select-text border border-slate-200"
      >
        {/* Header */}
        <div className="text-center pb-2 border-b border-dashed border-black">
          <p className="font-bold text-sm tracking-wide">{data.storeName.toUpperCase()}</p>
          <p className="text-[10px] text-gray-700">{data.branchName} • {data.storeAddress}</p>
          <p className="text-[10px] text-gray-700">TIN: {data.tin} • TEL: {data.tel}</p>
          <p className="font-bold text-xs mt-1 tracking-wider">OFFICIAL Z-REPORT (SHIFT CLOSE)</p>
        </div>

        {/* Shift Metadata */}
        <div className="py-2 space-y-0.5 border-b border-dashed border-black text-[10.5px]">
          <div className="flex justify-between">
            <span className="text-gray-600">Shift Session:</span>
            <span className="font-bold">{data.sessionNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Terminal:</span>
            <span>{data.terminalId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Active Cashier:</span>
            <span className="font-bold">{data.cashierName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Supervisor:</span>
            <span>{data.supervisorName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Shift Opened:</span>
            <span>{data.openedAt}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Shift Closed:</span>
            <span>{data.closedAt}</span>
          </div>
        </div>

        {/* Cash Drawer Reconciliation */}
        <div className="py-2 space-y-1 border-b border-dashed border-black">
          <p className="font-bold text-[10px] tracking-wider text-gray-700 uppercase">CASH RECONCILIATION AUDIT</p>
          <div className="flex justify-between">
            <span>(+) Opening Cash Float:</span>
            <span>{formatETB(data.openingFloat)}</span>
          </div>
          <div className="flex justify-between">
            <span>(+) Net Cash Sales:</span>
            <span>{formatETB(data.netCashSales)}</span>
          </div>
          {data.cashRefunds > 0 && (
            <div className="flex justify-between text-gray-700">
              <span>(-) Cash Refunds/Voids:</span>
              <span>-{formatETB(data.cashRefunds)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1 border-t border-dotted border-black font-bold">
            <span>(=) Expected in Drawer:</span>
            <span>{formatETB(data.expectedDrawerCash)}</span>
          </div>
          <div className="flex justify-between font-bold text-xs">
            <span>(★) Physical Counted Cash:</span>
            <span>{formatETB(data.physicalCountedCash)}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-dashed border-black font-bold text-xs">
            <span>DRAWER VARIANCE:</span>
            <span className={isCleared ? "" : isShortage ? "text-red-700" : "text-amber-700"}>
              {data.discrepancy > 0 ? "+" : ""}{formatETB(data.discrepancy)}
            </span>
          </div>

          {/* Clearance Notice */}
          <div className="mt-2 p-1.5 text-center text-[10px] font-bold border border-black">
            {isCleared ? (
              <p>[ ✓ ] CLEARED IN FULL — ZERO THEFT / ZERO VARIANCE</p>
            ) : isShortage ? (
              <p>[ ! ] SHORTAGE RECORDED — RECONCILE BEFORE PAYROLL</p>
            ) : (
              <p>[ + ] OVERAGE RECORDED — CREDITED TO STORE RESERVE</p>
            )}
          </div>
        </div>

        {/* Physical Denominations Breakdown */}
        <div className="py-2 border-b border-dashed border-black text-[10px]">
          <p className="font-bold tracking-wider text-gray-700 uppercase mb-1">PHYSICAL DENOMINATION COUNT</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            <div className="flex justify-between">
              <span>200 ETB x {data.denominations.note200}:</span>
              <span>{formatETB(data.denominations.note200 * 200)}</span>
            </div>
            <div className="flex justify-between">
              <span>100 ETB x {data.denominations.note100}:</span>
              <span>{formatETB(data.denominations.note100 * 100)}</span>
            </div>
            <div className="flex justify-between">
              <span>50 ETB x {data.denominations.note50}:</span>
              <span>{formatETB(data.denominations.note50 * 50)}</span>
            </div>
            <div className="flex justify-between">
              <span>10 ETB x {data.denominations.note10}:</span>
              <span>{formatETB(data.denominations.note10 * 10)}</span>
            </div>
            <div className="flex justify-between">
              <span>5 ETB x {data.denominations.note5}:</span>
              <span>{formatETB(data.denominations.note5 * 5)}</span>
            </div>
            <div className="flex justify-between">
              <span>Coins / 1 ETB:</span>
              <span>{formatETB(data.denominations.coins)}</span>
            </div>
          </div>
        </div>

        {/* Cash Safe Drop Handover */}
        <div className="py-2 border-b border-dashed border-black text-[10.5px]">
          <p className="font-bold text-[10px] tracking-wider text-gray-700 uppercase">CASH SAFE DROP HANDOVER</p>
          <div className="flex justify-between">
            <span className="text-gray-600">Safe Drop Record:</span>
            <span className="font-bold">{data.safeDropRecordCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Retained in Till #01:</span>
            <span>{formatETB(data.baselineFloatRetained)}</span>
          </div>
          <div className="flex justify-between font-bold text-xs pt-0.5">
            <span>Transferred to Safe:</span>
            <span>{formatETB(data.netSafeDropAmount)}</span>
          </div>
          <p className="text-[9.5px] text-gray-600 mt-0.5">Destination: Main Branch Drop Safe (Vault DD-01)</p>
        </div>

        {/* Multi-Rail Electronic Revenue */}
        {(data.telebirrTotal || data.cbeBirrTotal || data.otherTotal) ? (
          <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
            <p className="font-bold tracking-wider text-gray-700 uppercase">ELECTRONIC REVENUE AUDIT</p>
            {data.telebirrTotal ? (
              <div className="flex justify-between">
                <span>telebirr Settled:</span>
                <span>{formatETB(data.telebirrTotal)}</span>
              </div>
            ) : null}
            {data.cbeBirrTotal ? (
              <div className="flex justify-between">
                <span>CBE Birr Settled:</span>
                <span>{formatETB(data.cbeBirrTotal)}</span>
              </div>
            ) : null}
            {data.otherTotal ? (
              <div className="flex justify-between">
                <span>Bank / Credit:</span>
                <span>{formatETB(data.otherTotal)}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Dual-Signature Handover Clearance Block */}
        <div className="pt-3 pb-1 space-y-4">
          <div className="signature-box">
            <p className="text-[9.5px] leading-tight text-gray-700">
              CASHIER CERTIFICATION:<br />
              I certify that physical counts and safe drop amounts above are true, complete, and reconciled without omission.
            </p>
            <div className="sig-line border-b border-black h-6 w-full my-1"></div>
            <div className="flex justify-between text-[10px]">
              <span>Cashier: <strong>{data.cashierName}</strong></span>
              <span>Date: {data.closedAt.split(',')[0]}</span>
            </div>
          </div>

          <div className="signature-box">
            <p className="text-[9.5px] leading-tight text-gray-700">
              SUPERVISING MANAGER / ADMIN CLEARANCE:<br />
              Shift inspected, zero-theft clearance verified, and cash drop accepted into store safe.
            </p>
            <div className="sig-line border-b border-black h-6 w-full my-1"></div>
            <div className="flex justify-between text-[10px]">
              <span>Manager: <strong>{data.supervisorName}</strong></span>
              <span>Date: {data.closedAt.split(',')[0]}</span>
            </div>
          </div>

          <div className="text-center pt-2 text-[9px] text-gray-500 border-t border-dotted border-black">
            <p>Nasir Amme Electronics Retail System • Dire Dawa</p>
            <p>Immutable Audit Record ID: {data.sessionNumber}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
