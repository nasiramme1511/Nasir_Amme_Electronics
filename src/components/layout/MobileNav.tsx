'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { RoleType } from '@/types';
import {
  X,
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
  ShieldAlert,
  Clock,
  Receipt,
  CreditCard,
  User,
  LogOut,
  LucideIcon,
} from 'lucide-react';

interface MobileLinkItem {
  name: string;
  href: string;
  icon: LucideIcon;
  highlight?: boolean;
  badge?: string;
}

export const MobileNav: React.FC = () => {
  const pathname = usePathname();
  const { isMobileNavOpen, setMobileNavOpen, settings, products, purchaseOrders } = useApp();
  const { roles, logout } = useAuth();

  if (!isMobileNavOpen) return null;

  const primaryRole = (roles[0] as RoleType) || 'admin';
  const lowStockCount = products.filter((p) => p.stockQuantity <= p.minStockThreshold).length;
  const pendingPOCount = purchaseOrders.filter((po) => po.status === 'ordered').length;

  const getRoleLinks = (): MobileLinkItem[] => {
    switch (primaryRole) {
      case 'admin':
        return [
          { name: 'Admin Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
          { name: 'POS Checkout', href: '/sales/checkout', icon: ShoppingCart, highlight: true },
          { name: 'POS / Sales', href: '/sales', icon: History },
          { name: 'Payments & Ledger', href: '/payments', icon: CreditCard },
          { name: 'Products', href: '/products', icon: Package, badge: lowStockCount > 0 ? `${lowStockCount} low` : undefined },
          { name: 'Categories', href: '/categories', icon: Layers },
          { name: 'Inventory', href: '/inventory', icon: Boxes },
          { name: 'Stock Counts & Audit', href: '/inventory/stock-counts', icon: ClipboardList },
          { name: 'Purchases & POs', href: '/purchases', icon: ShoppingBag, badge: pendingPOCount > 0 ? `${pendingPOCount} PO` : undefined },
          { name: 'Suppliers', href: '/suppliers', icon: Truck },
          { name: 'Customers', href: '/customers', icon: Users },
          { name: 'Reports & Analytics', href: '/reports', icon: BarChart3 },
          { name: 'Staff & Roles', href: '/users', icon: UserCog },
          { name: 'Shop Settings', href: '/settings', icon: Settings },
          { name: 'Audit Logs', href: '/admin/audit-logs', icon: ShieldAlert },
          { name: 'My Profile', href: '/profile', icon: User },
        ];
      case 'manager':
        return [
          { name: 'Manager Dashboard', href: '/manager/dashboard', icon: LayoutDashboard },
          { name: 'Sales Overview', href: '/sales', icon: History },
          { name: 'POS Checkout', href: '/sales/checkout', icon: ShoppingCart },
          { name: 'Payments & Ledger', href: '/payments', icon: CreditCard },
          { name: 'Products & Catalog', href: '/products', icon: Package, badge: lowStockCount > 0 ? `${lowStockCount} low` : undefined },
          { name: 'Categories', href: '/categories', icon: Layers },
          { name: 'Inventory Overview', href: '/inventory', icon: Boxes },
          { name: 'Stock Counts', href: '/inventory/stock-counts', icon: ClipboardList },
          { name: 'Purchases', href: '/purchases', icon: ShoppingBag, badge: pendingPOCount > 0 ? `${pendingPOCount} PO` : undefined },
          { name: 'Suppliers', href: '/suppliers', icon: Truck },
          { name: 'Operational Reports', href: '/reports', icon: BarChart3 },
          { name: 'My Profile', href: '/profile', icon: User },
        ];
      case 'cashier':
        return [
          { name: 'Cashier Dashboard', href: '/cashier/dashboard', icon: LayoutDashboard },
          { name: 'POS Checkout', href: '/sales/checkout', icon: ShoppingCart, highlight: true },
          { name: 'Sales History', href: '/sales', icon: History },
          { name: 'Payments & Ledger', href: '/payments', icon: CreditCard },
          { name: 'Receipts', href: '/sales?tab=receipts', icon: Receipt },
          { name: 'Returns / Exchanges', href: '/returns', icon: RotateCcw },
          { name: 'My Shift', href: '/cashier/shift', icon: Clock },
          { name: 'Price Check', href: '/products', icon: Package },
          { name: 'My Profile', href: '/profile', icon: User },
        ];
      case 'stock_keeper':
        return [
          { name: 'Stock Keeper Dashboard', href: '/stock-keeper/dashboard', icon: LayoutDashboard },
          { name: 'Inventory Overview', href: '/inventory', icon: Boxes },
          { name: 'Products Lookup', href: '/products', icon: Package, badge: lowStockCount > 0 ? `${lowStockCount} low` : undefined },
          { name: 'Receive Stock', href: '/purchases', icon: ShoppingBag, badge: pendingPOCount > 0 ? `${pendingPOCount} PO` : undefined },
          { name: 'Stock Counts', href: '/inventory/stock-counts', icon: ClipboardList },
          { name: 'Low-Stock Alerts', href: '/inventory?tab=low-stock', icon: Boxes },
          { name: 'My Profile', href: '/profile', icon: User },
        ];
      default:
        return [];
    }
  };

  const navLinks = getRoleLinks();

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 dark:bg-[#101827]/70 backdrop-blur-xs transition-opacity"
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 text-slate-800 dark:text-white flex flex-col z-10 shadow-2xl border-r border-slate-200 dark:border-slate-800 animate-in slide-in-from-left duration-200">
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Link href="/" onClick={() => setMobileNavOpen(false)} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
              <Image
                src="/logo.png"
                alt="Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Nasir Amme
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Electronics & POS
              </span>
            </div>
          </Link>

          <button
            onClick={() => setMobileNavOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Active Role:</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60">
            {primaryRole.replace('_', ' ')}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {navLinks.map((link) => {
            const isActive =
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href.split('?')[0]);
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span>{link.name}</span>
                </div>

                {link.badge && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            onClick={() => {
              setMobileNavOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
