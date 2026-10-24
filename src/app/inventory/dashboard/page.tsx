'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { RoleType } from '@/types';
import {
  Boxes,
  ClipboardList,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StockKeeperDashboardView } from '@/components/dashboard/StockKeeperDashboardView';
import { getDashboardRouteForRole } from '@/lib/permissions';

export default function InventoryDashboardPage() {
  const { roles } = useAuth();

  const isAuthorized =
    roles.includes('stock_keeper') ||
    roles.includes('admin') ||
    roles.includes('manager');
  const userPrimaryRole = (roles[0] as RoleType) || 'stock_keeper';

  // Strict RBAC Guard
  if (!isAuthorized && roles.length > 0) {
    const dest = getDashboardRouteForRole(userPrimaryRole);
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Inventory Dashboard Access Restricted
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
      {/* Inventory & Stock Keeper Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Stock Keeper & Inventory Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time warehouse stock synchronization, shortage monitoring, and goods intake.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/inventory">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Boxes className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
            >
              Stock Movements
            </Button>
          </Link>
          <Link href="/inventory/stock-counts">
            <Button
              variant="accent"
              size="sm"
              leftIcon={<ClipboardList className="w-4 h-4" />}
            >
              Stock Count
            </Button>
          </Link>
        </div>
      </div>

      {/* Render Stock Keeper View */}
      <main>
        <StockKeeperDashboardView />
      </main>
    </div>
  );
}
