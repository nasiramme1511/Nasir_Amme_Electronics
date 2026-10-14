'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
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
  MapPin,
} from 'lucide-react';

export const MobileNav: React.FC = () => {
  const pathname = usePathname();
  const { isMobileNavOpen, setMobileNavOpen, settings, products, purchaseOrders } = useApp();

  if (!isMobileNavOpen) return null;

  const lowStockCount = products.filter((p) => p.stockQuantity <= p.minStockThreshold).length;
  const pendingPOCount = purchaseOrders.filter((po) => po.status === 'ordered').length;

  const links = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'POS Checkout', href: '/sales/checkout', icon: ShoppingCart, highlight: true },
    { name: 'Sales History', href: '/sales', icon: History },
    { name: 'Products', href: '/products', icon: Package, badge: lowStockCount > 0 ? `${lowStockCount} low` : undefined },
    { name: 'Categories', href: '/categories', icon: Layers },
    { name: 'Stock Movements', href: '/inventory', icon: Boxes },
    { name: 'Stock Counts & Audit', href: '/inventory/stock-counts', icon: ClipboardList },
    { name: 'Purchases & Receiving', href: '/purchases', icon: ShoppingBag, badge: pendingPOCount > 0 ? `${pendingPOCount} PO` : undefined },
    { name: 'Returns & Refunds', href: '/returns', icon: RotateCcw },
    { name: 'Suppliers', href: '/suppliers', icon: Truck },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Reports & Analytics', href: '/reports', icon: BarChart3 },
    { name: 'Users & Roles', href: '/users', icon: UserCog },
    { name: 'Shop Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#101827]/70 backdrop-blur-xs transition-opacity"
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 left-0 w-72 bg-[#101827] text-white flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-200">
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800 bg-[#0b101b]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D9A441] to-[#b38228] flex items-center justify-center text-[#101827] font-bold text-base shadow-sm">
              NA
            </div>
            <div>
              <div className="text-sm font-bold text-white truncate max-w-[140px]">
                {settings.shopName}
              </div>
              <div className="text-[10px] text-[#D9A441] flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />
                Dire Dawa • Near B-Capital
              </div>
            </div>
          </div>

          <button
            onClick={() => setMobileNavOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {links.map((link) => {
            const isActive =
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href);
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-[#D9A441] border-l-4 border-[#D9A441]'
                    : link.highlight
                    ? 'text-white bg-[#D9A441]/20 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive || link.highlight ? 'text-[#D9A441]' : 'text-slate-400'
                    }`}
                  />
                  <span>{link.name}</span>
                </div>

                {link.badge && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="p-3 border-t border-slate-800 bg-[#0b101b] text-center text-xs text-slate-400">
          Dire Dawa, Ethiopia • Retail POS Demo
        </div>
      </div>
    </div>
  );
};
