'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Boxes,
  FileCheck,
  Info,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { formatETB } from '@/lib/formatters';

interface CountRow {
  productId: string;
  name: string;
  sku: string;
  category: string;
  costPrice: number;
  systemStock: number;
  countedStock: number | '';
}

export default function StockCountsPage() {
  const { products, performStockAdjustment, addToast } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [adjustmentReason, setAdjustmentReason] = useState<string>(
    'Quarterly Physical Cycle Count'
  );
  const [auditorName, setAuditorName] = useState<string>('Nasir Amme (Admin)');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Initialize counts with current system stock
  const [counts, setCounts] = useState<Record<string, number | ''>>(() => {
    const map: Record<string, number | ''> = {};
    products.forEach((p) => {
      map[p.id] = p.stockQuantity;
    });
    return map;
  });

  // Unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category)));
  }, [products]);

  // Handle count change
  const handleCountChange = (productId: string, val: string) => {
    setCounts((prev) => ({
      ...prev,
      [productId]: val === '' ? '' : Math.max(0, parseInt(val, 10) || 0),
    }));
  };

  // Reset all to system stock
  const handleResetToSystem = () => {
    const map: Record<string, number | ''> = {};
    products.forEach((p) => {
      map[p.id] = p.stockQuantity;
    });
    setCounts(map);
    addToast({
      type: 'info',
      title: 'Counts Reset',
      message: 'All counted values reset to current system stock.',
    });
  };

  // Rows and variance analysis
  const countRows: CountRow[] = useMemo(() => {
    return products
      .filter((p) => {
        const matchSearch =
          searchTerm === '' ||
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchTerm.toLowerCase());

        const matchCat = selectedCategory === 'all' || p.category === selectedCategory;

        return matchSearch && matchCat;
      })
      .map((p) => ({
        productId: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        costPrice: p.costPrice,
        systemStock: p.stockQuantity,
        countedStock: counts[p.id] !== undefined ? counts[p.id] : p.stockQuantity,
      }));
  }, [products, searchTerm, selectedCategory, counts]);

  // Discrepancy analysis
  const discrepancies = useMemo(() => {
    const itemsWithVariance: {
      productId: string;
      name: string;
      sku: string;
      systemStock: number;
      countedStock: number;
      varianceUnits: number;
      varianceCostETB: number;
    }[] = [];

    let totalPositiveUnits = 0;
    let totalNegativeUnits = 0;
    let netVarianceCostETB = 0;

    products.forEach((p) => {
      const counted = counts[p.id];
      if (counted !== '' && counted !== undefined && counted !== p.stockQuantity) {
        const diff = Number(counted) - p.stockQuantity;
        const costDiff = diff * p.costPrice;

        if (diff > 0) totalPositiveUnits += diff;
        if (diff < 0) totalNegativeUnits += Math.abs(diff);
        netVarianceCostETB += costDiff;

        itemsWithVariance.push({
          productId: p.id,
          name: p.name,
          sku: p.sku,
          systemStock: p.stockQuantity,
          countedStock: Number(counted),
          varianceUnits: diff,
          varianceCostETB: costDiff,
        });
      }
    });

    return {
      items: itemsWithVariance,
      totalDiscrepantItems: itemsWithVariance.length,
      totalPositiveUnits,
      totalNegativeUnits,
      netVarianceCostETB,
    };
  }, [products, counts]);

  // Commit Adjustment
  const handleCommitAdjustment = () => {
    if (discrepancies.items.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Discrepancies',
        message: 'All counted items match current system stock perfectly.',
      });
      setIsPreviewModalOpen(false);
      return;
    }

    const adjustments = discrepancies.items.map((item) => ({
      productId: item.productId,
      newStock: item.countedStock,
      reason: adjustmentReason,
      user: auditorName,
    }));

    performStockAdjustment(adjustments);
    setIsPreviewModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Stock Counts & Audit Tool
            </h1>
            <Badge variant="accent" size="sm">
              Cycle Count
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Conduct physical retail inventory audits and post verified stock reconciliation adjustments in Dire Dawa.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToSystem}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Reset All
          </Button>

          <Button
            variant="accent"
            size="sm"
            onClick={() => setIsPreviewModalOpen(true)}
            leftIcon={<FileCheck className="w-4 h-4" />}
            disabled={discrepancies.totalDiscrepantItems === 0}
          >
            Review Adjustments ({discrepancies.totalDiscrepantItems})
          </Button>
        </div>
      </div>

      {/* Discrepancy Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-[#D9A441]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase">
                Items with Variance
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {discrepancies.totalDiscrepantItems} Product(s)
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase">
                Found Excess Stock
              </span>
              <div className="text-xl font-bold text-emerald-700 mt-1 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +{discrepancies.totalPositiveUnits} Units
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase">
                Net Variance Valuation
              </span>
              <div
                className={`text-xl font-bold mt-1 ${
                  discrepancies.netVarianceCostETB < 0
                    ? 'text-rose-600'
                    : discrepancies.netVarianceCostETB > 0
                    ? 'text-emerald-700'
                    : 'text-slate-900'
                }`}
              >
                {formatETB(discrepancies.netVarianceCostETB)}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Audit Guide */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Physical Stock Count Instructions:</strong> Enter the actual on-shelf unit counts observed in store bins and display cabinets. Differences are highlighted automatically in real-time. Click <strong>&quot;Review Adjustments&quot;</strong> to preview the accounting and inventory changes before updating live stock levels.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <div className="p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search items by title or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#D9A441] bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Audit Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-600 text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Item & SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">System Stock</th>
                <th className="py-3 px-4 text-center w-36">Physical Count</th>
                <th className="py-3 px-4 text-center">Variance (Units)</th>
                <th className="py-3 px-4 text-right">Variance (ETB)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {countRows.map((row) => {
                const counted = row.countedStock === '' ? row.systemStock : row.countedStock;
                const diff = counted - row.systemStock;
                const valueDiff = diff * row.costPrice;
                const hasVariance = diff !== 0;

                return (
                  <tr
                    key={row.productId}
                    className={`transition-colors ${
                      hasVariance ? 'bg-amber-50/40 hover:bg-amber-50/60' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 text-xs line-clamp-1 max-w-xs">
                        {row.name}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">{row.sku}</div>
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-600 truncate max-w-[140px]">
                      {row.category}
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                      {row.systemStock} pcs
                    </td>

                    {/* Counted input */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min="0"
                        value={row.countedStock}
                        onChange={(e) => handleCountChange(row.productId, e.target.value)}
                        className={`w-24 text-center px-2 py-1.5 rounded-lg border font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#D9A441] ${
                          hasVariance
                            ? 'border-amber-400 bg-amber-50 text-amber-900'
                            : 'border-slate-300 bg-white text-slate-900'
                        }`}
                      />
                    </td>

                    {/* Variance Units */}
                    <td className="py-3 px-4 text-center">
                      {hasVariance ? (
                        <span
                          className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                            diff > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {diff > 0 ? `+${diff}` : diff} pcs
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Match (0)</span>
                      )}
                    </td>

                    {/* Variance ETB */}
                    <td className="py-3 px-4 text-right">
                      {hasVariance ? (
                        <span
                          className={`font-bold text-xs ${
                            valueDiff > 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {valueDiff > 0 ? `+${formatETB(valueDiff)}` : formatETB(valueDiff)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">0.00 ETB</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {hasVariance ? (
                        <Badge variant="warning" size="sm">
                          Discrepancy
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          Verified
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Adjustment Preview Modal */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        size="lg"
        title="Stock Adjustment Reconciliation Preview"
        description="Review proposed physical count debits and credits before committing to active inventory."
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-500">
              Net Impact: <strong>{formatETB(discrepancies.netVarianceCostETB)}</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={handleCommitAdjustment}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Commit Adjustments
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Audit / Adjustment Reason *
              </label>
              <select
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              >
                <option value="Quarterly Physical Cycle Count">Quarterly Physical Cycle Count</option>
                <option value="Damaged in Display Showcase">Damaged in Display Showcase</option>
                <option value="Counting Error Correction">Counting Error Correction</option>
                <option value="Unrecorded Retail Shrinkage">Unrecorded Retail Shrinkage</option>
                <option value="Supplier Package Miscount">Supplier Package Miscount</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Auditing Officer
              </label>
              <input
                type="text"
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Product Name</th>
                  <th className="py-2 px-3 text-center">System</th>
                  <th className="py-2 px-3 text-center">Counted</th>
                  <th className="py-2 px-3 text-center">Adjustment</th>
                  <th className="py-2 px-3 text-right">Valuation Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {discrepancies.items.map((item) => (
                  <tr key={item.productId} className="hover:bg-slate-50">
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                    </td>
                    <td className="py-2 px-3 text-center text-slate-600">
                      {item.systemStock} pcs
                    </td>
                    <td className="py-2 px-3 text-center font-bold text-slate-900">
                      {item.countedStock} pcs
                    </td>
                    <td className="py-2 px-3 text-center font-bold">
                      <span
                        className={
                          item.varianceUnits > 0 ? 'text-emerald-700' : 'text-rose-700'
                        }
                      >
                        {item.varianceUnits > 0
                          ? `+${item.varianceUnits}`
                          : item.varianceUnits}{' '}
                        pcs
                      </span>
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-bold ${
                        item.varianceCostETB > 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {item.varianceCostETB > 0
                        ? `+${formatETB(item.varianceCostETB)}`
                        : formatETB(item.varianceCostETB)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            * Committing will adjust product inventory records and generate corresponding stock movement ledger entries for Nasir Amme Electronics audit compliance.
          </p>
        </div>
      </Modal>
    </div>
  );
}
