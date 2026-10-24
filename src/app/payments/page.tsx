'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  Download,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  Receipt,
  Smartphone,
  Banknote,
  Building,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  ArrowUpDown,
  User,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { formatETB, formatDate } from '@/lib/formatters';
import { exportToCSV } from '@/lib/export';

interface PaymentRecord {
  id: string;
  shopId: string;
  saleId: string;
  cashSessionId: string | null;
  method: string;
  status: string;
  amount: number | string;
  amountTendered: number | string | null;
  changeGiven: number | string | null;
  currencyCode: string;
  providerReference: string | null;
  receivedAt: string;
  recordedBy: string;
  sale?: {
    id: string;
    receiptNumber: string;
    grandTotal: number | string;
    soldAt: string;
    customer?: {
      id: string;
      displayName: string;
      phone: string;
    } | null;
    cashier?: {
      id: string;
      fullName: string;
      email: string;
    } | null;
  };
  cashSession?: {
    id: string;
    sessionNumber: string;
    status: string;
  } | null;
}

interface PaymentSummary {
  totalCollected: number;
  totalCount: number;
  cash: number;
  telebirr: number;
  cbe_birr: number;
  bank_transfer: number;
  credit: number;
}

export default function PaymentsPage() {
  const { addToast } = useApp();
  const { user, hasRole } = useAuth();
  const canManage = hasRole('admin', 'manager');

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({
    totalCollected: 0,
    totalCount: 0,
    cash: 0,
    telebirr: 0,
    cbe_birr: 0,
    bank_transfer: 0,
    credit: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [inspectingPayment, setInspectingPayment] = useState<PaymentRecord | null>(null);
  const [voidingPayment, setVoidingPayment] = useState<PaymentRecord | null>(null);

  // Form states
  const [addForm, setAddForm] = useState({
    receiptNumber: '',
    method: 'telebirr',
    amount: '',
    amountTendered: '',
    providerReference: '',
    notes: '',
  });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  const [editForm, setEditForm] = useState({
    providerReference: '',
    method: 'telebirr',
    status: 'succeeded',
    amount: '',
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/payments');
      const json = await res.json();
      if (json.success && json.data) {
        setPayments(json.data.payments || []);
        if (json.data.summary) {
          setSummary(json.data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
      addToast({
        type: 'error',
        title: 'Network Issue',
        message: 'Could not fetch payments ledger from database.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.sale?.receiptNumber && p.sale.receiptNumber.toLowerCase().includes(q)) ||
        (p.providerReference && p.providerReference.toLowerCase().includes(q)) ||
        (p.recordedBy && p.recordedBy.toLowerCase().includes(q)) ||
        (p.sale?.customer?.displayName &&
          p.sale.customer.displayName.toLowerCase().includes(q)) ||
        (p.sale?.customer?.phone && p.sale.customer.phone.includes(q));

      const matchMethod = methodFilter === 'all' || p.method === methodFilter;
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;

      return matchSearch && matchMethod && matchStatus;
    });
  }, [payments, searchTerm, methodFilter, statusFilter]);

  // Method Icon & Style Helper
  const getMethodBadge = (method: string) => {
    switch (method.toLowerCase()) {
      case 'telebirr':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Telebirr
          </span>
        );
      case 'cbe_birr':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <CreditCard className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            CBE Birr
          </span>
        );
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Banknote className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Cash Register
          </span>
        );
      case 'bank_transfer':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <Building className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Bank Transfer
          </span>
        );
      case 'credit':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <User className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            Customer Credit
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {method.toUpperCase()}
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
        return (
          <Badge variant="success" size="sm">
            <CheckCircle2 className="w-3 h-3 mr-1 inline" /> Succeeded
          </Badge>
        );
      case 'refunded':
        return (
          <Badge variant="danger" size="sm">
            <XCircle className="w-3 h-3 mr-1 inline" /> Refunded / Void
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="warning" size="sm">
            <Clock className="w-3 h-3 mr-1 inline" /> Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            {status}
          </Badge>
        );
    }
  };

  // Handle Record New Payment
  const handleOpenAdd = () => {
    setAddForm({
      receiptNumber: '',
      method: 'telebirr',
      amount: '',
      amountTendered: '',
      providerReference: '',
      notes: '',
    });
    setAddErrors({});
    setIsAddModalOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!addForm.receiptNumber.trim()) {
      errors.receiptNumber = 'Receipt number (e.g. REC-2026-0001) is required';
    }
    const amt = Number(addForm.amount);
    if (isNaN(amt) || amt <= 0) {
      errors.amount = 'Valid positive amount in ETB is required';
    }

    if (Object.keys(errors).length > 0) {
      setAddErrors(errors);
      return;
    }

    setIsSubmittingAdd(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptNumber: addForm.receiptNumber.trim(),
          method: addForm.method,
          amount: amt,
          amountTendered: addForm.amountTendered ? Number(addForm.amountTendered) : null,
          changeGiven:
            addForm.amountTendered && Number(addForm.amountTendered) > amt
              ? Number(addForm.amountTendered) - amt
              : null,
          providerReference: addForm.providerReference.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to record payment');
      }

      addToast({
        type: 'success',
        title: 'Payment Recorded',
        message: `Successfully posted ${formatETB(amt)} via ${addForm.method.toUpperCase()} to receipt ${addForm.receiptNumber.trim()}.`,
      });

      setIsAddModalOpen(false);
      fetchPayments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error recording payment';
      setAddErrors({ receiptNumber: msg });
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Handle Edit Payment
  const handleOpenEdit = (payment: PaymentRecord) => {
    setEditingPayment(payment);
    setEditForm({
      providerReference: payment.providerReference || '',
      method: payment.method,
      status: payment.status,
      amount: String(payment.amount),
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    setIsSubmittingEdit(true);
    try {
      const res = await fetch(`/api/payments/${editingPayment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerReference: editForm.providerReference.trim() || null,
          method: editForm.method,
          status: editForm.status,
          amount: editForm.amount ? Number(editForm.amount) : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update payment');
      }

      addToast({
        type: 'success',
        title: 'Payment Updated',
        message: `Payment record updated with reference "${editForm.providerReference.trim()}".`,
      });

      setEditingPayment(null);
      fetchPayments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update payment';
      addToast({
        type: 'error',
        title: 'Update Error',
        message: msg,
      });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Void Payment
  const handleConfirmVoid = async () => {
    if (!voidingPayment) return;
    try {
      const res = await fetch(`/api/payments/${voidingPayment.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to void payment');
      }

      addToast({
        type: 'info',
        title: 'Payment Voided',
        message: `Payment ${formatETB(Number(voidingPayment.amount))} marked as refunded in accounting ledger.`,
      });

      setVoidingPayment(null);
      fetchPayments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to void payment';
      addToast({
        type: 'error',
        title: 'Void Error',
        message: msg,
      });
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Payment ID',
      'Receipt Number',
      'Date & Time',
      'Tender Method',
      'Amount (ETB)',
      'Provider Reference / FT',
      'Status',
      'Customer',
      'Cashier',
    ];

    const rows = filteredPayments.map((p) => [
      p.id,
      p.sale?.receiptNumber || '—',
      formatDate(p.receivedAt),
      p.method.toUpperCase(),
      Number(p.amount),
      p.providerReference || '—',
      p.status.toUpperCase(),
      p.sale?.customer?.displayName || 'Walk-in Customer',
      p.recordedBy || '—',
    ]);

    exportToCSV('nasir_amme_payments_ledger', headers, rows);
    addToast({
      type: 'info',
      title: 'Ledger Exported',
      message: `${filteredPayments.length} payment records exported to CSV.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Payments & Tender Ledger
            </h1>
            <Badge variant="accent" size="sm">
              {filteredPayments.length} Records
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time audit log of Telebirr, CBE Birr, Cash register, and Bank payments.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPayments}
            isLoading={refreshing}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>

          <Button
            variant="accent"
            size="sm"
            onClick={handleOpenAdd}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Record Payment
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Collected */}
        <Card className="p-4 border-l-4 border-l-[#D9A441]">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Succeeded Collections
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {formatETB(summary.totalCollected)}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {summary.totalCount} completed transactions
          </div>
        </Card>

        {/* Telebirr Collections */}
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Telebirr Wallet
            </div>
            <Smartphone className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">
            {formatETB(summary.telebirr)}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Instant digital payments
          </div>
        </Card>

        {/* CBE Birr */}
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              CBE Birr / FT
            </div>
            <CreditCard className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 mt-1">
            {formatETB(summary.cbe_birr)}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Direct Commercial Bank deposits
          </div>
        </Card>

        {/* Cash Register */}
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Physical Cash Register
            </div>
            <Banknote className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-blue-700 dark:text-blue-400 mt-1">
            {formatETB(summary.cash)}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Over-the-counter drawer cash
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <div className="p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by receipt #, provider reference, customer, or cashier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D9A441] bg-slate-50/50 dark:bg-slate-900/60 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tender Method Filter */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              <option value="all">All Payment Methods</option>
              <option value="telebirr">Telebirr Wallet</option>
              <option value="cbe_birr">CBE Birr / FT</option>
              <option value="cash">Cash Register</option>
              <option value="bank_transfer">Bank Wire</option>
              <option value="credit">Customer Credit</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              <option value="all">All Statuses</option>
              <option value="succeeded">Succeeded</option>
              <option value="refunded">Refunded / Voided</option>
              <option value="pending">Pending</option>
            </select>

            {(searchTerm || methodFilter !== 'all' || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setMethodFilter('all');
                  setStatusFilter('all');
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Ledger Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">Receipt # & Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Tender Method</th>
                <th className="py-3 px-4">Provider Reference / FT</th>
                <th className="py-3 px-4 text-right">Amount (ETB)</th>
                <th className="py-3 px-4 text-center">Cashier</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#D9A441]" />
                    Loading payments ledger from database...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    No payments found matching the current search criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const amtNum = Number(p.amount);
                  const tenderedNum = p.amountTendered ? Number(p.amountTendered) : null;
                  const changeNum = p.changeGiven ? Number(p.changeGiven) : null;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Receipt & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 font-mono">
                          <Receipt className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.sale?.receiptNumber || 'UNLINKED'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {formatDate(p.receivedAt)}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                          {p.sale?.customer?.displayName || 'Walk-in Customer'}
                        </div>
                        {p.sale?.customer?.phone && (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            {p.sale.customer.phone}
                          </div>
                        )}
                      </td>

                      {/* Method */}
                      <td className="py-3.5 px-4">
                        {getMethodBadge(p.method)}
                      </td>

                      {/* Reference */}
                      <td className="py-3.5 px-4">
                        {p.providerReference ? (
                          <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {p.providerReference}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Over the counter</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right">
                        <div
                          className={`font-bold text-sm ${
                            p.status === 'refunded'
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {formatETB(amtNum)}
                        </div>
                        {tenderedNum !== null && changeNum !== null && changeNum > 0 && (
                          <div className="text-[10px] text-slate-400">
                            Tendered: {formatETB(tenderedNum)} • Chg: {formatETB(changeNum)}
                          </div>
                        )}
                      </td>

                      {/* Cashier */}
                      <td className="py-3.5 px-4 text-center text-xs text-slate-600 dark:text-slate-300">
                        {p.recordedBy}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(p.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setInspectingPayment(p)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                            title="View Transaction Details"
                            aria-label="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md transition-colors"
                            title="Edit Reference / Method"
                            aria-label="Edit Payment"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {canManage && p.status !== 'refunded' && (
                            <button
                              onClick={() => setVoidingPayment(p)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors"
                              title="Void / Refund Payment"
                              aria-label="Void Payment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        size="md"
        title="Record Tender Payment"
        description="Post customer payment into the authenticated store audit ledger."
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Receipt Number *
            </label>
            <input
              type="text"
              placeholder="e.g. REC-2026-0001"
              value={addForm.receiptNumber}
              onChange={(e) => setAddForm({ ...addForm, receiptNumber: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
            {addErrors.receiptNumber && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                {addErrors.receiptNumber}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Tender Method *
              </label>
              <select
                value={addForm.method}
                onChange={(e) => setAddForm({ ...addForm, method: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              >
                <option value="telebirr">Telebirr Wallet</option>
                <option value="cbe_birr">CBE Birr / FT</option>
                <option value="cash">Cash Register</option>
                <option value="bank_transfer">Bank Wire</option>
                <option value="credit">Store Credit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Amount (ETB) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={addForm.amount}
                onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
              {addErrors.amount && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                  {addErrors.amount}
                </p>
              )}
            </div>
          </div>

          {addForm.method === 'cash' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Amount Tendered by Customer (for Change Calculation)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Optional customer cash tendered"
                value={addForm.amountTendered}
                onChange={(e) => setAddForm({ ...addForm, amountTendered: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
              {addForm.amountTendered &&
                Number(addForm.amountTendered) > Number(addForm.amount) && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                    Change to Return:{' '}
                    {formatETB(Number(addForm.amountTendered) - Number(addForm.amount))}
                  </p>
                )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Provider Reference / Telebirr Code / CBE FT Number
            </label>
            <input
              type="text"
              placeholder="e.g. CI94883920 or FT2609930"
              value={addForm.providerReference}
              onChange={(e) => setAddForm({ ...addForm, providerReference: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmittingAdd}
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingAdd}>
              Save Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Payment Modal */}
      {editingPayment && (
        <Modal
          isOpen={!!editingPayment}
          onClose={() => setEditingPayment(null)}
          size="md"
          title={`Edit Payment: ${editingPayment.sale?.receiptNumber || editingPayment.id}`}
          description="Update digital provider reference code, tender method, or status."
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Provider Reference (Telebirr Code or CBE Birr FT)
              </label>
              <input
                type="text"
                placeholder="e.g. CI294829 or FT260812"
                value={editForm.providerReference}
                onChange={(e) =>
                  setEditForm({ ...editForm, providerReference: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Tender Method
                </label>
                <select
                  value={editForm.method}
                  onChange={(e) => setEditForm({ ...editForm, method: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
                >
                  <option value="telebirr">Telebirr</option>
                  <option value="cbe_birr">CBE Birr</option>
                  <option value="cash">Cash Register</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit">Store Credit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Payment Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
                >
                  <option value="succeeded">Succeeded</option>
                  <option value="refunded">Refunded / Void</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmittingEdit}
                onClick={() => setEditingPayment(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmittingEdit}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Inspect Detail Modal */}
      {inspectingPayment && (
        <Modal
          isOpen={!!inspectingPayment}
          onClose={() => setInspectingPayment(null)}
          size="md"
          title={`Payment Receipt: ${inspectingPayment.sale?.receiptNumber || 'UNLINKED'}`}
          description={`Logged at ${formatDate(inspectingPayment.receivedAt)}`}
          footer={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setInspectingPayment(null)}
            >
              Close
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Total Tendered</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white">
                  {formatETB(Number(inspectingPayment.amount))}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Payment Channel</span>
                <span>{getMethodBadge(inspectingPayment.method)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Transaction Status</span>
                <span>{getStatusBadge(inspectingPayment.status)}</span>
              </div>
              {inspectingPayment.providerReference && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Reference / FT Code</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {inspectingPayment.providerReference}
                  </span>
                </div>
              )}
            </div>

            <div className="text-xs space-y-2 text-slate-700 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Customer:</span>
                <span className="font-medium">
                  {inspectingPayment.sale?.customer?.displayName || 'Walk-in Retail Customer'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Cashier on Duty:</span>
                <span className="font-medium">{inspectingPayment.recordedBy}</span>
              </div>
              {inspectingPayment.cashSession && (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Cash Session:</span>
                  <span className="font-mono font-medium">
                    {inspectingPayment.cashSession.sessionNumber} ({inspectingPayment.cashSession.status})
                  </span>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Void Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!voidingPayment}
        onClose={() => setVoidingPayment(null)}
        onConfirm={handleConfirmVoid}
        title="Void / Refund Payment?"
        message={`Are you sure you want to mark this ${voidingPayment ? formatETB(Number(voidingPayment.amount)) : ''} payment as refunded? This operation maintains an immutable audit log entry.`}
        confirmLabel="Void Payment"
        variant="danger"
      />
    </div>
  );
}
