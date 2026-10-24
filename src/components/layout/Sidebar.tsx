'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { RoleType } from '@/types';
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
  ShieldAlert,
  User,
  Clock,
  Receipt,
  CreditCard,
  AlertTriangle,
  LogOut,
  PackagePlus,
  LucideIcon,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: 'warning' | 'info' | 'accent';
  isHighlight?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, roles, logout } = useAuth();
  const {
    isSidebarCollapsed,
    toggleSidebar,
    products,
    purchaseOrders,
    settings,
  } = useApp();

  const primaryRole = (roles[0] as RoleType) || (user ? 'cashier' : 'staff');

  // Low stock badge
  const lowStockCount = products.filter(
    (p) => p.stockQuantity <= p.minStockThreshold
  ).length;

  // Pending purchase orders badge
  const pendingPOCount = purchaseOrders.filter(
    (po) => po.status === 'ordered' || po.status === 'draft'
  ).length;

  // Role-Specific Navigation Definitions matching Specification Section 5
  const getRoleNavGroups = (): NavGroup[] => {
    switch (primaryRole) {
      case 'admin':
        return [
          {
            title: 'Executive Operations',
            items: [
              { name: 'Admin Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
              { name: 'POS Checkout', href: '/sales/checkout', icon: ShoppingCart, isHighlight: true, badge: 'Live', badgeVariant: 'accent' },
              { name: 'POS / Sales', href: '/sales', icon: History },
              { name: 'Payments & Ledger', href: '/payments', icon: CreditCard },
              { name: 'Returns & Refunds', href: '/returns', icon: RotateCcw },
            ],
          },
          {
            title: 'Catalog & Inventory',
            items: [
              { name: 'Products', href: '/products', icon: Package, badge: lowStockCount > 0 ? `${lowStockCount} low` : undefined, badgeVariant: 'warning' },
              { name: 'Categories', href: '/categories', icon: Layers },
              { name: 'Inventory', href: '/inventory', icon: Boxes },
              { name: 'Stock Intake & IMEIs', href: '/inventory/intake', icon: PackagePlus, badge: 'Intake', badgeVariant: 'accent' },
              { name: 'Stock Counts & Audits', href: '/inventory/stock-counts', icon: ClipboardList },
            ],
          },
          {
            title: 'Procurement & Partners',
            items: [
              { name: 'Purchases', href: '/purchases', icon: ShoppingBag, badge: pendingPOCount > 0 ? `${pendingPOCount} PO` : undefined, badgeVariant: 'info' },
              { name: 'Suppliers', href: '/suppliers', icon: Truck },
              { name: 'Customers', href: '/customers', icon: Users },
            ],
          },
          {
            title: 'System & Security',
            items: [
              { name: 'Reports & Analytics', href: '/reports', icon: BarChart3 },
              { name: 'Staff & Roles', href: '/users', icon: UserCog },
              { name: 'Shop Settings', href: '/settings', icon: Settings },
              { name: 'Audit Logs', href: '/admin/audit-logs', icon: ShieldAlert },
              { name: 'My Profile', href: '/profile', icon: User },
            ],
          },
        ];

      case 'manager':
        return [
          {
            title: 'Operations',
            items: [
              { name: 'Manager Dashboard', href: '/manager/dashboard', icon: LayoutDashboard },
              { name: 'Sales Overview', href: '/sales', icon: History },
              { name: 'POS Checkout', href: '/sales/checkout', icon: ShoppingCart },
              { name: 'Payments & Ledger', href: '/payments', icon: CreditCard },
              { name: 'Returns & Refunds', href: '/returns', icon: RotateCcw },
            ],
          },
          {
            title: 'Catalog & Inventory',
            items: [
              { name: 'Products & Catalog', href: '/products', icon: Package, badge: lowStockCount > 0 ? `${lowStockCount} low` : undefined, badgeVariant: 'warning' },
              { name: 'Categories', href: '/categories', icon: Layers },
              { name: 'Inventory Overview', href: '/inventory', icon: Boxes },
              { name: 'Stock Intake & IMEIs', href: '/inventory/intake', icon: PackagePlus, badge: 'Intake', badgeVariant: 'accent' },
              { name: 'Stock Counts', href: '/inventory/stock-counts', icon: ClipboardList },
            ],
          },
          {
            title: 'Purchasing & Partners',
            items: [
              { name: 'Purchases', href: '/purchases', icon: ShoppingBag, badge: pendingPOCount > 0 ? `${pendingPOCount} PO` : undefined, badgeVariant: 'info' },
              { name: 'Suppliers', href: '/suppliers', icon: Truck },
              { name: 'Customers', href: '/customers', icon: Users },
              { name: 'Operational Reports', href: '/reports', icon: BarChart3 },
              { name: 'My Profile', href: '/profile', icon: User },
            ],
          },
        ];

      case 'cashier':
        return [
          {
            title: 'Point of Sale',
            items: [
              { name: 'Cashier Dashboard', href: '/cashier/dashboard', icon: LayoutDashboard },
              { name: 'POS Checkout', href: '/sales/checkout', icon: ShoppingCart, isHighlight: true, badge: 'Active', badgeVariant: 'accent' },
              { name: 'Sales History', href: '/sales', icon: History },
              { name: 'Payments & Ledger', href: '/payments', icon: CreditCard },
              { name: 'Receipts', href: '/sales?tab=receipts', icon: Receipt },
              { name: 'Returns / Exchanges', href: '/returns', icon: RotateCcw },
            ],
          },
          {
            title: 'Shift & Profile',
            items: [
              { name: 'My Shift', href: '/cashier/shift', icon: Clock },
              { name: 'Product Price Check', href: '/products', icon: Package },
              { name: 'My Profile', href: '/profile', icon: User },
            ],
          },
        ];

      case 'stock_keeper':
        return [
          {
            title: 'Warehouse Operations',
            items: [
              { name: 'Stock Keeper Dashboard', href: '/stock-keeper/dashboard', icon: LayoutDashboard },
              { name: 'Inbound Stock Intake', href: '/inventory/intake', icon: PackagePlus, isHighlight: true, badge: 'Intake', badgeVariant: 'accent' },
              { name: 'Inventory Overview', href: '/inventory', icon: Boxes },
              { name: 'Products Lookup', href: '/products', icon: Package, badge: lowStockCount > 0 ? `${lowStockCount} low` : undefined, badgeVariant: 'warning' },
              { name: 'Stock Movements', href: '/inventory?tab=movements', icon: Boxes },
              { name: 'Receive Stock', href: '/purchases', icon: ShoppingBag, badge: pendingPOCount > 0 ? `${pendingPOCount} PO` : undefined, badgeVariant: 'info' },
              { name: 'Stock Counts', href: '/inventory/stock-counts', icon: ClipboardList },
              { name: 'Low-Stock Alerts', href: '/inventory?tab=low-stock', icon: AlertTriangle },
              { name: 'My Profile', href: '/profile', icon: User },
            ],
          },
        ];

      default:
        return [];
    }
  };

  const navGroups = getRoleNavGroups();

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 transition-all duration-300 border-r border-slate-200 dark:border-slate-800 ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      } hidden md:flex`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all">
        {!isSidebarCollapsed ? (
          <Link href="/" className="flex items-center gap-2.5 group min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 shrink-0 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 group-hover:border-blue-300 transition-colors">
              <Image
                src="/logo.png"
                alt="Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate tracking-tight">
                Nasir Amme
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                Electronics & POS
              </span>
            </div>
          </Link>
        ) : (
          <Link href="/" className="flex items-center justify-center group mx-auto">
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 shrink-0 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
              <Image
                src="/logo.png"
                alt="Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                priority
              />
            </div>
          </Link>
        )}

        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-1"
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Role Badge under Header */}
      {!isSidebarCollapsed && user && (
        <div className="px-4 py-2 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Active Role
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
            {primaryRole.replace('_', ' ')}
          </span>
        </div>
      )}

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {!isSidebarCollapsed && (
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                {group.title}
              </p>
            )}

            {group.items.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href.split('?')[0]);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isSidebarCollapsed ? item.name : undefined}
                  className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    }`}
                  />

                  {!isSidebarCollapsed && (
                    <span className="truncate flex-1">{item.name}</span>
                  )}

                  {!isSidebarCollapsed && item.badge && (
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                        item.badgeVariant === 'warning'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60'
                          : item.badgeVariant === 'info'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60'
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

      {/* Footer Sign Out Action */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-rose-500" />
          {!isSidebarCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};
