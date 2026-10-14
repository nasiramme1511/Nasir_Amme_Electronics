'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  Truck,
  Users,
  RotateCcw,
  ClipboardList,
  BarChart3,
  UserCog,
  Settings,
  ShoppingBag,
  History,
  Boxes,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Sparkles,
  LucideIcon,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  isHighlight?: boolean;
  badge?: string;
  badgeVariant?: 'warning' | 'info' | 'accent';
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const {
    isSidebarCollapsed,
    toggleSidebar,
    products,
    purchaseOrders,
    settings,
  } = useApp();

  // Low stock badge
  const lowStockCount = products.filter(
    (p) => p.stockQuantity <= p.minStockThreshold
  ).length;

  // Pending purchase orders badge
  const pendingPOCount = purchaseOrders.filter(
    (po) => po.status === 'ordered' || po.status === 'draft'
  ).length;

  const navGroups: NavGroup[] = [
    {
      title: 'Operations',
      items: [
        {
          name: 'Dashboard',
          href: '/',
          icon: LayoutDashboard,
        },
        {
          name: 'POS Checkout',
          href: '/sales/checkout',
          icon: ShoppingCart,
          isHighlight: true,
          badge: 'Live',
          badgeVariant: 'accent',
        },
        {
          name: 'Sales History',
          href: '/sales',
          icon: History,
        },
      ],
    },
    {
      title: 'Inventory & Catalog',
      items: [
        {
          name: 'Products',
          href: '/products',
          icon: Package,
          badge: lowStockCount > 0 ? `${lowStockCount} low` : undefined,
          badgeVariant: 'warning',
        },
        {
          name: 'Categories',
          href: '/categories',
          icon: Layers,
        },
        {
          name: 'Stock Movements',
          href: '/inventory',
          icon: Boxes,
        },
        {
          name: 'Stock Audit / Count',
          href: '/inventory/stock-counts',
          icon: ClipboardList,
        },
      ],
    },
    {
      title: 'Purchases & Partners',
      items: [
        {
          name: 'Purchases & Receiving',
          href: '/purchases',
          icon: ShoppingBag,
          badge: pendingPOCount > 0 ? `${pendingPOCount} PO` : undefined,
          badgeVariant: 'info',
        },
        {
          name: 'Returns & Refunds',
          href: '/returns',
          icon: RotateCcw,
        },
        {
          name: 'Suppliers',
          href: '/suppliers',
          icon: Truck,
        },
        {
          name: 'Customers',
          href: '/customers',
          icon: Users,
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        {
          name: 'Reports & Analytics',
          href: '/reports',
          icon: BarChart3,
        },
        {
          name: 'Users & Roles',
          href: '/users',
          icon: UserCog,
        },
        {
          name: 'Shop Settings',
          href: '/settings',
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col bg-[#101827] text-slate-300 transition-all duration-300 border-r border-slate-800/80 ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      } hidden md:flex`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 bg-[#0b101b]">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D9A441] to-[#b38228] flex items-center justify-center text-[#101827] font-extrabold text-lg shadow-md shrink-0">
            NA
          </div>
          {!isSidebarCollapsed && (
            <div className="flex flex-col truncate">
              <span className="text-sm font-bold text-white tracking-wide truncate">
                {settings.shopName}
              </span>
              <span className="text-[10px] text-[#D9A441] font-medium flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                Dire Dawa • B-Capital
              </span>
            </div>
          )}
        </Link>

        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!isSidebarCollapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                {group.title}
              </p>
            )}

            {group.items.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isSidebarCollapsed ? item.name : undefined}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  } ${item.isHighlight && !isActive ? 'hover:bg-[#D9A441]/10 text-slate-300' : ''}`}
                >
                  {/* Active accent indicator */}
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#D9A441] rounded-r-md" />
                  )}

                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                      isActive
                        ? 'text-[#D9A441]'
                        : item.isHighlight
                        ? 'text-[#D9A441]'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />

                  {!isSidebarCollapsed && (
                    <span className="truncate flex-1">{item.name}</span>
                  )}

                  {!isSidebarCollapsed && item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                        item.badgeVariant === 'warning'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : item.badgeVariant === 'info'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-[#D9A441] text-[#101827]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Info Box */}
      {!isSidebarCollapsed && (
        <div className="p-3 border-t border-slate-800/80 bg-[#0b101b]">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 text-[#D9A441] font-semibold text-[11px]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Retail Demo Mode</span>
            </div>
            <p className="text-slate-400 text-[10px] mt-1 leading-relaxed">
              Dire Dawa retail inventory scenario. All transactions operate on local mock data.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
};
