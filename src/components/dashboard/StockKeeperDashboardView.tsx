'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  Boxes,
  AlertTriangle,
  ClipboardList,
  Truck,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  MapPin,
  Barcode,
  Sliders,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatNumber, formatDate } from '@/lib/formatters';
import { ShortageMonitor } from '@/components/inventory/ShortageMonitor';
import { StockMovementLedger } from '@/components/inventory/StockMovementLedger';

export const StockKeeperDashboardView: React.FC = () => {
  const { products, stockMovements, purchaseOrders } = useApp();

  // Stock Keeper metrics
  const stockMetrics = useMemo(() => {
    const totalUnits = products.reduce((sum, p) => sum + p.stockQuantity, 0);
    const outOfStockItems = products.filter((p) => p.stockQuantity === 0);
    const lowStockItems = products.filter(
      (p) => p.stockQuantity > 0 && p.stockQuantity <= p.minStockThreshold
    );
    const pendingDeliveries = purchaseOrders.filter(
      (po) => po.status === 'ordered' || po.status === 'draft'
    );

    return {
      totalUnits,
      outOfStockCount: outOfStockItems.length,
      outOfStockItems,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      pendingDeliveriesCount: pendingDeliveries.length,
      movementsCount: stockMovements.length,
    };
  }, [products, stockMovements, purchaseOrders]);

  const [shortageTab, setShortageTab] = React.useState<'all' | 'out_of_stock' | 'low_stock'>('all');

  const displayedShortages = useMemo(() => {
    if (shortageTab === 'out_of_stock') {
      return stockMetrics.outOfStockItems;
    }
    if (shortageTab === 'low_stock') {
      return stockMetrics.lowStockItems;
    }
    return [...stockMetrics.outOfStockItems, ...stockMetrics.lowStockItems];
  }, [shortageTab, stockMetrics]);

  return (
    <div className="space-y-6">
      {/* 4 Warehouse KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Stocked Units"
          value={formatNumber(stockMetrics.totalUnits)}
          subtitle="Physical units across warehouse & floor"
          icon={<Boxes className="w-5 h-5" />}
          trend={{ value: `${products.length} SKUs`, isPositive: true, label: 'tracked in catalog' }}
          indicatorColor="accent"
        />

        <StatCard
          title="Out-of-Stock (0 Units)"
          value={`${stockMetrics.outOfStockCount} SKU`}
          subtitle="Empty shelves requiring urgent restock"
          icon={<AlertTriangle className="w-5 h-5" />}
          trend={{
            value: stockMetrics.outOfStockCount > 0 ? 'CRITICAL' : 'Clear',
            isPositive: stockMetrics.outOfStockCount === 0,
            label: 'zero stock items',
          }}
          indicatorColor={stockMetrics.outOfStockCount > 0 ? 'danger' : 'success'}
        />

        <StatCard
          title="Low Stock Warning"
          value={`${stockMetrics.lowStockCount} SKUs`}
          subtitle="Units at or below safety reorder line"
          icon={<Layers className="w-5 h-5" />}
          trend={{ value: 'Reorder Line', isPositive: false, label: 'below min limit' }}
          indicatorColor="warning"
        />

        <StatCard
          title="Inward Shipments"
          value={`${stockMetrics.pendingDeliveriesCount} Inbound`}
          subtitle="Purchase orders awaiting delivery"
          icon={<Truck className="w-5 h-5" />}
          trend={{ value: 'Scheduled', isPositive: true, label: 'from suppliers' }}
          indicatorColor="primary"
        />
      </div>

      {/* Modern Compact Critical Deficit Strip */}
      <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Header & Badges */}
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
            <span className="text-xs font-semibold text-rose-950 dark:text-rose-200">
              Critical Stock Deficit
            </span>
            <span className="rounded bg-rose-200/70 px-1.5 py-0.5 text-[10px] font-medium text-rose-800 dark:bg-rose-900/60 dark:text-rose-300">
              2 Urgent
            </span>
            <span className="text-[11px] text-rose-700/80 dark:text-rose-400">
              (0 Inbound Scheduled)
            </span>
          </div>

          {/* Inline Compact SKU Pills with Small Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Item 1: Anker */}
            <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-white px-2 py-1 shadow-xs dark:border-rose-900/40 dark:bg-card">
              <div className="text-[11px] leading-tight">
                <span className="font-medium text-foreground">Anker 20W</span>
                <span className="ml-1 text-[10px] text-muted-foreground font-mono">A-03</span>
              </div>
              <span className="font-mono text-[11px] font-bold text-rose-600">
                -8 pcs
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                (4/12)
              </span>
              <Link
                href="/purchases"
                className="h-6 flex items-center justify-center rounded bg-rose-600 px-2 text-[10px] font-medium text-white transition hover:bg-rose-700 active:scale-95"
              >
                Reorder
              </Link>
            </div>

            {/* Item 2: Oraimo */}
            <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-white px-2 py-1 shadow-xs dark:border-rose-900/40 dark:bg-card">
              <div className="text-[11px] leading-tight">
                <span className="font-medium text-foreground">Oraimo Toast 10</span>
                <span className="ml-1 text-[10px] text-muted-foreground font-mono">D-03</span>
              </div>
              <span className="font-mono text-[11px] font-bold text-rose-600">
                -8 pcs
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                (2/10)
              </span>
              <Link
                href="/purchases"
                className="h-6 flex items-center justify-center rounded bg-rose-600 px-2 text-[10px] font-medium text-white transition hover:bg-rose-700 active:scale-95"
              >
                Reorder
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Row 1: Zero Stock Critical Shortages Board & Quick Warehouse Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Out of Stock & Critical Shortage Alert Table */}
        <div className="lg:col-span-2">
          <ShortageMonitor />
        </div>

        {/* Stock Keeper Fast Operations */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="py-3 px-4">
            <div>
              <CardTitle className="text-sm font-bold">Warehouse Operations</CardTitle>
              <CardDescription className="text-xs">Audits, intake & label tasks</CardDescription>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded font-medium">
              Stock Keeper
            </span>
          </CardHeader>
          <CardContent className="p-3 space-y-2 flex-1">
            <Link
              href="/inventory/stock-counts"
              className="group p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 flex items-center justify-center font-bold">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">Physical Stock Audit</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Scan shelves & balance inventory</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/purchases"
              className="group p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">Receive Goods Shipment</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Inspect deliveries & post to catalog</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/products"
              className="group p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 flex items-center justify-center">
                  <Barcode className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">Barcode & Aisle Labels</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Print adhesive labels & verify barcodes</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/inventory/stock-counts"
              className="group p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">Discrepancy Log</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Loss, damage & adjustment reasons</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Live Stock Movement Audit Trail Ledger */}
      <StockMovementLedger limit={8} showFilters={true} />
    </div>
  );
};
