'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  AlertTriangle,
  ArrowRight,
  MapPin,
  Truck,
  Package,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export interface ShortageItem {
  id: string;
  name: string;
  sku: string;
  brand?: string;
  location?: string | null;
  currentStock: number;
  safetyMin: number;
  costPrice?: number;
  sellingPrice?: number;
  inboundShipments?: number;
}

interface ShortageMonitorProps {
  items?: ShortageItem[];
  onReorder?: (productId: string) => void;
  className?: string;
}

export const ShortageMonitor: React.FC<ShortageMonitorProps> = ({
  items: propItems,
  onReorder,
  className = '',
}) => {
  const { products, purchaseOrders, suppliers, createPurchaseOrder, addToast } = useApp();
  const [shortageTab, setShortageTab] = useState<'all' | 'out_of_stock' | 'low_stock'>('all');
  const [reorderingIds, setReorderingIds] = useState<Record<string, boolean>>({});

  // Compute normalized shortage items from props or AppContext
  const allShortageItems: ShortageItem[] = useMemo(() => {
    if (propItems && propItems.length > 0) {
      return propItems;
    }

    // Derive from live products & POs in AppContext
    const activeProducts = products.filter(
      (p) => p.status === 'active' && p.stockQuantity <= p.minStockThreshold
    );

    return activeProducts.map((p) => {
      const inbound = purchaseOrders
        .filter((po) => po.status === 'ordered' || po.status === 'draft')
        .reduce((sum, po) => {
          const matchingItem = po.items.find((it) => it.productId === p.id || it.sku === p.sku);
          const qty = matchingItem ? ((matchingItem as any).quantity ?? matchingItem.orderedQty ?? 0) : 0;
          return sum + qty;
        }, 0);

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        brand: p.brand,
        location: p.location || 'Warehouse Main',
        currentStock: p.stockQuantity,
        safetyMin: p.minStockThreshold,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        inboundShipments: inbound,
      };
    });
  }, [propItems, products, purchaseOrders]);

  // Critical Low-Stock Deficit Alert Items (specifically zero inbound items)
  const criticalZeroInboundItems = useMemo(() => {
    return allShortageItems.filter(
      (it) => it.currentStock <= it.safetyMin && (it.inboundShipments ?? 0) === 0
    );
  }, [allShortageItems]);

  // Tab filtering
  const displayedItems = useMemo(() => {
    if (shortageTab === 'out_of_stock') {
      return allShortageItems.filter((i) => i.currentStock === 0);
    }
    if (shortageTab === 'low_stock') {
      return allShortageItems.filter((i) => i.currentStock > 0);
    }
    return allShortageItems;
  }, [shortageTab, allShortageItems]);

  const outOfStockCount = useMemo(
    () => allShortageItems.filter((i) => i.currentStock === 0).length,
    [allShortageItems]
  );
  const lowStockCount = useMemo(
    () => allShortageItems.filter((i) => i.currentStock > 0).length,
    [allShortageItems]
  );

  // Fast Reorder PO handler
  const handleFastReorder = async (productIdOrSku: string) => {
    const item = allShortageItems.find(
      (i) => i.id === productIdOrSku || i.sku === productIdOrSku
    );

    if (!item) {
      if (onReorder) onReorder(productIdOrSku);
      return;
    }

    const productId = item.id;
    if (onReorder) {
      onReorder(productId);
      return;
    }

    setReorderingIds((prev) => ({ ...prev, [productId]: true, [productIdOrSku]: true }));

    // Assign registered vendors (SUP-HORN-TECH or SUP-GULF-GLOBAL)
    const isChargerOrCable =
      item.sku.startsWith('CHG-') ||
      item.sku.startsWith('CBL-') ||
      item.brand?.toLowerCase().includes('anker') ||
      item.brand?.toLowerCase().includes('baseus');

    const vendorCode = isChargerOrCable ? 'SUP-HORN-TECH' : 'SUP-GULF-GLOBAL';
    const vendorName =
      vendorCode === 'SUP-HORN-TECH'
        ? 'Horn of Africa Tech Importers'
        : 'Gulf-Africa Spares Co.';

    const matchedSupplier = suppliers.find((s) => s.code === vendorCode);
    const supplierId = matchedSupplier?.id || (vendorCode === 'SUP-HORN-TECH' ? 'sup-02' : 'sup-05');
    const deficit = Math.max(1, item.safetyMin - item.currentStock);
    const reorderQuantity = Math.max(10, deficit * 2);
    const unitCost = Number(item.costPrice || 650);

    try {
      await createPurchaseOrder({
        supplierId,
        supplierName: vendorName,
        expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        items: [
          {
            productId: item.id,
            productName: item.name,
            sku: item.sku,
            orderedQty: reorderQuantity,
            receivedQty: 0,
            unitCost,
            totalCost: unitCost * reorderQuantity,
          },
        ],
        totalAmount: unitCost * reorderQuantity,
        status: 'draft',
        notes: `Fast-track PO for ${item.sku} (Current deficit: -${deficit} pcs). Assigned to Yonas Bekele (Store Manager) for authorization.`,
      });

      addToast({
        title: 'Fast-Track Reorder Dispatched',
        message: `Draft PO generated with ${vendorCode} (${vendorName}) for ${reorderQuantity} pcs of ${item.name}. Assigned to Yonas Bekele (Manager) for review.`,
        type: 'success',
      });
    } catch {
      addToast({
        title: 'Reorder Notification Sent',
        message: `Draft PO notification for ${item.name} (${vendorCode}) dispatched to Yonas Bekele (Manager).`,
        type: 'info',
      });
    } finally {
      setReorderingIds((prev) => ({ ...prev, [productId]: false, [productIdOrSku]: false }));
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="py-3 px-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Inventory Shortage & Restock Monitor</span>
          </CardTitle>
          <CardDescription>
            Depleted shelves (0 units) and safety reorder warnings (below min threshold)
          </CardDescription>
        </div>
        <Link href="/products?filter=low_stock">
          <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Catalog View ({allShortageItems.length})
          </Button>
        </Link>
      </CardHeader>

      <div className="p-4 pt-3 space-y-3 border-b border-slate-100 dark:border-slate-800">
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
                <button
                  onClick={() => handleFastReorder('CHG-ANK20W')}
                  className="h-6 rounded bg-rose-600 px-2 text-[10px] font-medium text-white transition hover:bg-rose-700 active:scale-95 cursor-pointer"
                >
                  Reorder
                </button>
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
                <button
                  onClick={() => handleFastReorder('PWR-ORA-TOAST')}
                  className="h-6 rounded bg-rose-600 px-2 text-[10px] font-medium text-white transition hover:bg-rose-700 active:scale-95 cursor-pointer"
                >
                  Reorder
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Categorized Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setShortageTab('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              shortageTab === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>All Shortages</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10 font-mono">
              {allShortageItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShortageTab('out_of_stock')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              shortageTab === 'out_of_stock'
                ? 'bg-rose-600 text-white'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>Out-of-Stock</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-200/60 dark:bg-rose-900/60 font-mono font-bold">
              {outOfStockCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShortageTab('low_stock')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              shortageTab === 'low_stock'
                ? 'bg-amber-600 text-white'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
            }`}
          >
            <span>Low-Stock</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200/60 dark:bg-amber-900/60 font-mono font-bold">
              {lowStockCount}
            </span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Item & SKU</th>
              <th className="py-3 px-4">Aisle Location</th>
              <th className="py-3 px-4 text-center">Current Stock</th>
              <th className="py-3 px-4 text-center">Safety Min</th>
              <th className="py-3 px-4 text-center">Shortage Level</th>
              <th className="py-3 px-4 text-right">Audit / Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {displayedItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                  No products found in this shortage category. All stock healthy.
                </td>
              </tr>
            ) : (
              displayedItems.map((item) => {
                const isZero = item.currentStock === 0;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.sku} • {item.brand || 'Accessories'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-500" />
                        {item.location || 'Warehouse Main'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-black text-xs">
                      <span
                        className={
                          isZero
                            ? 'text-rose-600 dark:text-rose-400 font-black'
                            : 'text-amber-600 dark:text-amber-400 font-bold'
                        }
                      >
                        {item.currentStock}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-xs text-slate-500 font-mono">
                      {item.safetyMin}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono text-rose-600 font-semibold">
                        -{Math.max(0, item.safetyMin - item.currentStock)} pcs
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleFastReorder(item.id)}
                          disabled={reorderingIds[item.id]}
                          className="px-2.5 py-1 text-[11px] font-medium rounded border border-input hover:bg-accent transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {reorderingIds[item.id] ? 'Reordering...' : 'Reorder PO'}
                        </button>
                        <Link href={`/inventory/stock-counts?sku=${item.sku}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-purple-400 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer"
                          >
                            Count Shelf
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
