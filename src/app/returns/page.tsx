'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { SaleReturn, ReturnItem } from '@/types';
import {
  Plus,
  Search,
  Download,
  Eye,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { formatETB, formatDate, formatDateShort } from '@/lib/formatters';
import { exportToCSV } from '@/lib/export';

export default function ReturnsPage() {
  const { returns, sales, processReturn, addToast } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReason, setSelectedReason] = useState<string>('all');
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [inspectingReturn, setInspectingReturn] = useState<SaleReturn | null>(null);

  // Return Processing Form State
  const [selectedReceiptNum, setSelectedReceiptNum] = useState<string>(
    sales[0]?.receiptNumber || ''
  );
  const [returnReason, setReturnReason] = useState<
    'defective' | 'wrong_item' | 'customer_regret' | 'warranty_claim'
  >('defective');
  const [returnAction, setReturnAction] = useState<'restock' | 'quarantine_damaged'>('restock');
  const [refundMethod, setRefundMethod] = useState<'cash' | 'telebirr' | 'credit_note'>('cash');
  const [returnQty, setReturnQty] = useState<number>(1);
  const [selectedProductId, setSelectedProductId] = useState<string>(
    sales[0]?.items[0]?.productId || ''
  );
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Find selected sale
  const targetSale = useMemo(() => {
    return sales.find((s) => s.receiptNumber === selectedReceiptNum);
  }, [sales, selectedReceiptNum]);

  const targetLineItem = useMemo(() => {
    const item = targetSale?.items.find((i) => i.productId === selectedProductId);
    return item || targetSale?.items[0];
  }, [targetSale, selectedProductId]);

  // Cumulative returns analysis for selected line item
  const previouslyReturnedQty = useMemo(() => {
    if (!targetSale || !targetLineItem) return 0;
    return returns
      .filter((r) => r.originalReceiptNumber === targetSale.receiptNumber || r.saleId === targetSale.id)
      .flatMap((r) => r.items)
      .filter((item) => item.productId === targetLineItem.productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  }, [returns, targetSale, targetLineItem]);

  const remainingReturnableQty = useMemo(() => {
    if (!targetLineItem) return 0;
    return Math.max(0, targetLineItem.quantity - previouslyReturnedQty);
  }, [targetLineItem, previouslyReturnedQty]);

  // Filtered Returns
  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const matchSearch =
        searchTerm === '' ||
        r.returnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.originalReceiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.customerName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchReason =
        selectedReason === 'all' ||
        r.items.some((i) => i.reason === selectedReason);

      return matchSearch && matchReason;
    });
  }, [returns, searchTerm, selectedReason]);

  // Total refunded calculation
  const totalRefundsAmount = useMemo(() => {
    return filteredReturns.reduce((sum, r) => sum + r.totalRefundETB, 0);
  }, [filteredReturns]);

  // Process Return Submit
  const handleProcessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (isSubmitting) return;

    if (!targetSale || !targetLineItem) {
      setFormError('Please select a valid original sale and product line.');
      return;
    }

    if (remainingReturnableQty <= 0) {
      setFormError(
        `All ${targetLineItem.quantity} unit(s) of "${targetLineItem.name}" from receipt ${targetSale.receiptNumber} have already been returned and refunded.`
      );
      return;
    }

    // Require positive whole units (electronics accessories are sold only in whole pieces)
    if (!returnQty || returnQty <= 0 || !Number.isInteger(returnQty)) {
      setFormError('Return quantity must be a positive whole integer (minimum 1 unit).');
      return;
    }

    if (returnQty > remainingReturnableQty) {
      setFormError(
        `Invalid quantity! Original quantity was ${targetLineItem.quantity}, previously returned: ${previouslyReturnedQty}. Maximum returnable now: ${remainingReturnableQty} unit(s).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const calculatedRefund = returnQty * targetLineItem.unitPrice;

      const returnItem: ReturnItem = {
        productId: targetLineItem.productId,
        productName: targetLineItem.name,
        sku: targetLineItem.sku,
        saleItemId: targetLineItem.productId,
        quantity: returnQty,
        unitPrice: targetLineItem.unitPrice,
        refundAmount: calculatedRefund,
        reason: returnReason,
        action: returnAction,
      };

      processReturn({
        originalReceiptNumber: targetSale.receiptNumber,
        saleId: targetSale.id,
        customerName: targetSale.customerName,
        items: [returnItem],
        totalRefundETB: calculatedRefund,
        refundMethod,
        processedBy: 'Tigist Alem (Cashier)',
        notes: returnNotes.trim() || undefined,
      });

      setIsProcessModalOpen(false);
      setReturnNotes('');
      setReturnQty(1);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Return Number',
      'Original Receipt',
      'Date & Time',
      'Customer',
      'Refund Amount (ETB)',
      'Refund Method',
      'Processed By',
      'Status',
    ];

    const rows = filteredReturns.map((r) => [
      r.returnNumber,
      r.originalReceiptNumber,
      formatDate(r.date),
      r.customerName,
      r.totalRefundETB,
      r.refundMethod.toUpperCase(),
      r.processedBy,
      r.status.toUpperCase(),
    ]);

    exportToCSV('nasir_amme_returns_refunds', headers, rows);
    addToast({
      type: 'info',
      title: 'Returns Exported',
      message: `${filteredReturns.length} return records exported to CSV.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Returns & Customer Refunds
            </h1>
            <Badge variant="accent" size="sm">
              {returns.length} Records
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Handle customer warranty exchanges, restocking unopened accessories, and refund payouts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>

          <Button
            variant="accent"
            size="sm"
            onClick={() => setIsProcessModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Process Return
          </Button>
        </div>
      </div>

      {/* Compliance & Policy Callout */}
      <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-950">
        <HelpCircle className="w-5 h-5 text-[#D9A441] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Dire Dawa Shop Policy (3-Day Exchange Window):</strong> Unopened products in
          original packaging may be restocked to inventory. Defective electronics under warranty are
          quarantined for supplier claim returns. Client-side validation ensures return quantities
          cannot exceed original sales receipts. Authoritative double-entry accounting records will
          be posted to the server in later milestones.
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-[#101827]">
          <span className="text-xs text-slate-500 font-semibold uppercase">
            Total Refunded Amount
          </span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {formatETB(totalRefundsAmount)}
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <span className="text-xs text-slate-500 font-semibold uppercase">
            Restocked Units
          </span>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            {returns.reduce(
              (sum, r) =>
                sum +
                r.items
                  .filter((i) => i.action === 'restock')
                  .reduce((iSum, item) => iSum + item.quantity, 0),
              0
            )}{' '}
            pcs
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500">
          <span className="text-xs text-slate-500 font-semibold uppercase">
            Quarantined / Defective
          </span>
          <div className="text-xl font-bold text-rose-700 mt-1">
            {returns.reduce(
              (sum, r) =>
                sum +
                r.items
                  .filter((i) => i.action === 'quarantine_damaged')
                  .reduce((iSum, item) => iSum + item.quantity, 0),
              0
            )}{' '}
            pcs
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by return #, receipt #, or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#D9A441] bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              <option value="all">All Return Reasons</option>
              <option value="defective">Defective / Malfunctioning</option>
              <option value="customer_regret">Customer Regret (Unopened)</option>
              <option value="wrong_item">Wrong Item Selected</option>
              <option value="warranty_claim">Warranty Replacement</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Returns Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-600 text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Return #</th>
                <th className="py-3 px-4">Original Receipt</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Item Returned</th>
                <th className="py-3 px-4 text-right">Refund (ETB)</th>
                <th className="py-3 px-4 text-center">Action Taken</th>
                <th className="py-3 px-4 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReturns.map((ret) => {
                const primaryItem = ret.items[0];

                return (
                  <tr key={ret.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-xs">
                      {ret.returnNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-blue-600">
                      {ret.originalReceiptNumber}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {formatDate(ret.date)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 text-xs">
                      {ret.customerName}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-semibold text-slate-900 line-clamp-1 max-w-xs">
                        {primaryItem?.productName || 'Multiple items'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Reason: {primaryItem?.reason.replace('_', ' ').toUpperCase()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatETB(ret.totalRefundETB)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        variant={
                          primaryItem?.action === 'restock' ? 'success' : 'danger'
                        }
                        size="sm"
                      >
                        {primaryItem?.action === 'restock'
                          ? 'Restocked to Shelf'
                          : 'Quarantined / Defect'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setInspectingReturn(ret)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                        title="View Return Details"
                        aria-label={`View ${ret.returnNumber}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredReturns.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    No return records match your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Return Details Modal */}
      {inspectingReturn && (
        <Modal
          isOpen={!!inspectingReturn}
          onClose={() => setInspectingReturn(null)}
          size="md"
          title={`Return Record: ${inspectingReturn.returnNumber}`}
          description={`Original Receipt: ${inspectingReturn.originalReceiptNumber} • Customer: ${inspectingReturn.customerName}`}
          footer={
            <Button variant="primary" size="sm" onClick={() => setInspectingReturn(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block font-semibold">Total Refund</span>
                <span className="text-sm font-bold text-slate-900">
                  {formatETB(inspectingReturn.totalRefundETB)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Refund Payout Mode</span>
                <span className="text-xs font-bold uppercase text-slate-800">
                  {inspectingReturn.refundMethod}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <span className="font-bold text-slate-800 block">Returned Line Items</span>
              {inspectingReturn.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b last:border-0">
                  <div>
                    <span className="font-semibold text-slate-900 block">{item.productName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.quantity}x @ {formatETB(item.unitPrice)} • Reason: {item.reason}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {formatETB(item.refundAmount)}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border text-slate-600">
              <div>Processed by: <strong>{inspectingReturn.processedBy}</strong></div>
              {inspectingReturn.notes && (
                <div className="mt-1">Staff Note: {inspectingReturn.notes}</div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Process Return Modal */}
      <Modal
        isOpen={isProcessModalOpen}
        onClose={() => setIsProcessModalOpen(false)}
        size="lg"
        title="Process Customer Return & Refund"
        description="Verify original receipt and return parameters for Nasir Amme Electronics."
      >
        <form onSubmit={handleProcessSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200">
              {formError}
            </div>
          )}

          {/* Select original sale receipt */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Original Receipt *
            </label>
            <select
              value={selectedReceiptNum}
              onChange={(e) => setSelectedReceiptNum(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              {sales.map((s) => (
                <option key={s.id} value={s.receiptNumber}>
                  {s.receiptNumber} — {s.customerName} ({formatDateShort(s.date)}) • {formatETB(s.grandTotal)}
                </option>
              ))}
            </select>
          </div>

          {targetSale && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                <span>Customer: <strong>{targetSale.customerName}</strong></span>
                <span>Original Mode: <strong>{targetSale.paymentMethod.toUpperCase()}</strong></span>
              </div>

              {/* Select which product line from this sale */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item to Return from Receipt
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  {targetSale.items.map((line) => (
                    <option key={line.productId} value={line.productId}>
                      {line.name} — Sold: {line.quantity} pcs @ {formatETB(line.unitPrice)}
                    </option>
                  ))}
                </select>
              </div>

              {targetLineItem && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Sold Qty</span>
                      <span className="text-sm font-bold text-slate-800">{targetLineItem.quantity} pcs</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Prior Returned</span>
                      <span className="text-sm font-bold text-amber-700">{previouslyReturnedQty} pcs</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Returnable Now</span>
                      <span className={`text-sm font-bold ${remainingReturnableQty > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {remainingReturnableQty} pcs
                      </span>
                    </div>
                  </div>

                  {remainingReturnableQty === 0 && (
                    <div className="p-2.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-[11px] font-medium">
                      All units for this line item have already been refunded. No additional returns permitted.
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Quantity Returning (Max {remainingReturnableQty}) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={remainingReturnableQty}
                        step="1"
                        disabled={remainingReturnableQty === 0}
                        value={remainingReturnableQty > 0 ? returnQty : 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setReturnQty(isNaN(val) ? 0 : val);
                        }}
                        className="w-full px-2.5 py-1.5 border rounded-lg font-bold disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Calculated Refund Amount
                      </label>
                      <div className="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 rounded-lg">
                        {formatETB(remainingReturnableQty > 0 ? returnQty * targetLineItem.unitPrice : 0)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reason & Action */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Return Reason *
              </label>
              <select
                value={returnReason}
                onChange={(e) =>
                  setReturnReason(
                    e.target.value as
                      | 'defective'
                      | 'wrong_item'
                      | 'customer_regret'
                      | 'warranty_claim'
                  )
                }
                className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
              >
                <option value="defective">Defective / Malfunctioning</option>
                <option value="wrong_item">Wrong Item Selected</option>
                <option value="customer_regret">Customer Regret (Unopened Box)</option>
                <option value="warranty_claim">Warranty Claim Exchange</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Inventory Handling Action *
              </label>
              <select
                value={returnAction}
                onChange={(e) =>
                  setReturnAction(e.target.value as 'restock' | 'quarantine_damaged')
                }
                className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
              >
                <option value="restock">Restock to Active Shelf (Good Condition)</option>
                <option value="quarantine_damaged">Quarantine as Defective (Supplier Claim)</option>
              </select>
            </div>
          </div>

          {/* Refund Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Refund Payment Payout Mode
              </label>
              <select
                value={refundMethod}
                onChange={(e) =>
                  setRefundMethod(e.target.value as 'cash' | 'telebirr' | 'credit_note')
                }
                className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
              >
                <option value="cash">Cash Payout from Till</option>
                <option value="telebirr">Telebirr Mobile Reversal</option>
                <option value="credit_note">Store Credit Note</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Inspection Notes
              </label>
              <input
                type="text"
                placeholder="Serial number or defect observation"
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                className="w-full px-2.5 py-1.5 border rounded-lg"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setIsProcessModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={remainingReturnableQty === 0 || isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Process Refund & Update Stock'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
