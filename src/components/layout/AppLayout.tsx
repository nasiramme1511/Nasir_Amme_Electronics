'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { ReceiptModal } from '@/components/ui/ReceiptModal';
import { Breadcrumbs } from './Breadcrumbs';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { isSidebarCollapsed, activeReceipt, closeReceiptModal } = useApp();

  // Clean full-screen presentation for the login page
  if (pathname === '/login') {
    return (
      <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col justify-center">
        {children}
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6FA] text-slate-900 flex flex-col">
      {/* Sidebar for Desktop */}
      <Sidebar />

      {/* Top Header */}
      <Header />

      {/* Mobile Drawer */}
      <MobileNav />

      {/* Main Content Area */}
      <main
        className={`flex-1 transition-all duration-300 pt-16 min-h-screen flex flex-col ${
          isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex-1">
          <Breadcrumbs />
          {children}
        </div>

        {/* Global Footer */}
        <footer className="py-4 px-6 border-t border-slate-200/80 bg-white/60 text-center text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
            <span className="font-medium text-slate-700">
              Nasir Amme Electronics • Retail Management Platform
            </span>
            <span>
              Dire Dawa, Kebele 02 (Near B-Capital Hotel), Ethiopia • Currency: ETB (Demonstration Environment)
            </span>
          </div>
        </footer>
      </main>

      {/* Global floating toast manager */}
      <ToastContainer />

      {/* Global receipt modal popup */}
      <ReceiptModal
        isOpen={!!activeReceipt}
        sale={activeReceipt}
        onClose={closeReceiptModal}
      />
    </div>
  );
};
