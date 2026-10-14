'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  TrendingUp,
  Download,
  Package,
  Truck,
  RotateCcw,
  Boxes,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { formatETB } from '@/lib/formatters';
import { exportToCSV } from '@/lib/export';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function ReportsPage() {
  const { sales, products, categories, suppliers, returns, addToast } = useApp();

  const [activeTab, setActiveTab] = useState<
    'sales' | 'products' | 'valuation' | 'suppliers' | 'returns'
  >('sales');
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'quarter'>('7days');

  // Chart data for Sales Trends
  const salesTrendData = useMemo(() => {
    return [
      { period: 'Day 1', revenue: 14200, cogs: 10100, grossProfit: 4100, orders: 4 },
      { period: 'Day 2', revenue: 18900, cogs: 13500, grossProfit: 5400, orders: 6 },
      { period: 'Day 3', revenue: 26500, cogs: 18700, grossProfit: 7800, orders: 9 },
      { period: 'Day 4', revenue: 21400, cogs: 15200, grossProfit: 6200, orders: 7 },
      { period: 'Day 5', revenue: 29800, cogs: 20900, grossProfit: 8900, orders: 11 },
      { period: 'Day 6', revenue: 32400, cogs: 22600, grossProfit: 9800, orders: 12 },
      { period: 'Day 7', revenue: 37500, cogs: 26100, grossProfit: 11400, orders: 14 },
    ];
  }, []);

  // Category Valuation Comparison Data for BarChart
  const categoryValuationData = useMemo(() => {
    return categories.map((cat) => {
      const prods = products.filter((p) => p.category === cat.name);
      const costTotal = prods.reduce((sum, p) => sum + p.costPrice * p.stockQuantity, 0);
      const retailTotal = prods.reduce(
        (sum, p) => sum + p.sellingPrice * p.stockQuantity,
        0
      );
      return {
        category: cat.name.split(' ')[0], // short label
        fullName: cat.name,
        costValue: costTotal,
        retailValue: retailTotal,
        potentialProfit: retailTotal - costTotal,
      };
    });
  }, [categories, products]);

  // Product Performance Table Data
  const productPerformanceData = useMemo(() => {
    return products.map((prod) => {
      const soldUnits = sales.reduce((sum, s) => {
        const item = s.items.find((i) => i.productId === prod.id);
        return sum + (item ? item.quantity : 0);
      }, 0);

      const revenue = soldUnits * prod.sellingPrice;
      const cogs = soldUnits * prod.costPrice;
      const profit = revenue - cogs;
      const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0';

      return {
        ...prod,
        soldUnits,
        revenue,
        profit,
        margin,
      };
    }).sort((a, b) => b.soldUnits - a.soldUnits);
  }, [products, sales]);

  // Supplier Purchasing Breakdown
  const supplierPurchaseData = useMemo(() => {
    return suppliers.map((sup) => ({
      name: sup.name,
      code: sup.code,
      totalPurchased: sup.totalPurchasedETB,
      balanceDue: sup.outstandingBalanceETB,
      terms: sup.paymentTerms,
    }));
  }, [suppliers]);

  // Returns Breakdown
  const returnsReasonData = useMemo(() => {
    const reasonCounts: Record<string, { count: number; totalRefund: number }> = {};
    returns.forEach((r) => {
      r.items.forEach((item) => {
        if (!reasonCounts[item.reason]) {
          reasonCounts[item.reason] = { count: 0, totalRefund: 0 };
        }
        reasonCounts[item.reason].count += item.quantity;
        reasonCounts[item.reason].totalRefund += item.refundAmount;
      });
    });

    return Object.entries(reasonCounts).map(([reason, data]) => ({
      reason: reason.replace('_', ' ').toUpperCase(),
      units: data.count,
      refundETB: data.totalRefund,
    }));
  }, [returns]);

  // Export current tab data
  const handleExportTabCSV = () => {
    if (activeTab === 'sales') {
      const headers = ['Period', 'Revenue (ETB)', 'COGS (ETB)', 'Gross Profit (ETB)', 'Orders Count'];
      const rows = salesTrendData.map((d) => [d.period, d.revenue, d.cogs, d.grossProfit, d.orders]);
      exportToCSV('sales_revenue_report', headers, rows);
    } else if (activeTab === 'products') {
      const headers = ['Product', 'SKU', 'Brand', 'Category', 'Units Sold', 'Revenue (ETB)', 'Gross Profit (ETB)', 'Margin %'];
      const rows = productPerformanceData.map((p) => [p.name, p.sku, p.brand, p.category, p.soldUnits, p.revenue, p.profit, `${p.margin}%`]);
      exportToCSV('product_performance_report', headers, rows);
    } else if (activeTab === 'valuation') {
      const headers = ['Category', 'Cost Valuation (ETB)', 'Retail Valuation (ETB)', 'Potential Markup (ETB)'];
      const rows = categoryValuationData.map((c) => [c.fullName, c.costValue, c.retailValue, c.potentialProfit]);
      exportToCSV('inventory_valuation_report', headers, rows);
    } else if (activeTab === 'suppliers') {
      const headers = ['Supplier Name', 'Code', 'Total Purchased (ETB)', 'Outstanding Balance (ETB)', 'Payment Terms'];
      const rows = supplierPurchaseData.map((s) => [s.name, s.code, s.totalPurchased, s.balanceDue, s.terms]);
      exportToCSV('supplier_purchases_report', headers, rows);
    } else {
      const headers = ['Return Reason', 'Units Returned', 'Refund Amount (ETB)'];
      const rows = returnsReasonData.map((r) => [r.reason, r.units, r.refundETB]);
      exportToCSV('returns_summary_report', headers, rows);
    }

    addToast({
      type: 'info',
      title: 'Report Exported',
      message: `Downloaded CSV for ${activeTab.toUpperCase()} analytics report.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Reports & Business Analytics
            </h1>
            <Badge variant="accent" size="sm">
              Demonstration Intelligence
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Sales volume, product margins, inventory valuation, and supplier performance metrics in Dire Dawa.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <select
            value={dateRange}
            onChange={(e) =>
              setDateRange(e.target.value as '7days' | '30days' | 'quarter')
            }
            className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days (Monthly)</option>
            <option value="quarter">Current Quarter (Q4)</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportTabCSV}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export Tab to CSV
          </Button>
        </div>
      </div>

      {/* Report Segmented Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'sales'
              ? 'bg-[#101827] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-[#D9A441]" />
          <span>Sales & Revenue</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'products'
              ? 'bg-[#101827] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4 text-[#D9A441]" />
          <span>Product Performance</span>
        </button>

        <button
          onClick={() => setActiveTab('valuation')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'valuation'
              ? 'bg-[#101827] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-4 h-4 text-[#D9A441]" />
          <span>Inventory Valuation</span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'suppliers'
              ? 'bg-[#101827] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-4 h-4 text-[#D9A441]" />
          <span>Supplier Purchases</span>
        </button>

        <button
          onClick={() => setActiveTab('returns')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'returns'
              ? 'bg-[#101827] text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-[#D9A441]" />
          <span>Returns Analysis</span>
        </button>
      </div>

      {/* Tab 1: Sales & Revenue */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Sales Revenue & Markup Gross Profit Curve</CardTitle>
                <CardDescription>
                  Tracking daily receipts against wholesale cost of goods sold in Dire Dawa
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <span className="w-3 h-3 rounded-full bg-[#101827]" />
                  Total Revenue (ETB)
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-[#16845B]">
                  <span className="w-3 h-3 rounded-full bg-[#16845B]" />
                  Gross Profit (ETB)
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={salesTrendData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="period"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#101827',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(val) => [formatETB(Number(val) || 0), '']}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#101827"
                      strokeWidth={3}
                      fill="#101827"
                      fillOpacity={0.15}
                      name="Revenue"
                    />
                    <Area
                      type="monotone"
                      dataKey="grossProfit"
                      stroke="#16845B"
                      strokeWidth={2.5}
                      fill="#16845B"
                      fillOpacity={0.25}
                      name="Gross Profit"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Product Performance */}
      {activeTab === 'products' && (
        <Card>
          <CardHeader>
            <CardTitle>Electronics Product Movement & Margin Matrix</CardTitle>
            <CardDescription>
              Units sold, generated revenue, and individual product gross margin contributions
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-4 text-center">Units Sold</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-right">Revenue (ETB)</th>
                  <th className="py-3 px-4 text-right">Gross Profit (ETB)</th>
                  <th className="py-3 px-4 text-center">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productPerformanceData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 text-xs">{item.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{item.sku}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{item.brand}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800 text-xs">
                      {item.soldUnits} pcs
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-700">
                      {formatETB(item.sellingPrice)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 text-xs">
                      {formatETB(item.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#16845B] text-xs">
                      {formatETB(item.profit)}
                    </td>
                    <td className="py-3 px-4 text-center text-xs font-semibold">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {item.margin}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Inventory Valuation */}
      {activeTab === 'valuation' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Inventory Valuation: Cost vs. Retail Potential</CardTitle>
                <CardDescription>
                  Comparison of invested wholesale capital vs potential sales revenue by category (ETB)
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryValuationData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="category"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#101827',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                      formatter={(val) => [formatETB(Number(val) || 0), '']}
                    />
                    <Legend />
                    <Bar
                      dataKey="costValue"
                      name="Cost Investment (ETB)"
                      fill="#101827"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="retailValue"
                      name="Retail Sales Value (ETB)"
                      fill="#D9A441"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 4: Supplier Analytics */}
      {activeTab === 'suppliers' && (
        <Card>
          <CardHeader>
            <CardTitle>Supplier Purchasing & Balance Overview</CardTitle>
            <CardDescription>
              Vendor volume allocation, payment terms, and outstanding credit balances
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4 font-mono">Code</th>
                  <th className="py-3 px-4">Payment Terms</th>
                  <th className="py-3 px-4 text-right">Total Purchased (ETB)</th>
                  <th className="py-3 px-4 text-right">Outstanding Balance (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supplierPurchaseData.map((sup) => (
                  <tr key={sup.code} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-900 text-xs">
                      {sup.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-xs">{sup.code}</td>
                    <td className="py-3 px-4 text-xs">
                      <Badge variant="neutral" size="sm">
                        {sup.terms}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900 text-xs">
                      {formatETB(sup.totalPurchased)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-xs text-amber-700">
                      {formatETB(sup.balanceDue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 5: Returns & Warranties */}
      {activeTab === 'returns' && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Returns & Defect Frequency</CardTitle>
            <CardDescription>
              Reasons for accessory returns, warranty claims, and total refunded capital in Dire Dawa
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Return Classification</th>
                  <th className="py-3 px-4 text-center">Units Count</th>
                  <th className="py-3 px-4 text-right">Total Refunded (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returnsReasonData.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-semibold text-slate-900 text-xs">
                      {r.reason}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800 text-xs">
                      {r.units} pcs
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-700 text-xs">
                      {formatETB(r.refundETB)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
