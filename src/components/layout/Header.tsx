'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import {
  Menu,
  Bell,
  Plus,
  MapPin,
  ShoppingCart,
  Package,
  ShoppingBag,
  AlertTriangle,
  User,
  ShieldCheck,
  ChevronDown,
  LogOut,
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

  // Notifications calculation
  const lowStockItems = products.filter(
    (p) => p.stockQuantity <= p.minStockThreshold
  );
  const pendingOrders = purchaseOrders.filter((po) => po.status === 'ordered');
  const totalNotifications = lowStockItems.length + pendingOrders.length;

  return (
    <header
      className={`fixed top-0 right-0 z-20 h-16 bg-white border-b border-slate-200/90 transition-all duration-300 flex items-center justify-between px-4 sm:px-6 ${
        isSidebarCollapsed ? 'left-0 md:left-20' : 'left-0 md:left-64'
      }`}
    >
      {/* Left side: Mobile menu toggle + Store badge */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden cursor-pointer"
          aria-label="Open mobile navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Location & Brand Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100/90 rounded-full border border-slate-200/70 text-xs">
          <MapPin className="w-3.5 h-3.5 text-[#D9A441] shrink-0" />
          <span className="font-semibold text-slate-800">Dire Dawa Branch</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-600 truncate">Near B-Capital Hotel</span>
        </div>

        {/* Demo banner indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-full border border-amber-200 text-xs text-[#93660a] font-medium">
          <span className="w-2 h-2 rounded-full bg-[#D9A441] animate-pulse" />
          <span className="hidden lg:inline">ETB • Demo Mode</span>
          <span className="lg:hidden">Demo</span>
        </div>
      </div>

      {/* Right side: Search, Quick Actions, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Action POS Button */}
        <Link href="/sales/checkout" className="hidden sm:block">
          <Button
            variant="accent"
            size="sm"
            leftIcon={<ShoppingCart className="w-4 h-4" />}
          >
            New Sale (POS)
          </Button>
        </Link>

        {/* Quick Actions Dropdown */}
        <div className="relative" ref={quickRef}>
          <button
            onClick={() => setQuickActionsOpen(!quickActionsOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            aria-label="Quick actions"
          >
            <Plus className="w-5 h-5 text-[#101827]" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
          </button>

          {quickActionsOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Quick Shortcuts
              </div>
              <Link
                href="/sales/checkout"
                onClick={() => setQuickActionsOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#101827]"
              >
                <ShoppingCart className="w-4 h-4 text-[#D9A441]" />
                <span>Open POS Terminal</span>
              </Link>
              <Link
                href="/products?action=new"
                onClick={() => setQuickActionsOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#101827]"
              >
                <Package className="w-4 h-4 text-emerald-600" />
                <span>Add New Product</span>
              </Link>
              <Link
                href="/purchases?action=new"
                onClick={() => setQuickActionsOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#101827]"
              >
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                <span>Draft Purchase Order</span>
              </Link>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {totalNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                {totalNotifications}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    Inventory Alerts
                  </h4>
                  <span className="text-xs px-2 py-0.5 bg-rose-100 text-rose-700 font-semibold rounded-full">
                    {totalNotifications} new
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">Dire Dawa Store</span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {lowStockItems.length > 0 && (
                  <div className="p-3 bg-amber-50/50">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Low Stock Warnings ({lowStockItems.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {lowStockItems.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-amber-200/60"
                        >
                          <span className="truncate pr-2 font-medium text-slate-800">
                            {item.name}
                          </span>
                          <span className="text-rose-600 font-bold shrink-0">
                            {item.stockQuantity} left (min {item.minStockThreshold})
                          </span>
                        </div>
                      ))}
                    </div>
                    {lowStockItems.length > 3 && (
                      <Link
                        href="/products?filter=low_stock"
                        onClick={() => setNotificationsOpen(false)}
                        className="block text-center text-xs text-[#93660a] font-medium mt-2 hover:underline"
                      >
                        View all {lowStockItems.length} low stock items →
                      </Link>
                    )}
                  </div>
                )}

                {pendingOrders.length > 0 && (
                  <div className="p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 mb-2">
                      <ShoppingBag className="w-4 h-4 text-blue-600" />
                      <span>Pending Deliveries ({pendingOrders.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {pendingOrders.map((po) => (
                        <div
                          key={po.id}
                          className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200"
                        >
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {po.poNumber}
                            </span>
                            <span className="text-slate-500 text-[11px]">
                              {po.supplierName}
                            </span>
                          </div>
                          <Link
                            href="/purchases"
                            onClick={() => setNotificationsOpen(false)}
                            className="text-xs text-blue-600 font-semibold hover:underline"
                          >
                            Receive
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {totalNotifications === 0 && (
                  <div className="p-6 text-center text-xs text-slate-500">
                    All stock levels healthy. No urgent alerts.
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                <Link
                  href="/inventory"
                  onClick={() => setNotificationsOpen(false)}
                  className="text-xs text-slate-600 font-semibold hover:text-[#101827]"
                >
                  View Inventory Movements →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar & Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="User profile menu"
          >
            <div className="w-8 h-8 rounded-lg bg-[#101827] text-[#D9A441] font-bold text-xs flex items-center justify-center shadow-xs">
              {authUser
                ? authUser.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()
                : 'ST'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {authUser?.fullName || 'Authenticating...'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium capitalize">
                {roles[0]?.replace('_', ' ') || 'Staff'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900">
                  {authUser?.fullName || 'Staff Member'}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {authUser?.email || 'authenticated'}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span className="capitalize">{roles[0]?.replace('_', ' ') || 'Staff'} Access</span>
                </div>
              </div>

              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Shop Settings & Profile</span>
                </Link>
                {roles.includes('admin') && (
                  <Link
                    href="/users"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span>Staff & Roles Matrix</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-500" />
                  <span>Sign Out</span>
                </button>
              </div>

              <div className="border-t border-slate-100 pt-1 px-3.5 py-2 text-[10px] text-slate-400">
                Dire Dawa Retail Branch v1.0
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
