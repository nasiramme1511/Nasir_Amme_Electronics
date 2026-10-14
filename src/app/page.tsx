'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Receipt,
  Store,
  MapPin,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatETB, formatDate, formatNumber } from '@/lib/formatters';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardPage() {
  const { products, sales, settings, openReceiptModal } = useApp();

  // Metrics calculation
  const metrics = useMemo(() => {
    // Total Revenue from all sales
    const totalRevenue = sales.reduce((sum, s) => sum + s.grandTotal, 0);

    // Cost of Goods Sold (COGS)
    const totalCOGS = sales.reduce((sum, s) => {
      const saleCOGS = s.items.reduce(
        (iSum, item) => iSum + (item.costPrice || 0) * item.quantity,
        0
      );
      return sum + saleCOGS;
    }, 0);

    // Gross Profit = Revenue - COGS
    const grossProfit = totalRevenue - totalCOGS;
    const grossMarginPercent =
      totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0';

    // Total active inventory units
    const totalStockQuantity = products.reduce((sum, p) => sum + p.stockQuantity, 0);

    // Total Inventory Cost Valuation
    const totalStockCostValue = products.reduce(
      (sum, p) => sum + p.costPrice * p.stockQuantity,
      0
    );

    // Total Inventory Retail Potential Valuation
    const totalStockRetailValue = products.reduce(
      (sum, p) => sum + p.sellingPrice * p.stockQuantity,
      0
    );

    // Low stock items count
    const lowStockCount = products.filter(
      (p) => p.stockQuantity <= p.minStockThreshold
    ).length;

    // Out of stock items count
    const outOfStockCount = products.filter((p) => p.stockQuantity === 0).length;

    return {
      totalRevenue,
      totalCOGS,
      grossProfit,
      grossMarginPercent,
      totalStockQuantity,
      totalStockCostValue,
      totalStockRetailValue,
      lowStockCount,
      outOfStockCount,
      completedSalesCount: sales.length,
    };
  }, [sales, products]);

  // Dynamic 7-day Sales & Profit Trend Data for Recharts
  const chartData = useMemo(() => {
    return [
      { day: 'Thu 08', revenue: 14200, grossProfit: 4100, orders: 4 },
      { day: 'Fri 09', revenue: 18900, grossProfit: 5400, orders: 6 },
      { day: 'Sat 10', revenue: 26500, grossProfit: 7800, orders: 9 },
      { day: 'Sun 11', revenue: 21400, grossProfit: 6200, orders: 7 },
      { day: 'Mon 12', revenue: 29800, grossProfit: 8900, orders: 11 },
      { day: 'Tue 13', revenue: 32400, grossProfit: 9800, orders: 12 },
      { day: 'Today', revenue: metrics.totalRevenue, grossProfit: metrics.grossProfit, orders: metrics.completedSalesCount },
    ];
  }, [metrics]);

  // Top Selling Products (calculated from mock sales)
  const topSellingProducts = useMemo(() => {
    const productSalesMap: Record<
      string,
      { product: (typeof products)[0]; soldQty: number; revenue: number }
    > = {};

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (prod) {
          if (!productSalesMap[prod.id]) {
            productSalesMap[prod.id] = { product: prod, soldQty: 0, revenue: 0 };
          }
          productSalesMap[prod.id].soldQty += item.quantity;
          productSalesMap[prod.id].revenue += item.total;
        }
      });
    });

    return Object.values(productSalesMap)
      .sort((a, b) => b.soldQty - a.soldQty)
      .slice(0, 5);
  }, [sales, products]);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Store Notice Banner */}
      <div className="bg-gradient-to-r from-[#101827] via-[#1a2336] to-[#0f172a] rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-96 opacity-10 bg-[radial-gradient(#D9A441_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#D9A441] text-[#101827] text-xs font-bold uppercase tracking-wider">
                Retail Dashboard
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs flex items-center gap-1 border border-slate-700">
                <MapPin className="w-3 h-3 text-[#D9A441]" />
                Dire Dawa • Near B-Capital Hotel
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-xs border border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Store Open
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {settings.shopName}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time inventory management, point-of-sale checkout, goods receiving, and sales analytics. All financial data is presented in <strong>Ethiopian Birr (ETB)</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/sales/checkout">
              <Button
                variant="accent"
                size="lg"
                leftIcon={<ShoppingCart className="w-5 h-5" />}
              >
                Launch POS Checkout
              </Button>
            </Link>
            <Link href="/products">
              <Button
                variant="outline"
                size="lg"
                className="bg-slate-800/80 text-white border-slate-700 hover:bg-slate-700"
                leftIcon={<Package className="w-5 h-5" />}
              >
                Browse Catalog
              </Button>
            </Link>
          </div>
        </div>

        {/* Prototype & Financial Disclaimer Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-1.5 text-amber-300/90">
            <Sparkles className="w-4 h-4 text-[#D9A441] shrink-0" />
            <span>
              <strong>Demonstration Mode:</strong> Client-side state active. Financial numbers reflect local retail mock transactions.
            </span>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">
            TIN: {settings.tinNumber} | Cashier: Tigist Alem
          </span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Daily Revenue */}
        <StatCard
          title="Daily Revenue"
          value={formatETB(metrics.totalRevenue)}
          subtitle="Total gross receipts collected"
          icon={<DollarSign className="w-5 h-5" />}
          trend={{ value: '+14.2%', isPositive: true, label: 'vs yesterday' }}
          indicatorColor="accent"
        />

        {/* Gross Profit */}
        <StatCard
          title="Gross Profit (Markup)"
          value={formatETB(metrics.grossProfit)}
          subtitle={`Margin: ${metrics.grossMarginPercent}% (Rev - COGS)`}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={{ value: '+18.5%', isPositive: true, label: 'margin rate' }}
          indicatorColor="success"
        />

        {/* Inventory Valuation */}
        <StatCard
          title="Stock Valuation (Cost)"
          value={formatETB(metrics.totalStockCostValue)}
          subtitle={`${formatNumber(metrics.totalStockQuantity)} active items in store`}
          icon={<Boxes className="w-5 h-5" />}
          trend={{
            value: formatETB(metrics.totalStockRetailValue),
            isPositive: true,
            label: 'retail value',
          }}
          indicatorColor="primary"
        />

        {/* Low Stock Alerts */}
        <StatCard
          title="Low Stock Alerts"
          value={`${metrics.lowStockCount} Items`}
          subtitle={
            metrics.outOfStockCount > 0
              ? `${metrics.outOfStockCount} completely out of stock`
              : 'All other items above threshold'
          }
          icon={<AlertTriangle className="w-5 h-5" />}
          trend={{
            value: `${metrics.lowStockCount} items`,
            isPositive: false,
            label: 'need PO reorder',
          }}
          indicatorColor={metrics.lowStockCount > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Profit Distinction Notice Callout */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Accounting Note (Gross Profit vs. Net Profit):</strong> The{' '}
          <strong>Gross Profit ({formatETB(metrics.grossProfit)})</strong> shown above represents
          Sales Revenue minus direct Cost of Goods Sold (COGS). It is strictly gross margin.
          Authoritative Net Profit calculations (factoring in shop rent near B-Capital Hotel, staff
          salaries, electricity, and licensing taxes) will be integrated with the production
          backend accounting ledger in a later milestone.
        </div>
      </div>

      {/* Main Analytics Row: Sales Trend Area Chart & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Profit Trends Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Sales Revenue & Gross Profit Trends</CardTitle>
              <CardDescription>
                Daily revenue curve compared against product markup gross profit (ETB)
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-3 h-3 rounded-full bg-[#101827]" />
                Revenue
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-3 h-3 rounded-full bg-[#16845B]" />
                Gross Profit
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#101827" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#101827" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16845B" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#16845B" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="day"
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
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                    name="Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="grossProfit"
                    stroke="#16845B"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorProfit)"
                    name="Gross Profit"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Operations & Fast Actions */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Frequent retail and inventory shortcuts</CardDescription>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-500">
              Fast Access
            </span>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            <Link
              href="/sales/checkout"
              className="group p-3.5 rounded-xl border border-[#D9A441]/40 bg-[#fef7ea]/50 hover:bg-[#fef7ea] transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#D9A441] text-[#101827] flex items-center justify-center font-bold">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#101827]">POS Cashier Terminal</div>
                  <div className="text-xs text-slate-600">Scan items, apply discounts, issue receipts</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#D9A441] group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/products"
              className="group p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Manage Catalog</div>
                  <div className="text-xs text-slate-500">Add SKUs, update prices & barcodes</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/purchases"
              className="group p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Receive Goods</div>
                  <div className="text-xs text-slate-500">Inspect supplier deliveries & post to stock</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/inventory/stock-counts"
              className="group p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Physical Stock Count</div>
                  <div className="text-xs text-slate-500">Audit shelves & balance discrepancies</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Lower Row: Recent Sales with Receipt Triggers & Top-Selling Electronics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <CardTitle>Recent Sales Transactions</CardTitle>
                <CardDescription>
                  Live retail receipts issued today in Dire Dawa
                </CardDescription>
              </div>
              <Link href="/sales">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  View All History
                </Button>
              </Link>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 text-slate-500 text-xs font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Total (ETB)</th>
                  <th className="py-3 px-4 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.slice(0, 5).map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 text-xs">
                      {sale.receiptNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 text-xs">
                        {sale.customerName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatDate(sale.date)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {sale.items.length} line(s) (
                      {sale.items.reduce((s, i) => s + i.quantity, 0)} pcs)
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          sale.paymentMethod === 'telebirr'
                            ? 'accent'
                            : sale.paymentMethod === 'cbe_birr'
                            ? 'info'
                            : sale.paymentMethod === 'cash'
                            ? 'success'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {sale.paymentMethod.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatETB(sale.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openReceiptModal(sale)}
                        title="View & Print Receipt"
                        className="h-8 px-2 text-slate-600 hover:text-[#101827]"
                      >
                        <Receipt className="w-4 h-4 text-[#D9A441]" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Top-Selling Electronics */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Top-Selling Products</CardTitle>
              <CardDescription>Highest moving electronics this period</CardDescription>
            </div>
            <Link href="/products" className="text-xs text-[#93660a] hover:underline font-medium">
              View Catalog
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {topSellingProducts.map(({ product, soldQty, revenue }, idx) => (
              <div
                key={product.id}
                className="flex items-center justify-between pb-3 border-b border-slate-100 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 line-clamp-1 max-w-[170px]">
                      {product.name}
                    </h5>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{product.brand}</span>
                      <span>•</span>
                      <span className="font-medium text-[#16845B]">
                        {soldQty} units sold
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900">
                    {formatETB(revenue)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {product.stockQuantity} in stock
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
