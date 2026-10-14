'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  Search,
  ShoppingCart,
  Download,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatETB, formatDate } from '@/lib/formatters';
import { exportToCSV } from '@/lib/export';

export default function SalesHistoryPage() {
  const { sales, openReceiptModal, addToast } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchSearch =
        searchTerm === '' ||
        s.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.cashierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.paymentReference && s.paymentReference.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchMethod = selectedMethod === 'all' || s.paymentMethod === selectedMethod;

      return matchSearch && matchMethod;
    });
  }, [sales, searchTerm, selectedMethod]);

  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + s.grandTotal, 0);
  }, [filteredSales]);

  const handleExportCSV = () => {
    const headers = [
      'Receipt Number',
      'Date & Time',
      'Customer',
      'Customer Type',
      'Items Count',
      'Subtotal (ETB)',
      'Discount (ETB)',
      'Total (ETB)',
      'Payment Method',
      'Payment Ref',
      'Cashier',
      'Status',
    ];

    const rows = filteredSales.map((s) => [
      s.receiptNumber,
      formatDate(s.date),
      s.customerName,
      s.customerType.toUpperCase(),
      s.items.length,
      s.subtotal,
      s.discount,
      s.grandTotal,
      s.paymentMethod.toUpperCase(),
      s.paymentReference || '—',
      s.cashierName,
      s.status.toUpperCase(),
    ]);

    exportToCSV('nasir_amme_sales_history', headers, rows);
    addToast({
      type: 'info',
      title: 'Sales History Exported',
      message: `${filteredSales.length} transaction records exported to CSV.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Sales History & Receipts
            </h1>
            <Badge variant="accent" size="sm">
              {sales.length} Transactions
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Browse and reprint thermal receipts issued at the Nasir Amme Electronics checkout counter.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>

          <Link href="/sales/checkout">
            <Button
              variant="accent"
              size="sm"
              leftIcon={<ShoppingCart className="w-4 h-4" />}
            >
              Open POS Cashier
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-[#101827]">
          <span className="text-xs text-slate-500 font-semibold uppercase">
            Filtered Total Volume
          </span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {formatETB(totalRevenue)}
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#D9A441]">
          <span className="text-xs text-slate-500 font-semibold uppercase">
            Transactions Count
          </span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {filteredSales.length} Receipts
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-[#16845B]">
          <span className="text-xs text-slate-500 font-semibold uppercase">
            Average Ticket Size
          </span>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {formatETB(filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0)}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by receipt #, customer name, ref, or cashier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#D9A441] bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              <option value="all">All Payment Methods</option>
              <option value="telebirr">Telebirr</option>
              <option value="cbe_birr">CBE Birr</option>
              <option value="cash">Cash</option>
              <option value="credit">Credit / Account</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Sales Transactions Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-600 text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Grand Total (ETB)</th>
                <th className="py-3 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 text-xs">
                    {sale.receiptNumber}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                    {formatDate(sale.date)}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800 text-xs">
                      {sale.customerName}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Cashier: {sale.cashierName}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center text-xs text-slate-600">
                    <span className="font-bold text-slate-800">
                      {sale.items.reduce((s, i) => s + i.quantity, 0)}
                    </span>{' '}
                    pcs ({sale.items.length} lines)
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant={
                        sale.paymentMethod === 'telebirr'
                          ? 'accent'
                          : sale.paymentMethod === 'cbe_birr'
                          ? 'info'
                          : sale.paymentMethod === 'cash'
                          ? 'success'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {sale.paymentMethod.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                    {formatETB(sale.grandTotal)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openReceiptModal(sale)}
                      className="h-8 text-xs px-2.5"
                      leftIcon={<Receipt className="w-3.5 h-3.5 text-[#D9A441]" />}
                    >
                      Reprint
                    </Button>
                  </td>
                </tr>
              ))}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    No sales receipts match this query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
