'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  AlertTriangle,
  Truck,
  ArrowRight,
  Plus,
  CheckCircle2,
  Phone,
  FileCheck,
  ShoppingBag,
  Store,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatETB, formatDate } from '@/lib/formatters';

export const ManagerDashboardView: React.FC = () => {
  const { products, purchaseOrders, suppliers, sales, receivePurchaseOrder, addToast } = useApp();
  const [receivingPoId, setReceivingPoId] = useState<string | null>(null);
  const [shortageTab, setShortageTab] = useState<'all' | 'out_of_stock' | 'low_stock'>('all');

  // Compute Manager Metrics
  const managerMetrics = useMemo(() => {
    const todayRevenue = sales.reduce((sum, s) => sum + s.grandTotal, 0);
    const todayOrdersCount = sales.length;

    const outOfStockItems = products.filter((p) => p.stockQuantity === 0);
    const lowStockItems = products.filter(
      (p) => p.stockQuantity > 0 && p.stockQuantity <= p.minStockThreshold
    );

    const pendingOrders = purchaseOrders.filter(
      (po) => po.status === 'ordered' || po.status === 'draft'
    );

    const pendingValueETB = pendingOrders.reduce((sum, po) => sum + po.totalAmount, 0);

    const totalSuppliersCount = suppliers.length;

    return {
      todayRevenue,
      todayOrdersCount,
      outOfStockCount: outOfStockItems.length,
      outOfStockItems,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      pendingOrdersCount: pendingOrders.length,
      pendingOrders,
      pendingValueETB,
      totalSuppliersCount,
    };
  }, [sales, products, purchaseOrders, suppliers]);

  const displayedShortages = useMemo(() => {
    if (shortageTab === 'out_of_stock') return managerMetrics.outOfStockItems;
    if (shortageTab === 'low_stock') return managerMetrics.lowStockItems;
    return [...managerMetrics.outOfStockItems, ...managerMetrics.lowStockItems];
  }, [shortageTab, managerMetrics]);

  const handleQuickReceive = (poId: string, poNumber: string) => {
    setReceivingPoId(poId);
    setTimeout(() => {
      receivePurchaseOrder(poId, 'Yonas Bekele (Store Manager)');
      addToast({
        title: 'Shipment Received & Stock Updated',
        message: `PO #${poNumber} successfully marked as received into warehouse stock`,
        type: 'success',
      });
      setReceivingPoId(null);
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* 4 Operations KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales Volume"
          value={formatETB(managerMetrics.todayRevenue)}
          subtitle={`${managerMetrics.todayOrdersCount} completed checkout transactions`}
          icon={<DollarSign className="w-5 h-5" />}
          trend={{ value: `${managerMetrics.todayOrdersCount} orders`, isPositive: true, label: 'throughput' }}
          indicatorColor="accent"
        />

        <StatCard
          title="Critical Low Stock Alerts"
          value={`${managerMetrics.lowStockCount} SKUs`}
          subtitle={
            managerMetrics.outOfStockCount > 0
              ? `Plus ${managerMetrics.outOfStockCount} zero-stock (empty) SKU`
              : 'Items at or below safety threshold'
          }
          icon={<AlertTriangle className="w-5 h-5" />}
          trend={{
            value: `${managerMetrics.lowStockCount} Low • ${managerMetrics.outOfStockCount} Zero`,
            isPositive: false,
            label: 'PO required',
          }}
          indicatorColor={managerMetrics.lowStockCount > 0 ? 'warning' : 'success'}
        />

        <StatCard
          title="Pending Purchase Orders"
          value={`${managerMetrics.pendingOrdersCount} Inward`}
          subtitle={`${formatETB(managerMetrics.pendingValueETB)} scheduled deliveries`}
          icon={<Truck className="w-5 h-5" />}
          trend={{
            value: 'In Transit',
            isPositive: true,
            label: 'from suppliers',
          }}
          indicatorColor="primary"
        />

        <StatCard
          title="Authorized Suppliers"
          value={`${managerMetrics.totalSuppliersCount} Vendors`}
          subtitle="Dire Dawa & Addis electronics distributors"
          icon={<Store className="w-5 h-5" />}
          trend={{ value: '100% Active', isPositive: true, label: 'standing terms' }}
          indicatorColor="success"
        />
      </div>

      {/* Row 1: Urgent Restock Priority Board & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Restock Priority Board */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <span>Urgent Restock Reorder Board</span>
                </CardTitle>
                <CardDescription>
                  Priority SKUs requiring replenishment purchase orders to prevent stock-outs
                </CardDescription>
              </div>
              <Link href="/purchases">
                <Button variant="accent" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                  Create Purchase Order
                </Button>
              </Link>
            </div>

            {/* Categorized Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShortageTab('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  shortageTab === 'all'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>All Shortages</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20 dark:bg-white/20">
                  {managerMetrics.outOfStockCount + managerMetrics.lowStockCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShortageTab('out_of_stock')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  shortageTab === 'out_of_stock'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 hover:bg-rose-100 dark:hover:bg-rose-900/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Out-of-Stock (0 Units)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900/80 font-bold">
                  {managerMetrics.outOfStockCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShortageTab('low_stock')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  shortageTab === 'low_stock'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                }`}
              >
                <span>Low-Stock Warning (Below Min)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/80 font-bold">
                  {managerMetrics.lowStockCount}
                </span>
              </button>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">SKU / Item</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Stock / Threshold</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-center">Reorder Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedShortages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No products found in this shortage category. All stock levels healthy.
                    </td>
                  </tr>
                ) : (
                  displayedShortages.slice(0, 8).map((prod) => {
                    const isZero = prod.stockQuantity === 0;
                    const suggestedReorder = Math.max(prod.minStockThreshold * 2, 10);

                    return (
                      <tr
                        key={prod.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white text-xs">
                            {prod.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {prod.sku} • {prod.brand}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                          {prod.category}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`font-black text-xs ${
                              isZero ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {prod.stockQuantity}
                          </span>
                          <span className="text-slate-400 text-xs"> / {prod.minStockThreshold}</span>
                        </td>
                        <td className="py-3 px-4 text-right text-xs font-semibold text-slate-900 dark:text-slate-200">
                          {formatETB(prod.costPrice)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={isZero ? 'danger' : 'warning'} size="sm">
                            {isZero ? '0 - OUT OF STOCK' : 'BELOW MIN'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/purchases?reorderSku=${prod.sku}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs border-amber-400 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            >
                              Order +{suggestedReorder}
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Manager Quick Controls */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div>
              <CardTitle>Manager Shortcuts</CardTitle>
              <CardDescription>Store floor & purchasing tools</CardDescription>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded">
              Store Manager
            </span>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            <Link
              href="/purchases"
              className="group p-3.5 rounded-2xl border border-blue-300/60 dark:border-blue-500/30 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Goods Inward & POs</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Receive supplier shipments & restock</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/suppliers"
              className="group p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-850/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Vendor Directory</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Payment terms, orders & contacts</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/inventory/stock-counts"
              className="group p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-850/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Audit Reconciliations</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Review shelf counts & balance losses</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/sales"
              className="group p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-850/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Daily Cashier Audits</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Review cashier receipts & registers</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Inward Purchase Orders Tracking Table & Supplier Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <CardTitle>Pending & Recent Purchase Orders</CardTitle>
                <CardDescription>
                  Inward deliveries from verified electronics distributors
                </CardDescription>
              </div>
              <Link href="/purchases">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  View All Orders
                </Button>
              </Link>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">PO #</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Expected Delivery</th>
                  <th className="py-3 px-4 text-right">Amount (ETB)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {purchaseOrders.slice(0, 5).map((po) => {
                  const isPending = po.status === 'ordered' || po.status === 'draft';
                  const isReceiving = receivingPoId === po.id;

                  return (
                    <tr
                      key={po.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white text-xs">
                        {po.poNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {po.supplierName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {po.items.length} product line(s)
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                        {po.expectedDelivery || formatDate(po.date)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                        {formatETB(po.totalAmount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            po.status === 'received'
                              ? 'success'
                              : po.status === 'ordered'
                              ? 'info'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {po.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isPending ? (
                          <Button
                            variant="accent"
                            size="sm"
                            disabled={isReceiving}
                            onClick={() => handleQuickReceive(po.id, po.poNumber)}
                            className="h-7 text-xs font-bold"
                          >
                            {isReceiving ? 'Receiving...' : 'Receive Goods'}
                          </Button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Stocked
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Verified Distributors & Suppliers Contact Board */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Distributors & Suppliers</CardTitle>
              <CardDescription>Direct electronics partners</CardDescription>
            </div>
            <Link href="/suppliers" className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold">
              Directory
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {suppliers.slice(0, 4).map((sup) => (
              <div
                key={sup.id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                    {sup.name}
                  </h5>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {sup.paymentTerms}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Contact: {sup.contactPerson}</span>
                  <a
                    href={`tel:${sup.phone}`}
                    className="text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                  >
                    <Phone className="w-3 h-3" />
                    <span>{sup.phone}</span>
                  </a>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
