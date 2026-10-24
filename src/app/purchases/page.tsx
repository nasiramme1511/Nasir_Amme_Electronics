'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { PurchaseOrder, PurchaseOrderItem } from '@/types';
import {
  Plus,
  Search,
  CheckCircle2,
  Download,
  Eye,
  Trash2,
  FileCheck,
  Truck,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { formatETB, formatDate, formatDateShort } from '@/lib/formatters';
import { exportToCSV } from '@/lib/export';
import PurchasesViewLive from '@/components/purchases/PurchasesViewLive';

export default function PurchasesPage() {
  const {
    purchaseOrders,
    suppliers,
    products,
    createPurchaseOrder,
    receivePurchaseOrder,
    deletePurchaseOrder,
    addToast,
  } = useApp();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'live' | 'all'>('live');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [inspectingPO, setInspectingPO] = useState<PurchaseOrder | null>(null);
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
  const [poToDelete, setPOToDelete] = useState<PurchaseOrder | null>(null);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);

  // New PO Draft Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    suppliers[0]?.id || ''
  );
  const [deliveryDate, setDeliveryDate] = useState<string>('2026-10-20');
  const [poNotes, setPONotes] = useState<string>('');
  const [poLines, setPOLines] = useState<
    { productId: string; quantity: number; unitCost: number }[]
  >([{ productId: products[0]?.id || '', quantity: 10, unitCost: products[0]?.costPrice || 500 }]);
  const [draftError, setDraftError] = useState<string>('');

  // Filtered POs
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const matchSearch =
        searchTerm === '' ||
        po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.supplierName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = selectedStatus === 'all' || po.status === selectedStatus;

      return matchSearch && matchStatus;
    });
  }, [purchaseOrders, searchTerm, selectedStatus]);

  // Add line to PO draft
  const handleAddLine = () => {
    const firstProd = products[0];
    setPOLines((prev) => [
      ...prev,
      { productId: firstProd.id, quantity: 10, unitCost: firstProd.costPrice },
    ]);
  };

  // Remove line from PO draft
  const handleRemoveLine = (idx: number) => {
    setPOLines((prev) => prev.filter((_, i) => i !== idx));
  };

  // Handle PO product select change
  const handleProductChange = (idx: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    setPOLines((prev) =>
      prev.map((line, i) =>
        i === idx
          ? {
              ...line,
              productId,
              unitCost: prod ? prod.costPrice : line.unitCost,
            }
          : line
      )
    );
  };

  // Handle PO line quantity / cost change
  const handleLineValueChange = (
    idx: number,
    field: 'quantity' | 'unitCost',
    value: number
  ) => {
    setPOLines((prev) =>
      prev.map((line, i) => (i === idx ? { ...line, [field]: value } : line))
    );
  };

  // Draft calculation
  const calculatedTotal = useMemo(() => {
    return poLines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);
  }, [poLines]);

  // Submit Draft
  const handleCreateDraft = (statusToSet: 'draft' | 'ordered') => {
    if (poLines.length === 0) {
      setDraftError('Please add at least one product line.');
      return;
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];

    const items: PurchaseOrderItem[] = poLines.map((line) => {
      const prod = products.find((p) => p.id === line.productId) || products[0];
      return {
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        orderedQty: line.quantity,
        receivedQty: 0,
        unitCost: line.unitCost,
        totalCost: line.quantity * line.unitCost,
      };
    });

    createPurchaseOrder({
      supplierId: supplier.id,
      supplierName: supplier.name,
      expectedDelivery: new Date(deliveryDate).toISOString(),
      items,
      totalAmount: calculatedTotal,
      status: statusToSet,
      notes: poNotes,
    });

    setIsDraftModalOpen(false);
    setPOLines([
      { productId: products[0]?.id || '', quantity: 10, unitCost: products[0]?.costPrice || 500 },
    ]);
    setPONotes('');
  };

  // Confirm Goods Receiving
  const handleConfirmReceive = () => {
    if (!receivingPO || isReceiving) return;
    if (receivingPO.status === 'received') {
      addToast({
        type: 'warning',
        title: 'Already Received',
        message: `${receivingPO.poNumber} was already received.`,
      });
      setReceivingPO(null);
      return;
    }

    setIsReceiving(true);
    try {
      receivePurchaseOrder(receivingPO.id, 'Abel Girma (Store Clerk)');
      setReceivingPO(null);
    } finally {
      setIsReceiving(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'PO Number',
      'Date',
      'Supplier',
      'Items Count',
      'Total (ETB)',
      'Status',
      'Expected Delivery',
      'Received Date',
      'Received By',
    ];

    const rows = filteredPOs.map((po) => [
      po.poNumber,
      formatDateShort(po.date),
      po.supplierName,
      po.items.length,
      po.totalAmount,
      po.status.toUpperCase(),
      formatDateShort(po.expectedDelivery),
      po.receivedDate ? formatDateShort(po.receivedDate) : '—',
      po.receivedBy || '—',
    ]);

    exportToCSV('nasir_amme_purchases', headers, rows);
    addToast({
      type: 'info',
      title: 'Purchases Exported',
      message: `${filteredPOs.length} purchase records exported to CSV.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Purchases & Goods Receiving
            </h1>
            <Badge variant="accent" size="sm">
              {purchaseOrders.length} Orders
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track purchase orders and incoming supplier stock.
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
            onClick={() => setIsDraftModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Draft Purchase Order
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('live')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'live'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          Live Goods Receiving (GRN)
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/30 text-white font-mono">
            PostgreSQL Ledger
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'all'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          PO History & Drafter
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
            {purchaseOrders.length}
          </span>
        </button>
      </div>

      {activeTab === 'live' ? (
        <PurchasesViewLive adminUserId={user?.id || 'usr-01'} hideHeader={true} />
      ) : (
        <>
          {/* Filters */}
          <Card>
        <div className="p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by PO # or supplier name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D9A441] bg-slate-50/50 dark:bg-slate-900/60"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              <option value="all" className="dark:bg-slate-900">All PO Statuses</option>
              <option value="draft" className="dark:bg-slate-900">Drafts</option>
              <option value="ordered" className="dark:bg-slate-900">Ordered (In Transit)</option>
              <option value="received" className="dark:bg-slate-900">Received (Posted)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* PO Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 text-xs font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Order Date</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Items / SKUs</th>
                <th className="py-3 px-4 text-right">Total (ETB)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPOs.map((po) => {
                const isOrdered = po.status === 'ordered';
                const isReceived = po.status === 'received';

                return (
                  <tr key={po.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                      {po.poNumber}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                      {formatDateShort(po.date)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        {po.supplierName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Delivery due: {formatDateShort(po.expectedDelivery)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                      {po.items.length} item(s) (
                      {po.items.reduce((s, i) => s + i.orderedQty, 0)} units)
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {formatETB(po.totalAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {isReceived ? (
                        <Badge variant="success" size="sm">
                          Received & Posted
                        </Badge>
                      ) : isOrdered ? (
                        <Badge variant="info" size="sm">
                          In Transit
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Draft
                        </Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setInspectingPO(po)}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                          title="View PO Details"
                          aria-label={`View ${po.poNumber}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {isOrdered && (
                          <Button
                            variant="accent"
                            size="sm"
                            className="text-xs h-7 px-2.5"
                            onClick={() => setReceivingPO(po)}
                            leftIcon={<FileCheck className="w-3.5 h-3.5" />}
                          >
                            Receive Goods
                          </Button>
                        )}

                        {po.status !== 'received' && (
                          <button
                            onClick={() => setPOToDelete(po)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md"
                            title="Delete Purchase Order"
                            aria-label={`Delete ${po.poNumber}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredPOs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                    No purchase orders match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      </>
      )}

      {/* PO Detail View Modal */}
      {inspectingPO && (
        <Modal
          isOpen={!!inspectingPO}
          onClose={() => setInspectingPO(null)}
          size="lg"
          title={`Purchase Order: ${inspectingPO.poNumber}`}
          description={`Vendor: ${inspectingPO.supplierName} • Created ${formatDate(inspectingPO.date)}`}
          footer={
            <Button variant="primary" size="sm" onClick={() => setInspectingPO(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Order Total</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatETB(inspectingPO.totalAmount)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Status</span>
                <span className="text-xs font-bold uppercase text-slate-800 dark:text-slate-200">
                  {inspectingPO.status}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Expected In Dire Dawa</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {formatDateShort(inspectingPO.expectedDelivery)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Item / Description</th>
                    <th className="py-2 px-3 font-mono">SKU</th>
                    <th className="py-2 px-3 text-center">Ordered Qty</th>
                    <th className="py-2 px-3 text-right">Unit Cost (ETB)</th>
                    <th className="py-2 px-3 text-right">Total (ETB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {inspectingPO.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">
                        {item.productName}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500 dark:text-slate-400">{item.sku}</td>
                      <td className="py-2 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                        {item.orderedQty} pcs
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700 dark:text-slate-200">
                        {formatETB(item.unitCost)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">
                        {formatETB(item.totalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {inspectingPO.notes && (
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-400">
                <strong>Logistics Notes:</strong> {inspectingPO.notes}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Receive Goods Confirmation Modal */}
      {receivingPO && (
        <Modal
          isOpen={!!receivingPO}
          onClose={() => setReceivingPO(null)}
          size="md"
          title="Receive Delivery & Post Inventory"
          description={`Verify arrival of items from ${receivingPO.supplierName} (${receivingPO.poNumber})`}
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                disabled={isReceiving}
                onClick={() => setReceivingPO(null)}
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                size="sm"
                disabled={isReceiving}
                onClick={handleConfirmReceive}
                leftIcon={isReceiving ? undefined : <CheckCircle2 className="w-4 h-4" />}
              >
                {isReceiving ? 'Posting to Stock...' : 'Confirm & Post to Stock'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Receiving will update active shelf inventory for the following items in Dire Dawa:
            </p>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800 space-y-2">
              {receivingPO.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-200 dark:border-slate-800 last:border-0">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">{item.productName}</span>
                    <span className="font-mono text-[10px] text-slate-400">{item.sku}</span>
                  </div>
                  <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 font-bold rounded">
                    +{item.orderedQty} units
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-900">
              Responsible Receiver: <strong>Abel Girma (Store Clerk)</strong>. A stock movement record will be generated automatically.
            </div>
          </div>
        </Modal>
      )}

      {/* New Purchase Draft Modal */}
      <Modal
        isOpen={isDraftModalOpen}
        onClose={() => setIsDraftModalOpen(false)}
        size="lg"
        title="Draft Supplier Purchase Order"
        description="Select vendor and order quantities to restock Dire Dawa electronics inventory."
      >
        <div className="space-y-4">
          {draftError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs rounded-lg border border-rose-200 dark:border-rose-900">
              {draftError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Select Supplier *
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              >
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id} className="dark:bg-slate-900">
                    {sup.name} ({sup.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>
          </div>

          {/* Line items list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Product Line Items
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLine}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Item Line
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto p-1">
              {poLines.map((line, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800"
                >
                  <div className="flex-1">
                    <select
                      value={line.productId}
                      onChange={(e) => handleProductChange(idx, e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id} className="dark:bg-slate-900">
                          {p.name} ({p.brand}) - Current: {p.stockQuantity} pcs
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={line.quantity}
                        onChange={(e) =>
                          handleLineValueChange(idx, 'quantity', Number(e.target.value))
                        }
                        className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-center font-bold"
                      />
                    </div>

                    <div className="w-28">
                      <input
                        type="number"
                        min="0"
                        placeholder="Unit Cost"
                        value={line.unitCost}
                        onChange={(e) =>
                          handleLineValueChange(idx, 'unitCost', Number(e.target.value))
                        }
                        className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white text-right font-medium"
                      />
                    </div>

                    <div className="w-28 text-right font-bold text-xs text-slate-800 dark:text-slate-200">
                      {formatETB(line.quantity * line.unitCost)}
                    </div>

                    {poLines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grand total callout */}
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Estimated PO Total:</span>
            <span className="text-base font-bold text-[#101827] dark:text-white">
              {formatETB(calculatedTotal)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Logistics & Delivery Instructions
            </label>
            <textarea
              rows={2}
              value={poNotes}
              onChange={(e) => setPONotes(e.target.value)}
              placeholder="e.g. Ship via Ethio-Djibouti Railway cargo to Dire Dawa Station"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDraftModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleCreateDraft('draft')}
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => handleCreateDraft('ordered')}
            >
              Order & Dispatch
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete PO Confirmation Modal */}
      {poToDelete && (
        <Modal
          isOpen={!!poToDelete}
          onClose={() => setPOToDelete(null)}
          size="sm"
          title={`Delete Purchase Order: ${poToDelete.poNumber}`}
          description="Remove order from PostgreSQL database."
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setPOToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  const po = poToDelete;
                  setPOToDelete(null);
                  await deletePurchaseOrder(po.id);
                }}
              >
                Delete from Database
              </Button>
            </div>
          }
        >
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Are you sure you want to remove purchase order <strong>{poToDelete.poNumber}</strong> ({poToDelete.supplierName}) from the database?
            This will permanently remove the PO and its line items.
          </p>
        </Modal>
      )}
    </div>
  );
}
