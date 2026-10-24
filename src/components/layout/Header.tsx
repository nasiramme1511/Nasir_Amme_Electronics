'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  Menu,
  Bell,
  Plus,
  ShoppingCart,
  Package,
  ShoppingBag,
  AlertTriangle,
  User,
  ShieldCheck,
  ChevronDown,
  LogOut,
  Settings,
  Store,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const Header: React.FC = () => {
  const { user: authUser, logout, roles } = useAuth();
  const {
    isSidebarCollapsed,
    setMobileNavOpen,
    products,
    purchaseOrders,
  } = useApp();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const quickRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (quickRef.current && !quickRef.current.contains(e.target as Node)) {
        setQuickActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const lowStockItems = products.filter(
    (p) => p.stockQuantity <= p.minStockThreshold
  );
  const pendingOrders = purchaseOrders.filter((po) => po.status === 'ordered');
  const totalNotifications = lowStockItems.length + pendingOrders.length;

  return (
    <header
      className={`fixed top-0 right-0 z-20 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-all duration-300 flex items-center justify-between px-4 sm:px-6 ${
        isSidebarCollapsed ? 'left-0 md:left-20' : 'left-0 md:left-64'
      }`}
    >
      {/* Left side: Mobile menu toggle + Logo only, plus Branch Indicator on Desktop */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden cursor-pointer"
          aria-label="Open mobile navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link href="/" className="md:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
            <Image
              src="/logo.png"
              alt="Logo"
              width={28}
              height={28}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            Nasir Amme
          </span>
        </Link>

        {/* Branch Indicator Pill */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-medium text-slate-500 dark:text-slate-400">Branch:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">Dire Dawa Main</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono font-medium">
            DD-MAIN-01
          </span>
        </div>
      </div>

      {/* Right side: POS Mode Action, Search/Actions, Theme Toggle, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Action POS Button */}
        <Link href="/sales/checkout" className="hidden sm:block">
          <Button
            variant="pos"
            size="sm"
            leftIcon={<ShoppingCart className="w-4 h-4" />}
          >
            POS Mode
          </Button>
        </Link>

        {/* Global Theme Toggle */}
        <ThemeToggle />

        {/* Quick Actions Dropdown */}
        <div className="relative" ref={quickRef}>
          <button
            onClick={() => setQuickActionsOpen(!quickActionsOpen)}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Quick actions menu"
            title="Create new record"
          >
            <Plus className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </button>

          {quickActionsOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Quick Actions
              </div>
              <Link
                href="/sales/checkout"
                onClick={() => setQuickActionsOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <span>New POS Sale</span>
              </Link>
              <Link
                href="/products"
                onClick={() => setQuickActionsOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Package className="w-4 h-4 text-blue-600" />
                <span>Add Product</span>
              </Link>
              <Link
                href="/purchases"
                onClick={() => setQuickActionsOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                <span>Receive Goods (PO)</span>
              </Link>
            </div>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            {totalNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Notifications & Stock Alerts
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                  {totalNotifications} Alerts
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {lowStockItems.slice(0, 4).map((item) => (
                  <Link
                    key={item.id}
                    href="/inventory"
                    onClick={() => setNotificationsOpen(false)}
                    className="p-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors block"
                  >
                    <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                        Only {item.stockQuantity} units left (threshold: {item.minStockThreshold})
                      </p>
                    </div>
                  </Link>
                ))}

                {pendingOrders.map((po) => (
                  <Link
                    key={po.id}
                    href="/purchases"
                    onClick={() => setNotificationsOpen(false)}
                    className="p-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors block"
                  >
                    <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        Purchase Order #{po.poNumber}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Pending goods receipt from {po.supplierName}
                      </p>
                    </div>
                  </Link>
                ))}

                {totalNotifications === 0 && (
                  <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                    All stock levels healthy. No urgent alerts.
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 text-center">
                <Link
                  href="/inventory"
                  onClick={() => setNotificationsOpen(false)}
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300"
                >
                  View Inventory Movements →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar & Interactive Multi-User Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="User profile menu"
          >
            <div
              aria-hidden="true"
              className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 font-semibold text-xs flex items-center justify-center shrink-0 select-none"
            >
              {authUser
                ? authUser.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()
                : 'U'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                {authUser?.fullName || 'Active Staff'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium capitalize">
                {roles[0]?.replace('_', ' ') || 'Staff'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5 hidden sm:inline" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Active User Header */}
              <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/50">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {authUser?.fullName || 'Nasir Amme'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {authUser?.email || 'nasir@amme-electronics.et'}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span className="capitalize">{roles[0]?.replace('_', ' ') || 'Admin'} Access</span>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="py-1">
                <Link
                  href="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>My Profile & Credentials</span>
                </Link>

                {roles.includes('admin') && (
                  <>
                    <Link
                      href="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Shop Settings & Profile</span>
                    </Link>
                    <Link
                      href="/users"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>Staff & Roles Matrix</span>
                    </Link>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-1 px-3.5 py-2 text-[10px] text-slate-400 dark:text-slate-500">
                Dire Dawa Retail Branch
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
