'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { formatETB } from '@/lib/formatters';
import {
  Wallet,
  Smartphone,
  CreditCard,
  Receipt,
  Printer,
  ShoppingCart,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

export default function CashierShiftPage() {
  const { sales } = useApp();
  const { user: authUser } = useAuth();

  const shiftMetrics = useMemo(() => {
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

    const totalTendered = cashTotal + telebirrTotal + cbeBirrTotal + otherTotal;
    const ticketCount = sales.length;

    return {
      cashTotal,
      telebirrTotal,
      cbeBirrTotal,
      otherTotal,
      totalTendered,
      ticketCount,
    };
  }, [sales]);

  const handlePrintZReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/cashier/dashboard" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Cashier Till Shift & Drawer Balancing
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Balance cash and digital payments for your active shift.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={handlePrintZReport}
          >
            Print Shift Report
          </Button>
          <Link href="/sales/checkout">
            <Button
              variant="accent"
              leftIcon={<ShoppingCart className="w-4 h-4" />}
              className="font-bold"
            >
              Resume POS Checkout
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Physical Cash in Till"
          value={formatETB(shiftMetrics.cashTotal)}
          subtitle="Physical cash drawer count"
          icon={<Wallet className="w-5 h-5" />}
          trend={{ value: 'Counted', isPositive: true, label: 'cash tender' }}
          indicatorColor="success"
        />

        <StatCard
          title="Telebirr Collections"
          value={formatETB(shiftMetrics.telebirrTotal)}
          subtitle="Direct mobile wallet transfers"
          icon={<Smartphone className="w-5 h-5" />}
          trend={{ value: 'Digital', isPositive: true, label: 'instant confirmation' }}
          indicatorColor="accent"
        />

        <StatCard
          title="CBE Birr Collections"
          value={formatETB(shiftMetrics.cbeBirrTotal)}
          subtitle="Commercial Bank digital tenders"
          icon={<CreditCard className="w-5 h-5" />}
          trend={{ value: 'Verified', isPositive: true, label: 'CBE account' }}
          indicatorColor="primary"
        />

        <StatCard
          title="Gross Shift Turnover"
          value={formatETB(shiftMetrics.totalTendered)}
          subtitle={`${shiftMetrics.ticketCount} customer receipts issued`}
          icon={<Receipt className="w-5 h-5" />}
          trend={{ value: `${shiftMetrics.ticketCount} receipts`, isPositive: true, label: 'today' }}
          indicatorColor="primary"
        />
      </div>

      {/* Shift Overview Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Shift Tender Breakdown</CardTitle>
            <CardDescription>
              Detailed breakdown of payment methods accepted during this shift
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                    💵
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">Cash Tender</p>
                    <p className="text-xs text-slate-400">Physical paper Birr in drawer</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {formatETB(shiftMetrics.cashTotal)}
                  </p>
                  <span className="text-[11px] text-emerald-500 font-semibold">Ready for safe drop</span>
                </div>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                    📱
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">Telebirr Merchant</p>
                    <p className="text-xs text-slate-400">Merchant QR / Push payments</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {formatETB(shiftMetrics.telebirrTotal)}
                  </p>
                  <span className="text-[11px] text-amber-500 font-semibold">Direct settlement</span>
                </div>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                    🏦
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">CBE Birr Account</p>
                    <p className="text-xs text-slate-400">Commercial Bank of Ethiopia</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {formatETB(shiftMetrics.cbeBirrTotal)}
                  </p>
                  <span className="text-[11px] text-blue-500 font-semibold">Bank confirmed</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shift Meta */}
        <Card>
          <CardHeader>
            <CardTitle>Shift Session Info</CardTitle>
            <CardDescription>Active terminal and operator</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Operator on Duty</span>
              <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                {authUser?.fullName || 'Tigist Alem'}
              </p>
            </div>

            <div>
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Register Terminal</span>
              <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                Till #01 • Dire Dawa Front Desk
              </p>
            </div>

            <div>
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Location</span>
              <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                Main Store Front Counter
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                Shift Status: Active & Balanced
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
