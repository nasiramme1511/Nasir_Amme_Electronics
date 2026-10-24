'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { RoleType } from '@/types';
import { getDashboardRouteForRole } from '@/lib/permissions';

export default function RootDashboardPage() {
  const router = useRouter();
  const { roles, isLoading, user } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    const primaryRole = (roles[0] as RoleType) || 'admin';
    const targetRoute = getDashboardRouteForRole(primaryRole);
    router.replace(targetRoute);
  }, [isLoading, user, roles, router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-4">
      <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      <div className="text-center space-y-1">
        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
          Routing to Authorized Terminal...
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Loading your dedicated Nasir Amme Electronics role dashboard
        </p>
      </div>
    </div>
  );
}
