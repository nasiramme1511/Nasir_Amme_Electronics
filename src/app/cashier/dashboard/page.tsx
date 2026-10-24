'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { RoleType } from '@/types';
import {
  ShoppingCart,
  RotateCcw,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CashierDashboardView } from '@/components/dashboard/CashierDashboardView';
import { getDashboardRouteForRole } from '@/lib/permissions';

export default function CashierDashboardPage() {
  const { roles } = useAuth();

  const isCashierOrAdmin = roles.includes('cashier') || roles.includes('admin');
  const userPrimaryRole = (roles[0] as RoleType) || 'cashier';

  // Strict RBAC Guard
  if (!isCashierOrAdmin && roles.length > 0) {
    const dest = getDashboardRouteForRole(userPrimaryRole);
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Cashier Access Restricted
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            You are logged in as a{' '}
            <strong className="text-amber-500 capitalize">{userPrimaryRole.replace('_', ' ')}</strong>. You are only authorized to view your designated dashboard.
          </p>
          <Link href={dest}>
            <Button variant="accent" className="w-full font-bold">
              Go to Your {userPrimaryRole.replace('_', ' ')} Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cashier Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Cashier Till Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Point-of-sale checkout counter and cash drawer tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/returns">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
            >
              Returns
            </Button>
          </Link>
          <Link href="/sales/checkout">
            <Button
              variant="accent"
              size="sm"
              leftIcon={<ShoppingCart className="w-4 h-4" />}
            >
              New Sale (POS)
            </Button>
          </Link>
        </div>
      </div>

      {/* Render Cashier View */}
      <main>
        <CashierDashboardView />
      </main>
    </div>
  );
}
