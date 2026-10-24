'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getDashboardRouteForRole, RoleType } from '@/lib/permissions';
import {
  TrendingUp,
  AlertTriangle,
  Layers,
  FileText,
  Smartphone,
  CreditCard,
  Banknote,
  ExternalLink,
  RefreshCw,
  Database,
  CheckCircle2,
  Lock,
  Boxes,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  User,
  ShieldCheck,
  ShoppingBag,
  DollarSign,
  Package,
  Receipt,
  Download,
  CheckCircle,
  XCircle,
  Building2,
  X,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatETB } from '@/lib/formatters';
import { exportToCSV } from '@/lib/export';
import { DateRangePreset } from '@/lib/dateUtils';
import { Sale } from '@/types';

interface DashboardResponse {
  store: {
    id: string;
    storeId: string;
    name: string;
    legalName: string;
    city: string;
    currencyCode: string;
    timeZone: string;
  };
  databaseHealth: {
    status: 'healthy' | 'degraded';
    latencyMs: number;
    checkedAt: string;
    engine: string;
    connected: boolean;
    errorMessage: string | null;
  };
  period: {
    preset: DateRangePreset;
    label: string;
    startDate: string;
    endDate: string;
    previousPeriod: {
      label: string;
      startDate: string;
      endDate: string;
    };
  };
  kpis: {
    grossSalesRevenue: {
      current: number;
      formatted: string;
      previous: number;
      formattedPrevious: string;
      difference: number;
      changePercent: number | null;
    };
    netSalesRevenue: {
      current: number;
      formatted: string;
      previous: number;
      formattedPrevious: string;
      difference: number;
      changePercent: number | null;
    };
    grossProfit: {
      current: number;
      formatted: string;
      previous: number;
      formattedPrevious: string;
      difference: number;
      changePercent: number | null;
      grossMarginPercent: number | null;
    };
    cogs: {
      current: number;
      formatted: string;
      previous: number;
      formattedPrevious: string;
      difference: number;
      changePercent: number | null;
    };
    salesTransactionCount: {
      current: number;
      previous: number;
      difference: number;
      changePercent: number | null;
    };
    averageTransactionValue: {
      current: number;
      formatted: string;
      previous: number;
      formattedPrevious: string;
      difference: number;
      changePercent: number | null;
    };
    inventoryAssetCost: {
      value: number;
      formatted: string;
      activeSkuCount: number;
      totalUnitsOnHand: number;
    };
    retailPotential: {
      value: number;
      formatted: string;
      potentialProfit: number;
      formattedPotentialProfit: string;
    };
    lowStockCount: {
      count: number;
      threshold: number;
    };
    outOfStockCount: {
      count: number;
    };
  };
  performanceChart: {
    periodLabel: string;
    series: Array<{
      date: string;
      label: string;
      grossRevenue: number;
      netRevenue: number;
      grossProfit: number;
      cogs: number;
      orderCount: number;
      isCurrentDay: boolean;
    }>;
    summary: {
      totalGross: number;
      totalNet: number;
      totalProfit: number;
    };
  };
  receiptLedger: {
    items: Array<{
      id: string;
      receiptNumber: string;
      soldAt: string;
      formattedDate: string;
      formattedTime: string;
      customerName: string;
      customerPhone: string | null;
      cashierName: string;
      lineItemCount: number;
      totalQuantity: number;
      paymentMethod: string;
      providerReference: string | null;
      paymentStatus: string;
      saleStatus: string;
      subtotal: number;
      discountTotal: number;
      taxTotal: number;
      grandTotal: number;
      settledAmount: number;
    }>;
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
    scope: string;
  };
  skuVelocity: {
    items: Array<{
      id: string;
      sku: string;
      name: string;
      brand: string;
      unitsSold: number;
      grossSalesRevenue: number;
      currentStock: number;
      reorderLevel: number;
      sellingPrice: number;
      averageCost: number;
      inventoryValueCost: number;
      stockStatus: 'out_of_stock' | 'low_stock' | 'optimal';
    }>;
    isFallback: boolean;
    fallbackPeriodLabel: string;
  };
  tenderBreakdown: {
    channels: Array<{
      rail: string;
      displayName: string;
      collectedETB: number;
      formatted: string;
      transactionCount: number;
      percentageOfTotal: number;
    }>;
    totalSettledETB: number;
    formattedTotalSettled: string;
    totalTransactions: number;
    totalRefundsETB: number;
    formattedTotalRefunds: string;
    physicalDrawerCashETB: number;
  };
  posShift: {
    isOpen: boolean;
    session: {
      id: string;
      sessionNumber: string;
      cashierId: string;
      cashierName: string;
      cashierEmail: string;
      openedAt: string;
      formattedOpenedAt: string;
      openingFloat: number;
      expectedDrawerCash: number;
      cashSales: number;
      cashRefunds: number;
      digitalTenders: {
        telebirr: number;
        cbeBirr: number;
        other: number;
      };
    } | null;
    lastClosedSession: {
      sessionNumber: string;
      closedAt: string | null;
      formattedClosedAt: string | null;
      closingCashCounted: number;
      cashDifference: number;
      cashierName: string;
    } | null;
  };
  operationalAlerts: {
    criticalStockItems: Array<{
      id: string;
      sku: string;
      name: string;
      brand: string;
      onHand: number;
      reorderLevel: number;
      deficitUnits: number;
      sellingPrice: number;
      averageCost: number;
    }>;
    pendingPurchaseOrders: Array<{
      id: string;
      poNumber: string;
      supplierName: string;
      status: string;
      orderedAt: string;
      grandTotal: number;
      formattedTotal: string;
      itemCount: number;
    }>;
  };
}

export default function AdminOperationsDashboard() {
  const router = useRouter();
  const { user, roles, isLoading: authLoading } = useAuth();
  const { openReceiptModal, addToast } = useApp();

  // Auto-redirect authenticated non-executive staff to their role dashboard
  useEffect(() => {
    if (!authLoading && user) {
      const isExecutive = roles.includes('admin') || roles.includes('manager');
      if (!isExecutive) {
        const primaryRole = (roles[0] as RoleType) || 'cashier';
        router.replace(getDashboardRouteForRole(primaryRole));
      }
    }
  }, [authLoading, user, roles, router]);

  // State Management
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [businessClock, setBusinessClock] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Filters & Controls
  const [selectedRange, setSelectedRange] = useState<DateRangePreset>('today');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isCustomDateModalOpen, setIsCustomDateModalOpen] = useState<boolean>(false);

  // Receipt Ledger Controls
  const [ledgerPage, setLedgerPage] = useState<number>(1);
  const [ledgerLimit] = useState<number>(10);
  const [ledgerSearch, setLedgerSearch] = useState<string>('');
  const [ledgerScope, setLedgerScope] = useState<'period' | 'all'>('period');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Shift Management State
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState<boolean>(false);
  const [countedCashInput, setCountedCashInput] = useState<string>('');
  const [closeShiftNotes, setCloseShiftNotes] = useState<string>('');
  const [isClosingShift, setIsClosingShift] = useState<boolean>(false);

  // Live EAT Business Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Addis_Ababa',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(now);
      setBusinessClock(`${formatted} EAT`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Authoritative Dashboard Data
  const fetchDashboardData = useCallback(
    async (isManual = false) => {
      if (isManual) setIsRefreshing(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          range: selectedRange,
          page: ledgerPage.toString(),
          limit: ledgerLimit.toString(),
          ledgerScope,
        });

        if (selectedRange === 'custom') {
          if (customStartDate) queryParams.set('startDate', customStartDate);
          if (customEndDate) queryParams.set('endDate', customEndDate);
        }

        if (ledgerSearch.trim()) {
          queryParams.set('search', ledgerSearch.trim());
        }

        if (paymentFilter !== 'all') {
          queryParams.set('paymentMethod', paymentFilter);
        }

        if (statusFilter !== 'all') {
          queryParams.set('status', statusFilter);
        }

        const res = await fetch(`/api/admin/dashboard?${queryParams.toString()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP error ${res.status} from database.`);
        }

        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
          setLastRefreshedAt(new Date());
        } else {
          throw new Error(json.error?.message || 'Invalid server payload.');
        }
      } catch (err: any) {
        console.error('Failed to load dashboard operational data:', err);
        setError(err.message || 'Unable to connect to PostgreSQL operations engine.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      selectedRange,
      customStartDate,
      customEndDate,
      ledgerPage,
      ledgerLimit,
      ledgerScope,
      ledgerSearch,
      paymentFilter,
      statusFilter,
    ]
  );

  // Initial and reactive data load
  useEffect(() => {
    if (!authLoading) {
      fetchDashboardData();
    }
  }, [authLoading, fetchDashboardData]);

  // Handle Shift Closure
  const handleCloseShift = async () => {
    if (!data?.posShift.session?.id) return;

    const countedCash = parseFloat(countedCashInput);
    if (isNaN(countedCash) || countedCash < 0) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter a valid non-negative counted cash amount.',
      });
      return;
    }

    setIsClosingShift(true);
    try {
      const res = await fetch('/api/v1/pos/shifts/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: data.posShift.session.id,
          closingCashCounted: countedCash,
          notes: closeShiftNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to close POS shift.');
      }

      addToast({
        type: 'success',
        title: 'Shift Reconciled',
        message: `POS Shift ${json.data.session.sessionNumber} closed and reconciled successfully.`,
      });
      setIsCloseShiftModalOpen(false);
      setCountedCashInput('');
      setCloseShiftNotes('');
      fetchDashboardData(true);
    } catch (err: any) {
      console.error('Shift close error:', err);
      addToast({
        type: 'error',
        title: 'Shift Closure Failed',
        message: err.message || 'Failed to close shift.',
      });
    } finally {
      setIsClosingShift(false);
    }
  };

  // Open Receipt Modal for clicked ledger row
  const handleViewReceipt = (item: DashboardResponse['receiptLedger']['items'][0]) => {
    const syntheticSale: Sale = {
      id: item.id,
      receiptNumber: item.receiptNumber,
      date: item.soldAt,
      customerId: undefined,
      customerName: item.customerName,
      customerType: 'retail',
      cashierId: 'cashier',
      cashierName: item.cashierName,
      items: [
        {
          productId: 'prod-item',
          name: `${item.lineItemCount} Products (${item.totalQuantity} Units)`,
          sku: 'LEDGER-ITEM',
          quantity: item.totalQuantity,
          unitPrice: item.grandTotal / (item.totalQuantity || 1),
          costPrice: 0,
          discount: item.discountTotal,
          total: item.grandTotal,
        },
      ],
      subtotal: item.subtotal,
      discount: item.discountTotal,
      tax: item.taxTotal,
      grandTotal: item.grandTotal,
      paymentMethod: item.paymentMethod as any,
      paymentReference: item.providerReference || undefined,
      status: item.saleStatus as any,
    };
    openReceiptModal(syntheticSale);
  };

  // Export Ledger to CSV
  const handleExportLedger = () => {
    if (!data?.receiptLedger.items.length) {
      addToast({
        type: 'warning',
        title: 'Export Warning',
        message: 'No ledger transactions available to export.',
      });
      return;
    }

    const headers = [
      'Receipt Reference',
      'Date & Time (EAT)',
      'Customer',
      'Contact Phone',
      'Cashier',
      'Line Items',
      'Total Quantity',
      'Payment Rail',
      'Channel Reference',
      'Status',
      'Subtotal (ETB)',
      'Discounts (ETB)',
      'Taxes (ETB)',
      'Grand Total (ETB)',
      'Settled Amount (ETB)',
    ];

    const rows = data.receiptLedger.items.map((it) => [
      it.receiptNumber,
      `${it.formattedDate} ${it.formattedTime}`,
      it.customerName,
      it.customerPhone || 'N/A',
      it.cashierName,
      it.lineItemCount,
      it.totalQuantity,
      it.paymentMethod,
      it.providerReference || 'N/A',
      it.saleStatus,
      it.subtotal,
      it.discountTotal,
      it.taxTotal,
      it.grandTotal,
      it.settledAmount,
    ]);

    exportToCSV(`Nasir_Amme_Ledger_${selectedRange}_${Date.now()}`, headers, rows);
    addToast({
      type: 'success',
      title: 'Export Succeeded',
      message: 'Audited receipt ledger exported to CSV successfully.',
    });
  };

  // Check RBAC Authorization
  const isAdminOrManager = roles.includes('admin') || roles.includes('manager');

  // Loading Screen
  if (authLoading || (isLoading && !data && !error)) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <p className="font-bold text-base text-slate-800 dark:text-slate-100">
            Querying Live PostgreSQL Engine...
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Aggregating sales ledger, inventory valuation, and POS cash sessions in Africa/Addis_Ababa
          </p>
        </div>
      </div>
    );
  }

  // Graceful Error Screen if database query failed and no cached data exists
  if (error && !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Dashboard Data Unavailable
          </h2>
          <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed font-mono">
            {error}
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Button
              variant="accent"
              onClick={() => fetchDashboardData(true)}
              className="w-full font-bold cursor-pointer"
            >
              Retry Connection
            </Button>
            <Link href="/login">
              <Button variant="outline" className="w-full text-xs">
                Switch Store Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated visitors redirect cleanly to login via AuthContext
  if (!user) {
    return null;
  }

  // Access Denied Screen (authenticated staff without admin or manager role)
  if (!isAdminOrManager) {
    const primaryRole = (roles[0] as RoleType) || 'cashier';
    const fallbackUrl = getDashboardRouteForRole(primaryRole);
    const roleName =
      primaryRole === 'cashier'
        ? 'Cashier'
        : primaryRole === 'stock_keeper'
        ? 'Stock Keeper'
        : 'Staff';

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Executive Access Restricted
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Administrator or Store Manager clearance required to inspect executive sales, margins,
            and financial journals.
          </p>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link href={fallbackUrl}>
              <Button variant="accent" className="w-full font-bold">
                Go to {roleName} Dashboard
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full text-xs">
                Switch Store Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate live expected cash difference for close shift modal
  const expectedDrawerCash = data?.posShift.session?.expectedDrawerCash ?? 0;
  const countedCashNum = parseFloat(countedCashInput) || 0;
  const cashDifference = countedCashNum - expectedDrawerCash;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. EXECUTIVE HEADER & OPERATIONAL STATUS */}
      <header className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Store Identification & Status Pills */}
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Operations Dashboard
              </h1>
              {/* Database Health Badge */}
              {data?.databaseHealth.connected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Live Synced ({data.databaseHealth.latencyMs}ms)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Database Degraded
                </span>
              )}
              {/* Engine Tag */}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Database className="w-3 h-3" /> PostgreSQL 16
              </span>
            </div>

            {/* Store Subtitle & Business Clock */}
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {data?.store.name}
                </span>{' '}
                ({data?.store.storeId}) • {data?.store.city}, Ethiopia
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono text-slate-600 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                {businessClock || 'Syncing business clock...'}
              </span>
              {lastRefreshedAt && (
                <>
                  <span>•</span>
                  <span className="text-[11px] text-slate-400">
                    Refreshed at{' '}
                    {lastRefreshedAt.toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Manual Refresh Button */}
            <button
              type="button"
              onClick={() => fetchDashboardData(true)}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Execute live PostgreSQL query"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
              />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>

            {/* Z-Report Direct Access */}
            <Link
              href="/reports"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <FileText className="w-4 h-4" />
              <span>Z-Report Journal</span>
            </Link>
          </div>
        </div>

        {/* Date Filter Ribbon & Shift Status Strip */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Range:
            </span>
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'last_7_days', label: 'Last 7 Days' },
                { id: 'last_30_days', label: 'Last 30 Days' },
                { id: 'this_month', label: 'This Month' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setSelectedRange(preset.id);
                  setLedgerPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedRange === preset.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsCustomDateModalOpen(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                selectedRange === 'custom'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              Custom Range...
            </button>
          </div>

          {/* Active POS Shift Ribbon */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            {data?.posShift.isOpen && data.posShift.session ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {data.posShift.session.sessionNumber} • Cashier:{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {data.posShift.session.cashierName}
                  </strong>{' '}
                  • Expected Drawer:{' '}
                  <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                    {formatETB(data.posShift.session.expectedDrawerCash)}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCloseShiftModalOpen(true)}
                  className="ml-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                >
                  Close Shift
                </button>
              </>
            ) : (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400"></span>
                <span className="text-slate-500 dark:text-slate-400">
                  No active cashier till shift open
                  {data?.posShift.lastClosedSession && (
                    <span className="ml-1 text-[11px]">
                      (Last closed: {data.posShift.lastClosedSession.sessionNumber} by{' '}
                      {data.posShift.lastClosedSession.cashierName})
                    </span>
                  )}
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Error Alert Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <div>
              <p className="font-bold">Operational Database Query Warning</p>
              <p className="text-[11px] mt-0.5">{error}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => fetchDashboardData(true)}>
            Retry Query
          </Button>
        </div>
      )}

      {/* 2. EXECUTIVE 10-CARD KPI GRID */}
      <section className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span className="font-semibold uppercase tracking-wider">
            Operational Metrics • Selected Period: {data?.period.label}
          </span>
          <span className="text-[11px]">
            Comparisons vs {data?.period.previousPeriod.label}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* 1. Gross Sales Revenue */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Gross Revenue</span>
              <DollarSign className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                {data?.kpis.grossSalesRevenue.formatted || '0.00'}
              </span>
              <span className="text-xs text-slate-500">ETB</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                vs {data?.kpis.grossSalesRevenue.formattedPrevious || '0.00'}
              </span>
              <span
                className={`font-bold flex items-center gap-0.5 ${
                  (data?.kpis.grossSalesRevenue.difference ?? 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {(data?.kpis.grossSalesRevenue.difference ?? 0) >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {data?.kpis.grossSalesRevenue.changePercent !== null
                  ? `${data?.kpis.grossSalesRevenue.changePercent}%`
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* 2. Net Sales Revenue */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Net Sales Revenue</span>
              <ShoppingBag className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                {data?.kpis.netSalesRevenue.formatted || '0.00'}
              </span>
              <span className="text-xs text-slate-500">ETB</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Less discounts & refunds</span>
              <span
                className={`font-bold flex items-center gap-0.5 ${
                  (data?.kpis.netSalesRevenue.difference ?? 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {data?.kpis.netSalesRevenue.changePercent !== null
                  ? `${data?.kpis.netSalesRevenue.changePercent}%`
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* 3. Gross Profit & Margin */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Gross Profit</span>
              <span className="text-[11px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {data?.kpis.grossProfit.grossMarginPercent !== null
                  ? `${data?.kpis.grossProfit.grossMarginPercent.toFixed(1)}% Margin`
                  : '0.0%'}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                {data?.kpis.grossProfit.formatted || '0.00'}
              </span>
              <span className="text-xs text-slate-500">ETB</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                vs {data?.kpis.grossProfit.formattedPrevious || '0.00'}
              </span>
              <span
                className={`font-bold flex items-center gap-0.5 ${
                  (data?.kpis.grossProfit.difference ?? 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {data?.kpis.grossProfit.changePercent !== null
                  ? `${data?.kpis.grossProfit.changePercent}%`
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* 4. Cost of Goods Sold (COGS) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Cost of Goods (COGS)</span>
              <Package className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                {data?.kpis.cogs.formatted || '0.00'}
              </span>
              <span className="text-xs text-slate-500">ETB</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Frozen unit cost basis</span>
              <span className="text-slate-500 font-mono">
                {data?.kpis.cogs.changePercent !== null
                  ? `${data?.kpis.cogs.changePercent}%`
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* 5. Sales Transaction Count */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Transaction Count</span>
              <Receipt className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                {data?.kpis.salesTransactionCount.current ?? 0}
              </span>
              <span className="text-xs text-slate-500">bills</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                vs {data?.kpis.salesTransactionCount.previous ?? 0} prior
              </span>
              <span
                className={`font-bold ${
                  (data?.kpis.salesTransactionCount.difference ?? 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {(data?.kpis.salesTransactionCount.difference ?? 0) >= 0 ? '+' : ''}
                {data?.kpis.salesTransactionCount.difference ?? 0}
              </span>
            </div>
          </div>

          {/* 6. Average Transaction Value (ATV) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Avg Transaction (ATV)</span>
              <TrendingUp className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                {data?.kpis.averageTransactionValue.formatted || '0.00'}
              </span>
              <span className="text-xs text-slate-500">ETB</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Net revenue per sale</span>
              <span className="font-mono text-slate-600 dark:text-slate-400">
                {data?.kpis.averageTransactionValue.changePercent !== null
                  ? `${data?.kpis.averageTransactionValue.changePercent}%`
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* 7. Inventory Asset Cost Value */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Inventory Asset Value</span>
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                {data?.kpis.inventoryAssetCost.formatted || '0.00'}
              </span>
              <span className="text-xs text-slate-500">ETB</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>{data?.kpis.inventoryAssetCost.activeSkuCount} SKUs Active</span>
              <span className="font-mono">
                {data?.kpis.inventoryAssetCost.totalUnitsOnHand} Pcs
              </span>
            </div>
          </div>

          {/* 8. Retail Potential Value */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Retail Potential</span>
              <Boxes className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                {data?.kpis.retailPotential.formatted || '0.00'}
              </span>
              <span className="text-xs text-slate-500">ETB</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>Markup Potential:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                +{data?.kpis.retailPotential.formattedPotentialProfit} ETB
              </span>
            </div>
          </div>

          {/* 9. Low Stock SKUs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Low Stock Count</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400">
                {data?.kpis.lowStockCount.count ?? 0}
              </span>
              <span className="text-xs text-slate-500">SKUs</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Reorder Threshold</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                ≤ {data?.kpis.lowStockCount.threshold} units
              </span>
            </div>
          </div>

          {/* 10. Out of Stock SKUs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Out of Stock</span>
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span
                className={`text-xl font-bold font-mono tracking-tight ${
                  (data?.kpis.outOfStockCount.count ?? 0) > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {data?.kpis.outOfStockCount.count ?? 0}
              </span>
              <span className="text-xs text-slate-500">SKUs</span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Immediate stockout</span>
              <span
                className={`font-semibold ${
                  (data?.kpis.outOfStockCount.count ?? 0) > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {(data?.kpis.outOfStockCount.count ?? 0) > 0 ? 'Critical' : 'Zero Deficit'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MAIN ANALYTICAL SECTION: RECHARTS DUAL-SERIES & RECENT JOURNAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Revenue vs Gross Profit Chart & Audited Receipt Ledger */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dual-Series Performance Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Revenue & Gross Profit Performance</span>
                  <span className="text-xs font-normal text-slate-400 font-mono">
                    ({data?.performanceChart.periodLabel})
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Single-query chronologically bucketed series in Africa/Addis_Ababa business dates
                </p>
              </div>

              {/* Chart Legend Summary */}
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                  <span className="w-3 h-3 rounded-xs bg-indigo-500"></span> Gross Revenue
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                  <span className="w-3 h-3 rounded-xs bg-emerald-500"></span> Gross Profit
                </span>
              </div>
            </div>

            {/* Recharts Area Container */}
            <div className="mt-4 h-72 w-full">
              {data?.performanceChart.series && data.performanceChart.series.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.performanceChart.series}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                    <XAxis
                      dataKey="label"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1', opacity: 0.3 }}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) =>
                        val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`
                      }
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl text-xs space-y-1.5 font-sans">
                              <p className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1">
                                {item.label} {item.isCurrentDay ? '(Today)' : ''}
                              </p>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-500">Gross Revenue:</span>
                                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  {formatETB(item.grossRevenue)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-500">Gross Profit:</span>
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  {formatETB(item.grossProfit)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-500">Cost of Goods:</span>
                                <span className="font-mono text-slate-600 dark:text-slate-300">
                                  {formatETB(item.cogs)}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-1 text-[11px] text-slate-400">
                                <span>Transactions:</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  {item.orderCount} sales
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="grossRevenue"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#revenueGrad)"
                      name="Gross Revenue"
                    />
                    <Area
                      type="monotone"
                      dataKey="grossProfit"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#profitGrad)"
                      name="Gross Profit"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No sales recorded in the selected chronological trajectory.
                </div>
              )}
            </div>

            {/* Trajectory Aggregate Summary Strip */}
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 text-center text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                  Window Gross Total
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatETB(data?.performanceChart.summary.totalGross)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                  Window Net Total
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatETB(data?.performanceChart.summary.totalNet)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                  Window Gross Profit
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatETB(data?.performanceChart.summary.totalProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Audited Receipt Ledger with Server-Side Pagination & Filtering */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Audited Receipt Ledger
                  </h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                    {data?.receiptLedger.pagination.totalCount ?? 0} Records
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Live PostgreSQL transaction journal with audit details and multi-rail settlements
                </p>
              </div>

              {/* Scope Toggle & Export Button */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-50 dark:bg-slate-950">
                  <button
                    type="button"
                    onClick={() => {
                      setLedgerScope('period');
                      setLedgerPage(1);
                    }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      ledgerScope === 'period'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Period Scope
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLedgerScope('all');
                      setLedgerPage(1);
                    }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      ledgerScope === 'all'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    All History
                  </button>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportLedger}
                  className="text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </Button>
              </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => {
                    setLedgerSearch(e.target.value);
                    setLedgerPage(1);
                  }}
                  placeholder="Search receipt #, customer, cashier..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Payment Method Filter */}
                <select
                  value={paymentFilter}
                  onChange={(e) => {
                    setPaymentFilter(e.target.value);
                    setLedgerPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs transition-colors"
                >
                  <option value="all">All Payment Rails</option>
                  <option value="cash">Cash (Drawer)</option>
                  <option value="telebirr">Telebirr</option>
                  <option value="cbe_birr">CBE Birr</option>
                  <option value="bank">Bank Transfer</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setLedgerPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs transition-colors"
                >
                  <option value="all">All Statuses</option>
                  <option value="posted">Posted (Settled)</option>
                  <option value="partially_returned">Partially Returned</option>
                  <option value="returned">Returned</option>
                  <option value="voided">Voided</option>
                </select>
              </div>
            </div>

            {/* Table Presentation */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800 font-mono">
                  <tr>
                    <th className="py-3 px-4">Receipt Ref</th>
                    <th className="py-3 px-4">Timestamp (EAT)</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Items / Units</th>
                    <th className="py-3 px-4">Cashier</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Settled (ETB)</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {data?.receiptLedger.items && data.receiptLedger.items.length > 0 ? (
                    data.receiptLedger.items.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-200">
                          {row.receiptNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          <div>{row.formattedDate}</div>
                          <div className="text-[10px] text-slate-400">{row.formattedTime}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-800 dark:text-slate-200 max-w-[140px] truncate">
                          <span title={row.customerName}>{row.customerName}</span>
                          {row.customerPhone && (
                            <span className="block text-[10px] text-slate-400 font-mono">
                              {row.customerPhone}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {row.lineItemCount} lines ({row.totalQuantity} pcs)
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {row.cashierName}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                              row.paymentMethod === 'Telebirr'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                : row.paymentMethod === 'CBE Birr'
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                                : row.paymentMethod === 'Bank Invoice'
                                ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            {row.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.saleStatus === 'posted'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : row.saleStatus === 'voided'
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {row.saleStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatETB(row.grandTotal)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleViewReceipt(row)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                            title="Inspect Thermal Voucher"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-xs text-slate-400">
                        No transactions registered for the selected filter and period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {data?.receiptLedger.pagination && (
              <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing page {data.receiptLedger.pagination.page} of{' '}
                  {data.receiptLedger.pagination.totalPages} (
                  {data.receiptLedger.pagination.totalCount} total)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={data.receiptLedger.pagination.page <= 1}
                    onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                    className="cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      data.receiptLedger.pagination.page >=
                      data.receiptLedger.pagination.totalPages
                    }
                    onClick={() => setLedgerPage((p) => p + 1)}
                    className="cursor-pointer"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: SKU Velocity, Tender Breakdown & Procurement Fast-Track */}
        <div className="space-y-6">
          {/* SKU Velocity Intelligence Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>SKU Velocity (Top Volume)</span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {data?.skuVelocity.isFallback
                    ? data.skuVelocity.fallbackPeriodLabel
                    : `Billed items in ${data?.period.label}`}
                </p>
              </div>
              <Link
                href="/products"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                Catalog →
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 mt-2">
              {data?.skuVelocity.items && data.skuVelocity.items.length > 0 ? (
                data.skuVelocity.items.map((item) => (
                  <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate"
                        title={item.name}
                      >
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                        <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                          {item.sku}
                        </span>
                        <span>•</span>
                        <span>{item.brand}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10px]">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {item.unitsSold} units billed
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500 font-mono">
                          Revenue: {formatETB(item.grossSalesRevenue)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="block text-xs font-mono font-bold text-slate-900 dark:text-white">
                        {formatETB(item.sellingPrice)}
                      </span>
                      <span
                        className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.stockStatus === 'out_of_stock'
                            ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            : item.stockStatus === 'low_stock'
                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {item.currentStock} on hand
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  No sales velocity records in the selected period.
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 leading-relaxed">
              * Note: Historical sales velocity indicates turnover speed; inventory valuation uses
              frozen moving-average unit costs.
            </div>
          </div>

          {/* Payment Tender Reconciliation Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-500" />
                  <span>Tender Breakdown & Settlement</span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Multi-rail intake during {data?.period.label}
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                {data?.tenderBreakdown.formattedTotalSettled} ETB
              </span>
            </div>

            <div className="space-y-3 mt-4">
              {data?.tenderBreakdown.channels.map((ch) => (
                <div key={ch.rail} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      {ch.rail === 'telebirr' ? (
                        <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                      ) : ch.rail === 'cbe_birr' ? (
                        <CreditCard className="w-3.5 h-3.5 text-purple-500" />
                      ) : ch.rail === 'cash' ? (
                        <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      {ch.displayName}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {ch.formatted} ETB{' '}
                      <span className="text-[10px] font-normal text-slate-400">
                        ({ch.transactionCount} tx)
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        ch.rail === 'telebirr'
                          ? 'bg-blue-500'
                          : ch.rail === 'cbe_birr'
                          ? 'bg-purple-500'
                          : ch.rail === 'cash'
                          ? 'bg-emerald-500'
                          : 'bg-slate-500'
                      }`}
                      style={{ width: `${Math.min(100, ch.percentageOfTotal)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Total Settled Intake:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {data?.tenderBreakdown.formattedTotalSettled} ETB
                </span>
              </div>
              <div className="flex justify-between">
                <span>Returns / Refunds Issued:</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  -{data?.tenderBreakdown.formattedTotalRefunds} ETB
                </span>
              </div>
            </div>
          </div>

          {/* Operational Alerts & Fast-Track Procurement */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Critical Inventory & PO Fast-Track</span>
              </h2>
              <Link
                href="/inventory"
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold"
              >
                Stock Ops →
              </Link>
            </div>

            {/* Critical Stock Items List */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Deficit SKUs Requiring Reorder
              </span>
              {data?.operationalAlerts.criticalStockItems &&
              data.operationalAlerts.criticalStockItems.length > 0 ? (
                data.operationalAlerts.criticalStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {item.sku} • On Hand: {item.onHand} • Safety Level: {item.reorderLevel}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      Deficit: -{item.deficitUnits} pcs
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> All active items are above safety thresholds.
                </p>
              )}
            </div>

            {/* Pending Purchase Orders */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Pending Goods Intake
                </span>
                <Link
                  href="/purchases"
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  View POs →
                </Link>
              </div>

              {data?.operationalAlerts.pendingPurchaseOrders &&
              data.operationalAlerts.pendingPurchaseOrders.length > 0 ? (
                data.operationalAlerts.pendingPurchaseOrders.map((po) => (
                  <div
                    key={po.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white font-mono">
                        {po.poNumber}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate max-w-[150px]">
                        {po.supplierName} • {po.itemCount} items
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="block font-mono font-bold text-slate-800 dark:text-slate-200">
                        {po.formattedTotal} ETB
                      </span>
                      <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
                        {po.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">No pending inbound PO receipts.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. CUSTOM DATE RANGE SELECTION MODAL */}
      <Modal
        isOpen={isCustomDateModalOpen}
        onClose={() => setIsCustomDateModalOpen(false)}
        title="Select Custom Business Date Range"
      >
        <div className="p-4 space-y-4">
          <p className="text-xs text-slate-500">
            Select start and end dates evaluated according to store time in Dire Dawa, Ethiopia
            (Africa/Addis_Ababa, UTC+3).
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCustomDateModalOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={() => {
                if (customStartDate && customEndDate) {
                  setSelectedRange('custom');
                  setIsCustomDateModalOpen(false);
                  setLedgerPage(1);
                } else {
                  addToast({
                    type: 'warning',
                    title: 'Date Selection',
                    message: 'Please select both start and end dates.',
                  });
                }
              }}
              className="font-bold cursor-pointer"
            >
              Apply Custom Range
            </Button>
          </div>
        </div>
      </Modal>

      {/* 5. SECURE SHIFT CLOSING & RECONCILIATION MODAL */}
      <Modal
        isOpen={isCloseShiftModalOpen}
        onClose={() => setIsCloseShiftModalOpen(false)}
        title="POS Shift Closure & Till Reconciliation"
      >
        <div className="p-4 space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Session Number:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {data?.posShift.session?.sessionNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {data?.posShift.session?.cashierName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Opening Float:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {formatETB(data?.posShift.session?.openingFloat)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cash Sales Recorded:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                +{formatETB(data?.posShift.session?.cashSales)}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800 font-bold">
              <span>Expected Cash in Drawer:</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">
                {formatETB(expectedDrawerCash)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Counted Physical Cash in Till (ETB) *
            </label>
            <input
              type="number"
              step="0.01"
              value={countedCashInput}
              onChange={(e) => setCountedCashInput(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          {countedCashInput && (
            <div
              className={`p-2.5 rounded-xl border text-xs flex justify-between font-mono font-bold ${
                Math.abs(cashDifference) < 0.01
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : cashDifference > 0
                  ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                  : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
              }`}
            >
              <span>Difference:</span>
              <span>
                {cashDifference > 0 ? '+' : ''}
                {cashDifference.toFixed(2)} ETB{' '}
                {Math.abs(cashDifference) < 0.01
                  ? '(Perfect Balance)'
                  : cashDifference > 0
                  ? '(Surplus)'
                  : '(Deficit)'}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reconciliation Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={closeShiftNotes}
              onChange={(e) => setCloseShiftNotes(e.target.value)}
              placeholder="Provide reason for any drawer variance..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              disabled={isClosingShift}
              onClick={() => setIsCloseShiftModalOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="accent"
              size="sm"
              disabled={isClosingShift || !countedCashInput}
              onClick={handleCloseShift}
              className="font-bold cursor-pointer bg-rose-600 hover:bg-rose-500 text-white"
            >
              {isClosingShift ? 'Reconciling Shift...' : 'Confirm Shift Closure'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
