'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Sale } from '@/types';
import { formatETB, formatDate } from '@/lib/formatters';
import { useApp } from '@/context/AppContext';
import { Printer, Copy, Check, Store, Download } from 'lucide-react';
import { ReceiptData, generateEscPosBytes } from '@/components/pos/ThermalReceipt';

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
  const [downloaded, setDownloaded] = useState(false);
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  const receiptData: ReceiptData | null = useMemo(() => {
    if (!sale) return null;
    return {
      storeName: settings.shopName || "Nasir Amme Electronics",
      storeCity: settings.city || "Dire Dawa",
      storeCountry: "Ethiopia",
      tin: settings.tinNumber || "DEMO-TIN-0049281734",
      tel: settings.phonePrimary || "+251 915 00 11 22",
      receiptNo: sale.receiptNumber,
      dateTime: formatDate(sale.date),
      cashierName: sale.cashierName,
      customerName: `${sale.customerName} (${sale.customerType.toUpperCase()})`,
      items: sale.items.map((i) => ({
        name: i.name,
        sku: i.sku,
        qty: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
      })),
      subtotal: sale.subtotal,
      vatRate: settings.isTaxEnabled ? settings.taxRate : 0,
      vatAmount: sale.tax,
      total: sale.grandTotal,
      paymentMode: sale.paymentMethod,
      returnPolicyDays: 3,
      softwareCredit: "Powered by Nasir Amme Electronics Retail System",
    };
  }, [sale, settings]);

  if (!sale || !receiptData) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const textReceipt = `
========================================
       ${receiptData.storeName.toUpperCase()}
   ${receiptData.storeCity}, ${receiptData.storeCountry}
   TIN: ${receiptData.tin} | Tel: ${receiptData.tel}
========================================
Receipt: ${receiptData.receiptNo}
Date:    ${receiptData.dateTime}
Cashier: ${receiptData.cashierName}
Customer:${receiptData.customerName}
----------------------------------------
ITEMS:
${receiptData.items
  .map(
    (item) =>
      `${item.qty}x ${item.name}\n   @ ${formatETB(item.unitPrice)} = ${formatETB(item.total)}`
  )
  .join('\n')}
----------------------------------------
Subtotal:    ${formatETB(receiptData.subtotal)}
Tax (${receiptData.vatRate}%):    ${formatETB(receiptData.vatAmount)}
TOTAL:       ${formatETB(receiptData.total)}
----------------------------------------
Payment:     ${receiptData.paymentMode.toUpperCase()}
${sale.paymentReference ? `Ref / Tx:   ${sale.paymentReference}` : ''}
${sale.amountTendered ? `Tendered:   ${formatETB(sale.amountTendered)}\nChange:     ${formatETB(sale.changeGiven || 0)}` : ''}
========================================
* ${receiptData.receiptNo} *
Thank you for shopping with us!
Exchange within ${receiptData.returnPolicyDays} days with valid receipt.
${receiptData.softwareCredit}
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

  const handleDownloadEscPos = () => {
    const rawBytes = generateEscPosBytes(receiptData);
    const blob = new Blob([rawBytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${receiptData.receiptNo}-escpos.bin`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    addToast({
      type: 'success',
      title: 'ESC/POS Binary Ready',
      message: `Downloaded raw command stream for ${receiptData.receiptNo}`,
    });
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-500" />
            <span className="font-semibold text-slate-900 dark:text-white">Thermal Receipt</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {receiptData.receiptNo}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setPaperWidth('80mm')}
              className={`px-2 py-0.5 rounded transition-colors ${
                paperWidth === '80mm'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              80mm
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth('58mm')}
              className={`px-2 py-0.5 rounded transition-colors ${
                paperWidth === '58mm'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              58mm
            </button>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              leftIcon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'Copied' : 'Copy Text'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadEscPos}
              leftIcon={downloaded ? <Check className="w-4 h-4 text-emerald-600" /> : <Download className="w-4 h-4" />}
              title="Download raw ESC/POS binary file (.bin)"
            >
              {downloaded ? 'Saved' : 'ESC/POS'}
            </Button>
          </div>

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
          id="thermal-receipt"
          className={`${
            paperWidth === '80mm' ? 'w-[80mm] max-w-[80mm]' : 'w-[58mm] max-w-[58mm]'
          } bg-white text-black p-4 font-mono text-[11px] leading-tight shadow-lg rounded-sm print:shadow-none print:w-full print:m-0 print:p-2 border border-slate-200 select-none transition-all duration-200`}
        >
          {/* Header */}
          <div className="text-center space-y-0.5">
            <div className="text-sm font-black tracking-tight uppercase text-black">
              {receiptData.storeName}
            </div>
            <div className="text-[10px] text-gray-700">
              {receiptData.storeCity}, {receiptData.storeCountry}
            </div>
            <div className="text-[10px] text-gray-700">TIN: {receiptData.tin}</div>
            <div className="text-[10px] text-gray-700">Tel: {receiptData.tel}</div>
            <div className="text-[9px] font-bold tracking-widest text-gray-600 pt-1">
              RECEIPT PREVIEW • NON-FISCAL
            </div>
          </div>

          {/* Receipt Metadata Divider */}
          <div className="my-2 border-t border-dashed border-gray-400" />

          {/* Meta Info */}
          <div className="space-y-1 text-[10px] text-black">
            <div className="flex justify-between">
              <span className="font-bold">Receipt No:</span>
              <span className="font-semibold">{receiptData.receiptNo}</span>
            </div>
            <div className="flex justify-between">
              <span>Date & Time:</span>
              <span>{receiptData.dateTime}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{receiptData.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer:</span>
              <span className="truncate max-w-[130px]">{receiptData.customerName}</span>
            </div>
          </div>

          {/* Items Table Divider */}
          <div className="my-2 border-t border-dashed border-gray-400" />

          {/* Line Items Header */}
          <div className="flex justify-between text-[10px] font-bold border-b border-black pb-0.5 mb-1.5 text-black">
            <span className="w-7/12">ITEM</span>
            <span className="w-2/12 text-center">QTY</span>
            <span className="w-3/12 text-right">TOTAL</span>
          </div>

          {/* Item Rows */}
          <div className="space-y-2">
            {receiptData.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="font-bold text-[10.5px] leading-tight text-black">
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

          <div className="space-y-1 text-[10px] text-black">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{receiptData.subtotal.toFixed(2)} ETB</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span>-{sale.discount.toFixed(2)} ETB</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>VAT / Tax ({receiptData.vatRate}%):</span>
              <span>{receiptData.vatAmount.toFixed(2)} ETB</span>
            </div>
            <div className="flex justify-between text-xs font-black pt-1 border-t border-black text-black">
              <span>TOTAL (ETB):</span>
              <span>{receiptData.total.toFixed(2)} ETB</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="font-bold">Payment Mode:</span>
              <span className="uppercase font-bold tracking-wider">
                {receiptData.paymentMode}
              </span>
            </div>
            {sale.paymentReference && (
              <div className="flex justify-between text-gray-700">
                <span>Ref / Tx:</span>
                <span className="font-mono">{sale.paymentReference}</span>
              </div>
            )}
            {sale.amountTendered !== undefined && (
              <>
                <div className="flex justify-between text-gray-700">
                  <span>Tendered:</span>
                  <span>{formatETB(sale.amountTendered)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700">
                  <span>Change:</span>
                  <span>{formatETB(sale.changeGiven || 0)}</span>
                </div>
              </>
            )}
          </div>

          {/* Barcode Strip */}
          <div className="my-3 text-center space-y-1">
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
            <div className="text-[9px] tracking-widest font-mono text-black">
              *{receiptData.receiptNo}*
            </div>
          </div>

          {/* Footer Policy */}
          <div className="text-center text-[9px] space-y-0.5 border-t border-dashed border-gray-400 pt-2 text-gray-700">
            <p className="font-semibold text-black">
              Thank you for shopping with us!
            </p>
            <p>Exchange within {receiptData.returnPolicyDays} days with valid receipt.</p>
            <p>Warranty terms apply to electronics with manufacturer seals.</p>
            <p className="text-[8px] text-gray-500 pt-1 uppercase">
              {receiptData.softwareCredit}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};
