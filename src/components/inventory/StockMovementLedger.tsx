'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Boxes,
  TrendingDown,
  TrendingUp,
  Search,
  Download,
  Filter,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/formatters';
import { exportToCSV } from '@/lib/export';

function formatRowDate(val: string | Date | undefined | null): string {
  if (!val) return '—';
  if (val instanceof Date) return formatDate(val.toISOString());
  return formatDate(val);
}

export interface StockMovementRow {
  id: string;
  timestamp?: string | Date;
  occurredAt?: string | Date;
  createdAt?: string | Date;
  productId?: string;
  productName?: string;
  sku?: string;
  product?: {
    id?: string;
    name?: string;
    title?: string;
    sku?: string;
    brand?: string;
  };
  movementType?: string;
  type?: string;
  transactionType?: string;
  quantity?: number;
  quantityDelta?: number;
  previousStock?: number;
  newStock?: number;
  balanceAfter?: number;
  referenceNumber?: string;
  notes?: string;
  reason?: string;
  performedBy?: string;
  actorId?: string;
  actor?: {
    id?: string;
    fullName?: string;
    role?: string;
  } | null;
}

interface StockMovementLedgerProps {
  movements?: StockMovementRow[];
  limit?: number;
  showFilters?: boolean;
  className?: string;
}

export const StockMovementLedger: React.FC<StockMovementLedgerProps> = ({
  movements: propMovements,
  limit,
  showFilters = false,
  className = '',
}) => {
  const { stockMovements, addToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Normalize source records
  const allRows: StockMovementRow[] = useMemo(() => {
    const raw = propMovements && propMovements.length > 0 ? propMovements : stockMovements;

    return raw.map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp || row.occurredAt || row.createdAt || new Date().toISOString(),
      productId: row.productId,
      productName: row.productName || row.product?.title || row.product?.name || 'Product',
      sku: row.sku || row.product?.sku || 'SKU',
      movementType: row.movementType || row.type || row.transactionType,
      type: row.type || row.movementType,
      transactionType: row.transactionType || row.movementType || row.type,
      quantity: row.quantity ?? row.quantityDelta ?? 0,
      quantityDelta: row.quantityDelta ?? row.quantity ?? 0,
      previousStock: row.previousStock ?? 0,
      newStock: row.newStock ?? row.balanceAfter ?? 0,
      balanceAfter: row.balanceAfter ?? row.newStock ?? 0,
      referenceNumber: row.referenceNumber || 'N/A',
      notes: row.notes || row.reason || '',
      performedBy: row.performedBy || (row.actor?.fullName ? `${row.actor.fullName} (${row.actor.role})` : row.actorId || 'System'),
      actor: row.actor,
    }));
  }, [propMovements, stockMovements]);

  // Filtering
  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      const matchSearch =
        searchTerm === '' ||
        (r.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (r.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (r.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (r.performedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

      const actualType = r.movementType || r.type || r.transactionType;
      const matchType = selectedType === 'all' || actualType === selectedType;

      return matchSearch && matchType;
    });
  }, [allRows, searchTerm, selectedType]);

  const displayedRows = limit ? filteredRows.slice(0, limit) : filteredRows;

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
      'Performed By',
      'Notes',
    ];

    const rows = filteredRows.map((r) => [
      formatRowDate(r.timestamp),
      r.productName,
      r.sku,
      r.movementType || r.type || r.transactionType || 'POS_SALE',
      (r.quantity ?? 0) > 0 ? `+${r.quantity}` : (r.quantity ?? 0),
      r.previousStock,
      r.newStock,
      r.referenceNumber,
      r.actor?.fullName ? `${r.actor.fullName} (${r.actor.role})` : r.performedBy || 'System',
      r.notes,
    ]);

    exportToCSV('nasir_amme_stock_movements_ledger', headers, rows);
    addToast({
      type: 'info',
      title: 'Ledger Exported',
      message: `${filteredRows.length} movement records exported to CSV.`,
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-purple-500" />
              <span>Real-Time Stock Movement Audit Ledger</span>
            </CardTitle>
            <CardDescription>
              Authoritative record of every item received, sold, returned, or adjusted
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="neutral" size="sm">
              {allRows.length} Total Logs
            </Badge>
            {showFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Export CSV
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by product, SKU, reference #, or staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/60 dark:text-white"
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            >
              <option value="all">All Movement Types</option>
              <option value="sale">Sales (POS)</option>
              <option value="purchase_receive">Goods Received</option>
              <option value="return_restock">Return Restock</option>
              <option value="damage_loss">Damage / Loss</option>
              <option value="stock_count_adjustment">Count Adjustment</option>
              <option value="manual_correction">Manual Correction</option>
            </select>
          </div>
        )}
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Product / SKU</th>
              <th className="py-3 px-4">Movement Type</th>
              <th className="py-3 px-4 text-center">Delta Qty</th>
              <th className="py-3 px-4 text-center">Previous → New</th>
              <th className="py-3 px-4">Reference #</th>
              <th className="py-3 px-4 text-right">Performed By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {displayedRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                  No movement records found matching query.
                </td>
              </tr>
            ) : (
              displayedRows.map((row) => {
                const qty = row.quantity ?? row.quantityDelta ?? 0;
                const isPositive = qty > 0;

                return (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {formatRowDate(row.timestamp)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        {row.productName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {row.sku}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {row.movementType || row.type || row.transactionType || 'POS_SALE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-0.5 font-black text-xs px-2 py-0.5 rounded-full ${
                          isPositive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {isPositive ? `+${qty}` : qty}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-xs font-mono text-slate-600 dark:text-slate-300">
                      {row.previousStock} → <strong className="text-slate-900 dark:text-white">{row.newStock}</strong>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">
                      {row.referenceNumber || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right text-xs font-medium text-slate-700 dark:text-slate-300">
                      <span>
                        {row.actor?.fullName
                          ? `${row.actor.fullName} (${row.actor.role})`
                          : row.performedBy || 'System'}
                      </span>
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
