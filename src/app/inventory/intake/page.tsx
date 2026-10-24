'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Boxes,
  Barcode,
  PackagePlus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Search,
  Truck,
  Printer,
  ArrowRight,
  FileText,
  RefreshCw,
  Plus,
  Trash2,
  Lock,
  Layers,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatETB } from '@/lib/formatters';
import { receivePurchaseOrder, receiveDirectIntake } from '@/app/actions/retail';

interface PendingPO {
  id: string;
  poNumber: string;
  orderDate: string;
  deliveryDue: string | null;
  supplierName: string;
  itemCount: number;
  totalUnits: number;
  totalCost: number;
  status: string;
  items?: Array<{
    id: string;
    productId: string;
    orderedQuantity: number;
    receivedQuantity: number;
    unitCost: number;
    productName: string;
    sku: string;
    hasSerials: boolean;
  }>;
}

interface IntakeItemForm {
  productId: string;
  productName: string;
  sku: string;
  hasSerials: boolean;
  quantity: number;
  unitCost: number;
  serialNumbers: string[];
}

export default function StockIntakeConsolePage() {
  const { roles, user: authUser, isLoading: authLoading } = useAuth();
  const { products, addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'po' | 'direct'>('po');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [pendingPOs, setPendingPOs] = useState<PendingPO[]>([]);
  const [selectedPO, setSelectedPO] = useState<PendingPO | null>(null);

  // Serial input temporary state for PO intake
  const [poSerialInputs, setPoSerialInputs] = useState<Record<string, string[]>>({});
  const [currentSerialInput, setCurrentSerialInput] = useState<string>('');
  const [activeSerialTargetProduct, setActiveSerialTargetProduct] = useState<string | null>(null);

  // Direct intake form state
  const [directProductId, setDirectProductId] = useState<string>('');
  const [directQty, setDirectQty] = useState<number>(1);
  const [directCost, setDirectCost] = useState<string>('');
  const [directSerials, setDirectSerials] = useState<string[]>([]);
  const [directSerialScan, setDirectSerialScan] = useState<string>('');
  const [directRef, setDirectRef] = useState<string>('');
  const [directNotes, setDirectNotes] = useState<string>('');

  // Barcode Label Print Preview Modal
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [printLabelData, setPrintLabelData] = useState<{
    productName: string;
    sku: string;
    serials: string[];
  } | null>(null);

  const isAuthorized =
    roles.includes('stock_keeper') || roles.includes('manager') || roles.includes('admin');

  // Fetch pending POs
  const fetchPendingOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/purchases?status=ordered');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const mapped: PendingPO[] = json.data.map((p: any) => ({
            id: p.id,
            poNumber: p.poNumber,
            orderDate: p.orderedAt || p.createdAt,
            deliveryDue: p.expectedAt || null,
            supplierName: p.supplier?.name || 'Authorized Supplier',
            itemCount: p.items?.length || 0,
            totalUnits: (p.items || []).reduce((sum: number, it: any) => sum + (it.orderedQuantity || 0), 0),
            totalCost: Number(p.grandTotal || 0),
            status: p.status,
            items: (p.items || []).map((it: any) => ({
              id: it.id,
              productId: it.productId,
              orderedQuantity: it.orderedQuantity,
              receivedQuantity: it.receivedQuantity,
              unitCost: Number(it.unitCost),
              productName: it.product?.name || 'Hardware Component',
              sku: it.product?.sku || 'SKU',
              hasSerials: it.product?.hasSerials ?? false,
            })),
          }));
          setPendingPOs(mapped);
          if (mapped.length > 0 && !selectedPO) {
            setSelectedPO(mapped[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load pending POs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPO]);

  useEffect(() => {
    if (isAuthorized) {
      fetchPendingOrders();
    }
  }, [isAuthorized, fetchPendingOrders]);

  // Selected product object for direct intake
  const selectedDirectProduct = useMemo(() => {
    return products.find((p) => p.id === directProductId);
  }, [products, directProductId]);

  // Add a scanned serial number to PO item
  const handleAddSerialToPO = (productId: string) => {
    const trimmed = currentSerialInput.trim().toUpperCase();
    if (!trimmed) return;

    setPoSerialInputs((prev) => {
      const existing = prev[productId] || [];
      if (existing.includes(trimmed)) {
        addToast({
          type: 'warning',
          title: 'Duplicate IMEI/Serial',
          message: `Serial number "${trimmed}" is already scanned in this intake batch.`,
        });
        return prev;
      }
      return {
        ...prev,
        [productId]: [...existing, trimmed],
      };
    });

    setCurrentSerialInput('');
  };

  const handleRemoveSerialFromPO = (productId: string, serial: string) => {
    setPoSerialInputs((prev) => ({
      ...prev,
      [productId]: (prev[productId] || []).filter((s) => s !== serial),
    }));
  };

  // Add serial for direct intake
  const handleAddDirectSerial = () => {
    const trimmed = directSerialScan.trim().toUpperCase();
    if (!trimmed) return;

    if (directSerials.includes(trimmed)) {
      addToast({
        type: 'warning',
        title: 'Duplicate Serial',
        message: `Serial "${trimmed}" already added.`,
      });
      return;
    }

    if (directSerials.length >= directQty) {
      addToast({
        type: 'warning',
        title: 'Quantity Reached',
        message: `Cannot scan more than ${directQty} serials for this batch.`,
      });
      return;
    }

    setDirectSerials((prev) => [...prev, trimmed]);
    setDirectSerialScan('');
  };

  // Submit PO Intake
  const handleSubmitPOIntake = async () => {
    if (!selectedPO) return;

    setIsSubmitting(true);
    try {
      const res = await receivePurchaseOrder(selectedPO.id, authUser?.id || 'usr-stock-01', poSerialInputs);
      if (res.success) {
        addToast({
          type: 'success',
          title: 'Goods Inward Completed',
          message: `PO ${selectedPO.poNumber} received and recorded to immutable audit ledger.`,
        });

        // Set print preview if serials were captured
        const firstSerializedItem = selectedPO.items?.find((i) => i.hasSerials && poSerialInputs[i.productId]?.length);
        if (firstSerializedItem) {
          setPrintLabelData({
            productName: firstSerializedItem.productName,
            sku: firstSerializedItem.sku,
            serials: poSerialInputs[firstSerializedItem.productId] || [],
          });
          setPrintModalOpen(true);
        }

        setSelectedPO(null);
        setPoSerialInputs({});
        fetchPendingOrders();
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Intake Error',
        message: err.message || 'Failed to complete goods inward.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Direct Intake
  const handleSubmitDirectIntake = async () => {
    if (!directProductId) {
      addToast({
        type: 'warning',
        title: 'Validation Error',
        message: 'Please select a product for stock intake.',
      });
      return;
    }

    const costNum = parseFloat(directCost);
    if (isNaN(costNum) || costNum < 0) {
      addToast({
        type: 'warning',
        title: 'Validation Error',
        message: 'Please specify a valid unit cost (ETB).',
      });
      return;
    }

    if (selectedDirectProduct?.hasSerials && directSerials.length !== directQty) {
      addToast({
        type: 'warning',
        title: 'Serialized Custody Required',
        message: `This serialized product requires exactly ${directQty} IMEI/serial numbers. Captured: ${directSerials.length}.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await receiveDirectIntake(
        {
          productId: directProductId,
          quantity: directQty,
          unitCost: costNum,
          serialNumbers: directSerials.length > 0 ? directSerials : undefined,
          referenceNumber: directRef.trim() || undefined,
          notes: directNotes.trim() || undefined,
        },
        authUser?.id || 'usr-stock-01'
      );

      if (res.success) {
        addToast({
          type: 'success',
          title: 'Stock Intake Succeeded',
          message: `${directQty} units added to stock with updated moving average cost.`,
        });

        if (directSerials.length > 0) {
          setPrintLabelData({
            productName: selectedDirectProduct?.name || 'Product',
            sku: selectedDirectProduct?.sku || 'SKU',
            serials: directSerials,
          });
          setPrintModalOpen(true);
        }

        setDirectProductId('');
        setDirectQty(1);
        setDirectCost('');
        setDirectSerials([]);
        setDirectRef('');
        setDirectNotes('');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Direct Intake Failed',
        message: err.message || 'Failed to record direct stock intake.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Verifying Stock Keeper Clearance...
        </p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Warehouse Intake Restricted
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Stock Keeper, Store Manager, or Administrator clearance required to intake material inventory
            and register serial custody.
          </p>
          <Link href="/login">
            <Button variant="accent" className="w-full font-bold">
              Sign In with Authorized Account
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <header className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <PackagePlus className="w-6 h-6 text-amber-500" />
                <span>Inbound Stock Intake & Serial Custody</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                DD-MAIN-01
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Authoritative receiving console • Immutable audit ledger logging with IMEI / Serial custody tracking
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => setActiveTab('po')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'po'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Receive Against Purchase Order</span>
              {pendingPOs.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-amber-400">
                  {pendingPOs.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('direct')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'direct'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Direct Dock / Counter Intake</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Receiving Workstation */}
      {activeTab === 'po' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: List of Pending POs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pending Purchase Orders ({pendingPOs.length})
              </span>
              <button
                onClick={fetchPendingOrders}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                Loading pending purchase orders...
              </div>
            ) : pendingPOs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-bold">No Pending POs</p>
                <p className="text-[11px] text-slate-400">All purchase orders have been received into stock.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingPOs.map((po) => {
                  const isSelected = selectedPO?.id === po.id;
                  return (
                    <div
                      key={po.id}
                      onClick={() => {
                        setSelectedPO(po);
                        setPoSerialInputs({});
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {po.poNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {po.status}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                        {po.supplierName}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>{po.totalUnits} Units ({po.itemCount} SKUs)</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatETB(po.totalCost)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right 2 Cols: Receiving Details & Serial Scanning */}
          <div className="lg:col-span-2">
            {selectedPO ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Inward Verification: {selectedPO.poNumber}</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Supplier: <strong className="text-slate-700 dark:text-slate-300">{selectedPO.supplierName}</strong> • Ordered Total: {formatETB(selectedPO.totalCost)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="accent"
                    disabled={isSubmitting}
                    onClick={handleSubmitPOIntake}
                    className="font-bold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmitting ? 'Posting Ledger...' : 'Post Goods Inward'}</span>
                  </Button>
                </div>

                {/* Line Items Receiving Table */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Ordered SKUs & Serialized Unit Capture
                  </span>

                  {selectedPO.items?.map((item) => {
                    const remainingQty = item.orderedQuantity - item.receivedQuantity;
                    const capturedSerials = poSerialInputs[item.productId] || [];
                    const isTargeted = activeSerialTargetProduct === item.productId;

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{item.productName}</span>
                              {item.hasSerials && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                  <ShieldCheck className="w-3 h-3" /> Serialized Item
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                              SKU: {item.sku} • Unit Cost: {formatETB(item.unitCost)}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-mono">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Ordered:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {item.orderedQuantity} pcs
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">Receiving:</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                +{remainingQty} pcs
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* If serialized, show IMEI / Serial Scanning Module */}
                        {item.hasSerials && (
                          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                <Barcode className="w-3.5 h-3.5 text-indigo-500" />
                                <span>IMEI / Serial Capture:</span>
                              </span>
                              <span
                                className={`font-mono font-bold text-xs ${
                                  capturedSerials.length === remainingQty
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-amber-600 dark:text-amber-400'
                                }`}
                              >
                                {capturedSerials.length} / {remainingQty} Scanned
                              </span>
                            </div>

                            {/* Serial Input Barcode Field */}
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder={`Scan or type IMEI / Serial for ${item.productName}...`}
                                value={isTargeted ? currentSerialInput : ''}
                                onFocus={() => setActiveSerialTargetProduct(item.productId)}
                                onChange={(e) => setCurrentSerialInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddSerialToPO(item.productId);
                                  }
                                }}
                                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddSerialToPO(item.productId)}
                                className="text-xs cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add
                              </Button>
                            </div>

                            {/* Scanned Tag Pills */}
                            {capturedSerials.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                {capturedSerials.map((sn) => (
                                  <span
                                    key={sn}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"
                                  >
                                    <span>{sn}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSerialFromPO(item.productId, sn)}
                                      className="text-slate-400 hover:text-rose-500 cursor-pointer"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                Select a pending purchase order from the left to start goods inwards.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Direct Intake Console */
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Boxes className="w-5 h-5 text-amber-500" />
              <span>Direct Dock Intake Registration</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rapid intake of wholesale inventory with moving-average cost calculation and serial tagging
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Select Product */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Hardware Product *
              </label>
              <select
                value={directProductId}
                onChange={(e) => {
                  setDirectProductId(e.target.value);
                  setDirectSerials([]);
                  const prod = products.find((p) => p.id === e.target.value);
                  if (prod) {
                    setDirectCost(prod.costPrice ? prod.costPrice.toString() : '');
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-hidden"
              >
                <option value="">-- Choose active product from catalog --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) • Stock: {p.stockQuantity} pcs
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Quantity Received (Units) *
              </label>
              <input
                type="number"
                min="1"
                value={directQty}
                onChange={(e) => setDirectQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>

            {/* Unit Purchase Cost in ETB */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Unit Purchase Cost (ETB) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={directCost}
                onChange={(e) => setDirectCost(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>

            {/* Inbound Ref */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Inbound Waybill / Reference
              </label>
              <input
                type="text"
                placeholder="e.g. WB-2026-904"
                value={directRef}
                onChange={(e) => setDirectRef(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Receiving Notes
              </label>
              <input
                type="text"
                placeholder="Batch condition, supplier delivery notes..."
                value={directNotes}
                onChange={(e) => setDirectNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* Serialized IMEI Module for Direct Intake */}
          {selectedDirectProduct && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  <span>Scan or Type Serial Numbers / IMEIs</span>
                </span>
                <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                  {directSerials.length} / {directQty} Captured
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Scan barcode or type IMEI..."
                  value={directSerialScan}
                  onChange={(e) => setDirectSerialScan(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDirectSerial();
                    }
                  }}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden"
                />
                <Button size="sm" variant="outline" onClick={handleAddDirectSerial} className="cursor-pointer">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>

              {directSerials.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {directSerials.map((sn) => (
                    <span
                      key={sn}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"
                    >
                      <span>{sn}</span>
                      <button
                        type="button"
                        onClick={() => setDirectSerials((prev) => prev.filter((s) => s !== sn))}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="accent"
              disabled={isSubmitting || !directProductId}
              onClick={handleSubmitDirectIntake}
              className="font-bold flex items-center gap-2 cursor-pointer bg-amber-500 text-slate-950 hover:bg-amber-400"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording Inward...' : 'Confirm Stock Intake & Update Moving Cost'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* Barcode Tag Print Modal */}
      {printModalOpen && printLabelData && (
        <Modal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          title="Print Inbound Serial & Barcode Labels"
        >
          <div className="p-4 space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">{printLabelData.productName}</p>
              <p className="font-mono text-slate-500">SKU: {printLabelData.sku}</p>
              <p className="text-slate-500">Labels to print: {printLabelData.serials.length} units</p>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
              {printLabelData.serials.map((sn) => (
                <div
                  key={sn}
                  className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono"
                >
                  <span className="font-bold text-slate-800 dark:text-slate-200">{sn}</span>
                  <span className="text-[10px] text-slate-400">DD-MAIN-01</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button size="sm" variant="outline" onClick={() => setPrintModalOpen(false)}>
                Done
              </Button>
              <Button
                size="sm"
                variant="accent"
                onClick={() => {
                  window.print();
                }}
                className="font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print All Tags</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
