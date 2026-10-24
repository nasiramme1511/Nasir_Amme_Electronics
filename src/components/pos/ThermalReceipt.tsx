'use client';

import React, { useRef, useState } from "react";
import { Printer, Check, Copy, Download, Radio, ShieldCheck } from "lucide-react";

export interface ReceiptItem {
  name: string;
  sku: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface ReceiptData {
  storeName: string;
  storeCity: string;
  storeCountry: string;
  tin: string;
  tel: string;
  receiptNo: string;
  dateTime: string;
  cashierName: string;
  customerName: string;
  items: ReceiptItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  paymentMode: "telebirr" | "CBE Birr" | "Cash" | "Card" | string;
  returnPolicyDays: number;
  softwareCredit: string;
}

export const SAMPLE_RECEIPT: ReceiptData = {
  storeName: "Nasir Amme Electronics",
  storeCity: "Dire Dawa",
  storeCountry: "Ethiopia",
  tin: "DEMO-TIN-0049281734",
  tel: "+251 915 00 11 22",
  receiptNo: "REC-2026-5128",
  dateTime: "19 Oct 2026, 05:37 pm",
  cashierName: "Nasir Amme",
  customerName: "Walk-in Customer (General)",
  items: [
    {
      name: "Joyroom 3-in-1 Fast Charging Cable",
      sku: "CBL-OTG-3IN1",
      qty: 1,
      unitPrice: 900.0,
      total: 900.0,
    },
  ],
  subtotal: 900.0,
  vatRate: 0,
  vatAmount: 0.0,
  total: 900.0,
  paymentMode: "telebirr",
  returnPolicyDays: 3,
  softwareCredit: "Powered by Nasir Amme Electronics Retail System",
};

/**
 * Raw ESC/POS Command Generator (For Direct Thermal Drivers)
 * Generates binary byte stream conforming to Epson/Star ESC/POS standard protocols.
 */
export function generateEscPosBytes(data: ReceiptData): Uint8Array {
  const ESC = 0x1b;
  const GS = 0x1d;

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];

  const add = (bytes: number[]) => chunks.push(new Uint8Array(bytes));
  const addText = (text: string) => chunks.push(encoder.encode(text));

  // 1. Initialize printer
  add([ESC, 0x40]);

  // 2. Center Align Header
  add([ESC, 0x61, 0x01]);
  add([ESC, 0x21, 0x20]); // Double height/width
  addText(`${data.storeName}\n`);
  add([ESC, 0x21, 0x00]); // Reset font size
  addText(`${data.storeCity}, ${data.storeCountry}\n`);
  addText(`TIN: ${data.tin}\n`);
  addText(`Tel: ${data.tel}\n`);
  addText("------------------------------------------------\n");

  // 3. Left Align Body
  add([ESC, 0x61, 0x00]);
  addText(`Receipt No : ${data.receiptNo}\n`);
  addText(`Date       : ${data.dateTime}\n`);
  addText(`Cashier    : ${data.cashierName}\n`);
  addText(`Customer   : ${data.customerName}\n`);
  addText("------------------------------------------------\n");

  // 4. Items Table
  data.items.forEach((item) => {
    addText(`${item.name}\n`);
    addText(
      `  ${item.qty} x ${item.unitPrice.toFixed(2)} ETB`.padEnd(32) +
      `${item.total.toFixed(2)} ETB\n`
    );
  });
  addText("------------------------------------------------\n");

  // 5. Totals
  addText(`Subtotal:`.padEnd(32) + `${data.subtotal.toFixed(2)} ETB\n`);
  addText(`Tax (${data.vatRate}%):`.padEnd(32) + `${data.vatAmount.toFixed(2)} ETB\n`);
  add([ESC, 0x21, 0x10]); // Bold
  addText(`TOTAL:`.padEnd(30) + `${data.total.toFixed(2)} ETB\n`);
  add([ESC, 0x21, 0x00]); // Reset
  addText(`Payment Mode: ${data.paymentMode.toUpperCase()}\n`);
  addText("------------------------------------------------\n");

  // 6. Barcode (CODE128)
  add([ESC, 0x61, 0x01]); // Center
  add([GS, 0x6b, 0x49, data.receiptNo.length, ...encoder.encode(data.receiptNo)]);
  addText(`\n*${data.receiptNo}*\n\n`);

  // 7. Footer & Cut Paper
  addText("Thank you for shopping with us!\n");
  addText(`Exchange within ${data.returnPolicyDays} days with receipt.\n\n\n\n`);
  add([GS, 0x56, 0x41, 0x03]); // Partial Cut with 3-line feed

  // Combine into single buffer
  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

interface ThermalReceiptProps {
  data?: ReceiptData;
  initialWidth?: "80mm" | "58mm";
  showToolbar?: boolean;
}

export default function ThermalReceipt({
  data = SAMPLE_RECEIPT,
  initialWidth = "80mm",
  showToolbar = true,
}: ThermalReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [paperWidth, setPaperWidth] = useState<"80mm" | "58mm">(initialWidth);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const lines = [
      "================================================",
      data.storeName.toUpperCase(),
      `${data.storeCity}, ${data.storeCountry}`,
      `TIN: ${data.tin} | Tel: ${data.tel}`,
      "================================================",
      `Receipt No : ${data.receiptNo}`,
      `Date & Time: ${data.dateTime}`,
      `Cashier    : ${data.cashierName}`,
      `Customer   : ${data.customerName}`,
      "------------------------------------------------",
      "ITEMS:",
      ...data.items.map(
        (i) => `${i.name}\n  ${i.qty} x ${i.unitPrice.toFixed(2)} ETB = ${i.total.toFixed(2)} ETB`
      ),
      "------------------------------------------------",
      `Subtotal   : ${data.subtotal.toFixed(2)} ETB`,
      `VAT (${data.vatRate}%): ${data.vatAmount.toFixed(2)} ETB`,
      `TOTAL (ETB): ${data.total.toFixed(2)} ETB`,
      `Payment    : ${data.paymentMode.toUpperCase()}`,
      "================================================",
      `*${data.receiptNo}*`,
      "Thank you for shopping with us!",
      `Exchange within ${data.returnPolicyDays} days with valid receipt.`,
      data.softwareCredit,
      "================================================",
    ].join("\n");

    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadEscPos = () => {
    const rawBytes = generateEscPosBytes(data);
    const blob = new Blob([rawBytes.buffer as ArrayBuffer], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${data.receiptNo}-escpos.bin`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4 sm:p-6 bg-slate-950 text-slate-100 min-h-screen font-sans">
      
      {/* Control Toolbar (Strictly Hidden in Print) */}
      {showToolbar && (
        <div className="print:hidden flex flex-wrap items-center justify-between w-full max-w-[80mm] gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPaperWidth("80mm")}
              className={`px-2 py-1 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                paperWidth === "80mm"
                  ? "bg-indigo-600 text-white font-bold"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200"
              }`}
            >
              80mm Roll
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth("58mm")}
              className={`px-2 py-1 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                paperWidth === "58mm"
                  ? "bg-indigo-600 text-white font-bold"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200"
              }`}
            >
              58mm Roll
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyText}
              title="Copy receipt as plain text"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-xs border border-slate-800 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadEscPos}
              title="Download raw ESC/POS binary file (.bin) for thermal printer port 9100 or Bluetooth"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-xs border border-slate-800 transition-colors cursor-pointer"
            >
              {downloaded ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
              <span>ESC/POS</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>
      )}

      {/* Printable Receipt Canvas */}
      <div
        ref={receiptRef}
        id="thermal-receipt"
        className={`${
          paperWidth === "80mm" ? "w-[80mm] max-w-[80mm]" : "w-[58mm] max-w-[58mm]"
        } bg-white text-black p-4 font-mono text-[11px] leading-tight shadow-2xl rounded-sm print:shadow-none print:w-full print:m-0 print:p-2 border border-slate-200 select-none transition-all duration-200`}
      >
        {/* Store Header */}
        <div className="text-center space-y-0.5">
          <div className="text-sm font-black tracking-tight uppercase">
            {data.storeName}
          </div>
          <div className="text-[10px] text-gray-700">
            {data.storeCity}, {data.storeCountry}
          </div>
          <div className="text-[10px]">TIN: {data.tin}</div>
          <div className="text-[10px]">Tel: {data.tel}</div>
          <div className="text-[9px] font-bold tracking-widest text-gray-600 pt-1">
            RECEIPT PREVIEW • NON-FISCAL
          </div>
        </div>

        {/* Receipt Metadata Divider */}
        <div className="my-2 border-t border-dashed border-gray-400" />

        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between">
            <span className="font-bold">Receipt No:</span>
            <span>{data.receiptNo}</span>
          </div>
          <div className="flex justify-between">
            <span>Date & Time:</span>
            <span>{data.dateTime}</span>
          </div>
          <div className="flex justify-between">
            <span>Cashier:</span>
            <span>{data.cashierName}</span>
          </div>
          <div className="flex justify-between">
            <span>Customer:</span>
            <span className="truncate max-w-[130px]">{data.customerName}</span>
          </div>
        </div>

        {/* Items Table Divider */}
        <div className="my-2 border-t border-dashed border-gray-400" />

        {/* Line Items Header */}
        <div className="flex justify-between text-[10px] font-bold border-b border-black pb-0.5 mb-1.5">
          <span className="w-7/12">ITEM</span>
          <span className="w-2/12 text-center">QTY</span>
          <span className="w-3/12 text-right">TOTAL</span>
        </div>

        {/* Item Rows */}
        <div className="space-y-2">
          {data.items.map((item, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className="font-bold text-[10.5px] leading-tight">
                {item.name}
              </div>
              <div className="flex justify-between text-[10px] text-gray-700">
                <span className="font-mono text-[9px]">{item.sku}</span>
                <div className="flex justify-between w-5/12 text-right">
                  <span className="w-1/2 text-center">
                    {item.qty} x {item.unitPrice.toFixed(2)}
                  </span>
                  <span className="w-1/2 font-bold text-black">
                    {item.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Totals Section */}
        <div className="my-2 border-t border-dashed border-gray-400" />

        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{data.subtotal.toFixed(2)} ETB</span>
          </div>
          <div className="flex justify-between">
            <span>VAT / Tax ({data.vatRate}%):</span>
            <span>{data.vatAmount.toFixed(2)} ETB</span>
          </div>
          <div className="flex justify-between text-xs font-black pt-1 border-t border-black">
            <span>TOTAL (ETB):</span>
            <span>{data.total.toFixed(2)} ETB</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="font-bold">Payment Mode:</span>
            <span className="uppercase font-bold tracking-wider">
              {data.paymentMode}
            </span>
          </div>
        </div>

        {/* Barcode Strip */}
        <div className="my-3 text-center space-y-1">
          {/* High Precision Code128 Barcode Bar Simulation */}
          <div className="flex justify-center items-center h-8 gap-[1.5px] overflow-hidden px-4">
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
          <div className="text-[9px] tracking-widest font-mono">
            *{data.receiptNo}*
          </div>
        </div>

        {/* Footer Policy */}
        <div className="text-center text-[9px] space-y-0.5 border-t border-dashed border-gray-400 pt-2 text-gray-700">
          <p className="font-semibold text-black">
            Thank you for shopping with us!
          </p>
          <p>Exchange within {data.returnPolicyDays} days with valid receipt.</p>
          <p>Warranty terms apply to electronics with manufacturer seals.</p>
          <p className="text-[8px] text-gray-500 pt-1 uppercase">
            {data.softwareCredit}
          </p>
        </div>
      </div>
    </div>
  );
}
