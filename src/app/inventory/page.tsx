'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { MovementType } from '@/types';
import {
  Search,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatDate } from '@/lib/formatters';
import { exportToCSV } from '@/lib/export';

export default function InventoryMovementsPage() {
  const { stockMovements, products, addToast } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');

  // Low stock calculation
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stockQuantity <= p.minStockThreshold);
  }, [products]);

  // Movement type label helper
  const renderMovementBadge = (type: MovementType) => {
    switch (type) {
      case 'sale':
        return (
          <Badge variant="neutral" size="sm">
            POS Sale
          </Badge>
        );
      case 'purchase_receive':
        return (
          <Badge variant="success" size="sm">
            Goods Received
          </Badge>
        );
      case 'return_restock':
        return (
          <Badge variant="info" size="sm">
            Return Restock
          </Badge>
        );
      case 'damage_loss':
        return (
          <Badge variant="danger" size="sm">
            Damage Write-Off
          </Badge>
        );
      case 'stock_count_adjustment':
        return (
          <Badge variant="warning" size="sm">
            Count Adjustment
          </Badge>
        );
      case 'manual_correction':
      default:
        return (
          <Badge variant="neutral" size="sm">
            Manual Entry
          </Badge>
        );
    }
  };

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return stockMovements.filter((m) => {
      const matchSearch =
        searchTerm === '' ||
        m.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.performedBy.toLowerCase().includes(searchTerm.toLowerCase());

      const matchType = selectedType === 'all' || m.type === selectedType;
      const matchProd = selectedProduct === 'all' || m.productId === selectedProduct;

      return matchSearch && matchType && matchProd;
    });
  }, [stockMovements, searchTerm, selectedType, selectedProduct]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Timestamp',
      'Product Name',
      'SKU',
      'Movement Type',
      'Qty Change',
      'Previous Stock',
      'New Stock',
      'Reference #',
      'Logged By',
      'Audit Notes',
    ];

    const rows = filteredMovements.map((m) => [
      formatDate(m.timestamp),
      m.productName,
      m.sku,
      m.type,
      m.quantity > 0 ? `+${m.quantity}` : m.quantity,
      m.previousStock,
      m.newStock,
      m.referenceNumber,
      m.performedBy,
      m.notes,
    ]);

    exportToCSV('nasir_amme_stock_movements_ledger', headers, rows);
    addToast({
      type: 'info',
      title: 'Ledger Exported',
      message: `${filteredMovements.length} movement records exported to CSV.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Stock Movements Ledger
            </h1>
            <Badge variant="accent" size="sm">
              {stockMovements.length} Entries
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Complete inventory audit trail recording all retail sales, PO goods receiving, returns, and adjustments.
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
          <Link href="/inventory/stock-counts">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<ClipboardList className="w-4 h-4" />}
            >
              Start Stock Count
            </Button>
          </Link>
        </div>
      </div>

      {/* Low Stock Warning Cards if any */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold text-amber-950">
                Low Stock Threshold Alerts ({lowStockProducts.length} Items Require Restocking)
              </h3>
            </div>
            <Link
              href="/purchases"
              className="text-xs font-semibold text-[#93660a] hover:underline flex items-center gap-1"
            >
              <span>Draft Restock PO</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockProducts.map((p) => (
              <div
                key={p.id}
                className="bg-white p-3 rounded-xl border border-amber-200/70 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-900 text-xs line-clamp-1 max-w-[180px]">
                    {p.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">{p.sku}</div>
                </div>
                <div className="text-right">
                  <span
                    className={`font-bold text-xs ${
                      p.stockQuantity === 0 ? 'text-rose-600' : 'text-amber-700'
                    }`}
                  >
                    {p.stockQuantity} pcs left
                  </span>
                  <div className="text-[10px] text-slate-400">min {p.minStockThreshold}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by product, SKU, receipt #, or staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#D9A441] bg-slate-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              <option value="all">All Movement Types</option>
              <option value="sale">Sales (POS Checkouts)</option>
              <option value="purchase_receive">Goods Received (Supplier POs)</option>
              <option value="return_restock">Customer Return Restock</option>
              <option value="damage_loss">Damage / Breakage Loss</option>
              <option value="stock_count_adjustment">Audit Stock Adjustments</option>
            </select>

            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D9A441] max-w-[200px]"
            >
              <option value="all">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Movements Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-600 text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Product & SKU</th>
                <th className="py-3 px-4">Movement Type</th>
                <th className="py-3 px-4 text-center">Change (Units)</th>
                <th className="py-3 px-4 text-center">Stock Transition</th>
                <th className="py-3 px-4">Reference #</th>
                <th className="py-3 px-4">Performed By</th>
                <th className="py-3 px-4">Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.map((movement) => {
                const isPositive = movement.quantity > 0;

                return (
                  <tr key={movement.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {formatDate(movement.timestamp)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 text-xs line-clamp-1 max-w-xs">
                        {movement.productName}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {movement.sku}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {renderMovementBadge(movement.type)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded-full ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isPositive ? `+${movement.quantity}` : movement.quantity} pcs
                        </span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs text-slate-600 font-mono">
                      <span>{movement.previousStock}</span>
                      <span className="mx-1.5 text-slate-400">→</span>
                      <span className="font-bold text-slate-900">{movement.newStock}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-800">
                      {movement.referenceNumber}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700">
                      {movement.performedBy}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                      {movement.notes}
                    </td>
                  </tr>
                );
              })}

              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    No stock movements found matching current search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
