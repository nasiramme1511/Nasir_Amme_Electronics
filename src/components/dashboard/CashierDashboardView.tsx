'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import {
  ShoppingCart,
  Receipt,
  Smartphone,
  CreditCard,
  RotateCcw,
  Search,
  ArrowRight,
  Printer,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatETB, formatDate } from '@/lib/formatters';

export const CashierDashboardView: React.FC = () => {
  const { sales, products, openReceiptModal } = useApp();
  const { user: authUser } = useAuth();

  // Cashier metrics
  const cashierMetrics = useMemo(() => {
    let cashTotal = 0;
    let telebirrTotal = 0;
    let cbeBirrTotal = 0;
    let otherTotal = 0;

    sales.forEach((s) => {
      if (s.paymentMethod === 'cash') cashTotal += s.grandTotal;
      else if (s.paymentMethod === 'telebirr') telebirrTotal += s.grandTotal;
      else if (s.paymentMethod === 'cbe_birr') cbeBirrTotal += s.grandTotal;
      else otherTotal += s.grandTotal;
    });

    const totalRevenue = cashTotal + telebirrTotal + cbeBirrTotal + otherTotal;
    const completedCount = sales.length;

    // Items sold count
    const totalItemsSold = sales.reduce(
      (sum, s) => sum + s.items.reduce((iSum, item) => iSum + item.quantity, 0),
      0
    );

    return {
      cashTotal,
      telebirrTotal,
      cbeBirrTotal,
      otherTotal,
      totalRevenue,
      completedCount,
      totalItemsSold,
    };
  }, [sales]);

  return (
    <div className="space-y-6">
      {/* 4 Cashier & Till KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Cash in Register Till"
          value={formatETB(cashierMetrics.cashTotal)}
          subtitle="Physical cash in register drawer"
          icon={<Wallet className="w-5 h-5" />}
          trend={{ value: 'In Drawer', isPositive: true, label: 'cash counted' }}
          indicatorColor="success"
        />

        <StatCard
          title="Telebirr Collections"
          value={formatETB(cashierMetrics.telebirrTotal)}
          subtitle="Mobile money digital receipts"
          icon={<Smartphone className="w-5 h-5" />}
          trend={{ value: 'Digital', isPositive: true, label: 'instant confirmation' }}
          indicatorColor="accent"
        />

        <StatCard
          title="CBE Birr Collections"
          value={formatETB(cashierMetrics.cbeBirrTotal)}
          subtitle="Commercial Bank digital tenders"
          icon={<CreditCard className="w-5 h-5" />}
          trend={{ value: 'Direct Bank', isPositive: true, label: 'verified payments' }}
          indicatorColor="primary"
        />

        <StatCard
          title="Today's Receipts Issued"
          value={`${cashierMetrics.completedCount} Tickets`}
          subtitle={`${cashierMetrics.totalItemsSold} electronic items scanned`}
          icon={<Receipt className="w-5 h-5" />}
          trend={{ value: '100% Issued', isPositive: true, label: 'with TIN' }}
          indicatorColor="primary"
        />
      </div>

      {/* POS Terminal Quick Action */}
      <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Point of Sale Register Terminal
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Process customer checkout, scan barcodes, and issue authentic thermal receipts.
            </p>
          </div>
        </div>

        <Link href="/sales/checkout">
          <Button
            variant="accent"
            size="lg"
            className="font-black text-sm px-6 py-3 shadow-md hover:scale-102 active:scale-98 transition-all"
            leftIcon={<ShoppingCart className="w-5 h-5" />}
          >
            OPEN POS CHECKOUT
          </Button>
        </Link>
      </div>

      {/* Row: Recent Receipts Table & Shift Tender Reconciliation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Issued Receipts Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-500" />
                  <span>Recent Receipts Issued Today</span>
                </CardTitle>
                <CardDescription>
                  Click the receipt icon to instantly reprint or view ticket details
                </CardDescription>
              </div>
              <Link href="/sales">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  View All Receipts
                </Button>
              </Link>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Tender Method</th>
                  <th className="py-3 px-4 text-center">Lines</th>
                  <th className="py-3 px-4 text-right">Total (ETB)</th>
                  <th className="py-3 px-4 text-center">Print Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sales.slice(0, 6).map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white text-xs">
                      {sale.receiptNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white text-xs">
                        {sale.customerName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatDate(sale.date)}
                      </div>
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
                    <td className="py-3 px-4 text-center text-xs text-slate-600 dark:text-slate-300">
                      {sale.items.reduce((s, i) => s + i.quantity, 0)} pcs
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                      {formatETB(sale.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReceiptModal(sale)}
                        title="Reprint & View Receipt"
                        leftIcon={<Printer className="w-3.5 h-3.5" />}
                        className="h-8 text-xs font-bold text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700/80 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                      >
                        Reprint
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Shift Drawer Tender Breakdown & Cashier Tools */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Shift Drawer Balance</CardTitle>
                <CardDescription>Payment tenders breakdown for current shift</CardDescription>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded">
                Live Reconciliation
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cash in Drawer */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Cash in Drawer
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatETB(cashierMetrics.cashTotal)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{
                      width: `${
                        cashierMetrics.totalRevenue > 0
                          ? (cashierMetrics.cashTotal / cashierMetrics.totalRevenue) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Telebirr */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D9A441]" />
                    Telebirr Digital
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatETB(cashierMetrics.telebirrTotal)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#D9A441] h-full rounded-full transition-all"
                    style={{
                      width: `${
                        cashierMetrics.totalRevenue > 0
                          ? (cashierMetrics.telebirrTotal / cashierMetrics.totalRevenue) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* CBE Birr */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    CBE Birr Account
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {formatETB(cashierMetrics.cbeBirrTotal)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{
                      width: `${
                        cashierMetrics.totalRevenue > 0
                          ? (cashierMetrics.cbeBirrTotal / cashierMetrics.totalRevenue) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Shift Total */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Total Shift Receipts:
                </span>
                <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                  {formatETB(cashierMetrics.totalRevenue)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Cashier Tools */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Cashier Front-Desk Tools</CardTitle>
                <CardDescription>Customer returns & price lookups</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <Link
                href="/returns"
                className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Customer Return / Exchange</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Validate receipt & process refund</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>

              <Link
                href="/products"
                className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Price & Stock Check</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Lookup item specs & shelf stock</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
