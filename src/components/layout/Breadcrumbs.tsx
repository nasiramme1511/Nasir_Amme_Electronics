'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbsProps {
  customItems?: { label: string; href?: string }[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ customItems }) => {
  const pathname = usePathname();

  // Route map for human-friendly names
  const routeNames: Record<string, string> = {
    products: 'Products Catalog',
    categories: 'Categories',
    inventory: 'Stock Movements',
    'stock-counts': 'Stock Audit & Counts',
    purchases: 'Purchases & Receiving',
    sales: 'Sales History',
    checkout: 'POS Terminal',
    returns: 'Returns & Refunds',
    suppliers: 'Suppliers Directory',
    customers: 'Customers',
    reports: 'Reports & Analytics',
    users: 'Staff & Roles',
    settings: 'Shop Settings',
  };

  const rolePrefixes = ['admin', 'manager', 'cashier', 'stock-keeper'];
  const isDashboardRoot =
    pathname === '/' ||
    pathname.endsWith('/dashboard') ||
    rolePrefixes.some((role) => pathname === `/${role}`);

  if (isDashboardRoot) {
    return null;
  }

  const rawSegments = pathname.split('/').filter(Boolean);
  // Omit leading role prefix so breadcrumb starts cleanly from Dashboard
  let accumulatedPath = '';
  const filteredSegments: { label: string; href: string }[] = [];

  rawSegments.forEach((segment, idx) => {
    accumulatedPath += `/${segment}`;
    if (idx === 0 && rolePrefixes.includes(segment)) {
      return;
    }
    filteredSegments.push({
      label:
        routeNames[segment] ||
        segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      href: accumulatedPath,
    });
  });

  const items = customItems || filteredSegments;

  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
      <Link
        href="/"
        className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <Home className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        <span>Dashboard</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
            {isLast || !item.href ? (
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-slate-900 dark:hover:text-white transition-colors truncate"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
