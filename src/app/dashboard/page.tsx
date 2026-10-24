'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getDashboardRouteForRole, RoleType } from '@/lib/permissions';

export default function DashboardIndexPage() {
  const router = useRouter();
  const { roles, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      const primaryRole = (roles[0] as RoleType) || 'cashier';
      router.replace(getDashboardRouteForRole(primaryRole));
    }
  }, [isLoading, roles, router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
