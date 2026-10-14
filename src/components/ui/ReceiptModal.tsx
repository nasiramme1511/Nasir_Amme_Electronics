'use client';

import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Sale } from '@/types';
import { formatETB, formatDate } from '@/lib/formatters';
import { useApp } from '@/context/AppContext';
import { Printer, Copy, Check, Store } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  isOpen,
  onClose,
}) => {
  const { settings, addToast } = useApp();
  const [copied, setCopied] = useState(false);

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const textReceipt = `
========================================
       ${settings.shopName.toUpperCase()}
   Dire Dawa, Ethiopia (Near B-Capital Hotel)
   TIN: ${settings.tinNumber} | Tel: ${settings.phonePrimary}
========================================
Receipt: ${sale.receiptNumber}
Date:    ${formatDate(sale.date)}
Cashier: ${sale.cashierName}
Customer:${sale.customerName} (${sale.customerType.toUpperCase()})
----------------------------------------
ITEMS:
${sale.items
  .map(
    (item) =>
      `${item.quantity}x ${item.name}\n   @ ${formatETB(item.unitPrice)} = ${formatETB(item.total)}`
  )
  .join('\n')}
----------------------------------------
Subtotal:    ${formatETB(sale.subtotal)}
Discount:   -${formatETB(sale.discount)}
Tax (0%):    ${formatETB(sale.tax)}
TOTAL:       ${formatETB(sale.grandTotal)}
----------------------------------------
Payment:     ${sale.paymentMethod.toUpperCase()}
${sale.paymentReference ? `Ref / Tx:   ${sale.paymentReference}` : ''}
${sale.amountTendered ? `Tendered:   ${formatETB(sale.amountTendered)}\nChange:     ${formatETB(sale.changeGiven || 0)}` : ''}
========================================
* DEMO RECEIPT - NASIR AMME ELECTRONICS *
${settings.receiptFooter}
========================================
`;
    navigator.clipboard.writeText(textReceipt.trim());
    setCopied(true);
    addToast({
      type: 'info',
      title: 'Receipt Copied',
      message: 'Receipt text copied to your clipboard.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-[#D9A441]" />
          <span>Receipt Preview</span>
          <span className="text-xs font-mono font-normal px-2 py-0.5 bg-slate-100 rounded text-slate-600 border">
            {sale.receiptNumber}
          </span>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            leftIcon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          >
            {copied ? 'Copied' : 'Copy Text'}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Done
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="w-4 h-4" />}
            >
              Print Receipt
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col items-center">
        {/* Printable Thermal Receipt Box */}
        <div
          id="printable-receipt"
          className="w-full max-w-sm bg-white p-6 rounded-xl border border-slate-200 shadow-xs font-mono text-xs text-slate-800"
        >
          {/* Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-300">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#101827] text-[#D9A441] mb-2 font-bold text-base">
              NA
            </div>
            <h2 className="text-sm font-bold tracking-wider text-slate-900 uppercase">
              {settings.shopName}
            </h2>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Dire Dawa, Ethiopia • Near B-Capital Hotel
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              TIN: {settings.tinNumber} (Simulated) | Tel: {settings.phonePrimary}
            </p>
            <div className="mt-2 inline-block px-2.5 py-0.5 bg-amber-50 text-[#93660a] border border-amber-200 rounded text-[10px] font-sans font-semibold">
              UI Demonstration Receipt • Non-Fiscal
            </div>
          </div>

          {/* Meta Info */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Receipt No:</span>
              <span className="font-semibold text-slate-900">{sale.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date & Time:</span>
              <span>{formatDate(sale.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span>{sale.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-medium">{sale.customerName}</span>
            </div>
          </div>

          {/* Items */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="pb-1 font-semibold">Item</th>
                  <th className="pb-1 text-center font-semibold">Qty</th>
                  <th className="pb-1 text-right font-semibold">Price</th>
                  <th className="pb-1 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item, idx) => (
                  <tr key={idx} className="py-1">
                    <td className="py-1.5 pr-1">
                      <div className="font-medium text-slate-900 leading-tight">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-400">{item.sku}</div>
                    </td>
                    <td className="py-1.5 text-center text-slate-700">{item.quantity}</td>
                    <td className="py-1.5 text-right text-slate-700">
                      {formatETB(item.unitPrice)}
                    </td>
                    <td className="py-1.5 text-right font-semibold text-slate-900">
                      {formatETB(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{formatETB(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount applied:</span>
                <span>-{formatETB(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>VAT / Tax (0% Exempt):</span>
              <span>{formatETB(sale.tax)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>TOTAL (ETB):</span>
              <span className="text-base text-[#101827]">{formatETB(sale.grandTotal)}</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Mode:</span>
              <span className="font-semibold uppercase text-slate-800">
                {sale.paymentMethod.replace('_', ' ')}
              </span>
            </div>
            {sale.paymentReference && (
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction Ref:</span>
                <span className="font-mono text-slate-800">{sale.paymentReference}</span>
              </div>
            )}
            {sale.amountTendered !== undefined && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Tendered:</span>
                  <span>{formatETB(sale.amountTendered)}</span>
                </div>
                <div className="flex justify-between font-semibold text-[#16845B]">
                  <span>Change Given:</span>
                  <span>{formatETB(sale.changeGiven || 0)}</span>
                </div>
              </>
            )}
          </div>

          {/* Footer Barcode Demo & Message */}
          <div className="pt-4 text-center text-[10px] text-slate-500 space-y-2">
            <div className="flex flex-col items-center justify-center">
              {/* Simulated thermal barcode pattern */}
              <div className="h-9 w-44 bg-[repeating-linear-gradient(90deg,#101827_0px,#101827_2px,transparent_2px,transparent_4px,#101827_4px,#101827_7px,transparent_7px,transparent_9px)] my-1" />
              <span className="font-mono text-[9px] tracking-widest text-slate-400">
                *{sale.receiptNumber}*
              </span>
            </div>
            <p className="whitespace-pre-line leading-relaxed text-slate-600 font-sans">
              {settings.receiptFooter}
            </p>
            <p className="text-[9px] text-slate-400 font-sans">
              Powered by Nasir Amme Electronics Retail System
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
