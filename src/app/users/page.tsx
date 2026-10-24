'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getDashboardRouteForRole } from '@/lib/permissions';
import { RoleType } from '@/types';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import UsersAndRolesView from '@/components/staff/UsersAndRolesView';

export default function UsersPage() {
  const { roles } = useAuth();

  const isAdmin = roles.includes('admin');
  const userPrimaryRole = (roles[0] as RoleType) || 'stock_keeper';

  if (!isAdmin && roles.length > 0) {
    const dest = getDashboardRouteForRole(userPrimaryRole);
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Access Restricted
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Staff administration and permissions management is strictly restricted to Administrators. 
            You are currently logged in as a{' '}
            <strong className="text-amber-500 capitalize">{userPrimaryRole.replace('_', ' ')}</strong>.
          </p>
          <Link href={dest}>
            <Button variant="accent" className="w-full font-bold">
              Return to Your Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <UsersAndRolesView />;
}
