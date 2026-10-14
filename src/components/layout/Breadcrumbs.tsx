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

  if (pathname === '/') {
    return null;
  }

  const pathSegments = pathname.split('/').filter(Boolean);

  let accumulatedPath = '';
  const generatedItems = pathSegments.map((segment) => {
    accumulatedPath += `/${segment}`;
    return {
      label: routeNames[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      href: accumulatedPath,
    };
  });

  const items = customItems || generatedItems;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-slate-500">
      <Link
        href="/"
        className="flex items-center gap-1 hover:text-[#101827] transition-colors"
      >
        <Home className="w-3.5 h-3.5 text-slate-400" />
        <span>Dashboard</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            {isLast || !item.href ? (
              <span className="font-semibold text-slate-800 truncate">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-[#101827] transition-colors truncate"
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
