"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  fetchLiveCatalog,
  fetchCatalogMetrics,
  ProductInventoryDTO,
  CatalogMetricsDTO,
} from "@/app/actions/catalog";
import {
  Package,
  Search,
  Barcode,
  RefreshCw,
  Check,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Layers,
  ArrowUpDown,
} from "lucide-react";

export default function ProductCatalogLive() {
  const [products, setProducts] = useState<ProductInventoryDTO[]>([]);
  const [metrics, setMetrics] = useState<CatalogMetricsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"ALL" | "LOW">("ALL");
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadData = () => {
    setLoading(true);
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const [catalogData, metricsData] = await Promise.all([
          fetchLiveCatalog(),
          fetchCatalogMetrics(),
        ]);
        setProducts(catalogData);
        setMetrics(metricsData);
      } catch (err) {
        console.error("Error fetching live PostgreSQL data:", err);
        setErrorMessage("Failed to load catalog data from PostgreSQL database.");
      } finally {
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyBarcode = (barcode: string) => {
    if (!barcode) return;
    navigator.clipboard.writeText(barcode);
    setCopiedBarcode(barcode);
    setTimeout(() => setCopiedBarcode(null), 2000);
  };

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search));
    const matchesStock = stockFilter === "ALL" || p.stock <= p.minThreshold;
    return matchesSearch && matchesStock;
  });

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">
              Live Product Catalog & Stock Ledger
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Connected directly to PostgreSQL via Prisma ORM ledger aggregations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading || isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || isPending ? "animate-spin text-indigo-400" : ""}`} />
            Sync Ledger
          </button>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Catalog SKUs</span>
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="mt-1 text-xl font-bold font-mono text-white">
              {metrics.totalSkus}{" "}
              <span className="text-xs font-sans text-slate-500 font-normal">items</span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500 font-mono">
              {metrics.totalUnits} Units on Hand
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Cost Basis Valuation</span>
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="mt-1 text-xl font-bold font-mono text-slate-200">
              {metrics.totalCostValuation.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
              <span className="text-xs font-sans text-slate-500 font-normal">ETB</span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500 font-mono">Weighted Average Cost</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Retail Value Asset</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-1 text-xl font-bold font-mono text-emerald-400">
              {metrics.totalRetailValuation.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
              <span className="text-xs font-sans text-slate-500 font-normal">ETB</span>
            </div>
            <div className="mt-0.5 text-[11px] text-emerald-500/80 font-mono">
              Margin Potential:{" "}
              {(
                ((metrics.totalRetailValuation - metrics.totalCostValuation) /
                  (metrics.totalRetailValuation || 1)) *
                100
              ).toFixed(1)}
              %
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Depletion Alerts</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div
              className={`mt-1 text-xl font-bold font-mono ${
                metrics.lowStockCount > 0 ? "text-amber-400" : "text-slate-400"
              }`}
            >
              {metrics.lowStockCount}{" "}
              <span className="text-xs font-sans text-slate-500 font-normal">SKUs</span>
            </div>
            <div className="mt-0.5 text-[11px] text-amber-500/80 font-mono">
              Below Reorder Level
            </div>
          </div>
        </div>
      )}

      {/* Filter Ribbon */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search live SKUs, barcodes, or titles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Stock Levels ({products.length})</option>
            <option value="LOW">
              Low Stock Depletions (
              {products.filter((p) => p.stock <= p.minThreshold).length})
            </option>
          </select>
          <span className="text-xs font-mono text-slate-400">
            Showing {filtered.length} SKUs
          </span>
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            onClick={loadData}
            className="underline hover:text-white font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Live Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-slate-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
            <span>Fetching ledger aggregates from PostgreSQL database...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No products match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-3 px-4">Item & Barcode</th>
                  <th className="py-3 px-4 text-right">Retail Price</th>
                  <th className="py-3 px-4 text-right">Landed Cost</th>
                  <th className="py-3 px-4 text-center">Gross Markup</th>
                  <th className="py-3 px-4 text-center">Ledger Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filtered.map((item) => {
                  const markup = item.retailPrice - item.costPrice;
                  const marginPct =
                    item.retailPrice > 0
                      ? Math.round((markup / item.retailPrice) * 100)
                      : 0;
                  const isLow = item.stock <= item.minThreshold;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100">{item.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] text-indigo-400">
                            {item.sku}
                          </span>
                          {item.barcode && (
                            <>
                              <span className="text-slate-600">•</span>
                              <button
                                onClick={() => handleCopyBarcode(item.barcode)}
                                className="font-mono text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                                title="Click to copy barcode"
                              >
                                <Barcode className="w-3 h-3 text-slate-500" />
                                <span>{item.barcode}</span>
                                {copiedBarcode === item.barcode && (
                                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                        {item.retailPrice.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        <span className="text-[10px] text-slate-400">ETB</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        {item.costPrice.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        <span className="text-[10px] text-slate-500">ETB</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          +{marginPct}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span
                          className={`font-bold ${
                            isLow ? "text-amber-400" : "text-slate-200"
                          }`}
                        >
                          {item.stock} pcs
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          min {item.minThreshold}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
