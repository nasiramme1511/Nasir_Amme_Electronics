'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { RoleType } from '@/types';
import {
  ClipboardList,
  Boxes,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ManagerDashboardView } from '@/components/dashboard/ManagerDashboardView';
import { getDashboardRouteForRole } from '@/lib/permissions';

export default function StoreManagerDashboardPage() {
  const { roles } = useAuth();

  const isManagerOrAdmin = roles.includes('manager') || roles.includes('admin');
  const userPrimaryRole = (roles[0] as RoleType) || 'manager';

  // Strict RBAC Guard
  if (!isManagerOrAdmin && roles.length > 0) {
    const dest = getDashboardRouteForRole(userPrimaryRole);
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Manager Access Restricted
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
      {/* Manager Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Store Manager Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Daily store operations, sales activity, and stock levels.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/inventory/stock-counts">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ClipboardList className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
            >
              Stock Audit
            </Button>
          </Link>
          <Link href="/purchases">
            <Button
              variant="accent"
              size="sm"
              leftIcon={<Boxes className="w-4 h-4" />}
            >
              Purchase Orders
            </Button>
          </Link>
        </div>
      </div>

      {/* Render Store Manager View */}
      <main>
        <ManagerDashboardView />
      </main>
    </div>
  );
}
