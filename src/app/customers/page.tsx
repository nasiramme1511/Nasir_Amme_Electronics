'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Customer } from '@/types';
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Download,
  Edit2,
  Eye,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { formatETB } from '@/lib/formatters';
import { exportToCSV } from '@/lib/export';

export default function CustomersPage() {
  const { customers, addCustomer, updateCustomer, addToast } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [inspectingCustomer, setInspectingCustomer] = useState<Customer | null>(null);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const initialForm = {
    name: '',
    phone: '',
    email: '',
    customerType: 'retail' as 'retail' | 'wholesale',
    city: 'Dire Dawa',
    address: '',
    creditBalanceETB: 0,
    notes: '',
  };
  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        searchTerm === '' ||
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.city.toLowerCase().includes(searchTerm.toLowerCase());

      const matchType = selectedType === 'all' || c.customerType === selectedType;

      return matchSearch && matchType;
    });
  }, [customers, searchTerm, selectedType]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData(initialForm);
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormData({
      name: cust.name,
      phone: cust.phone,
      email: cust.email || '',
      customerType: cust.customerType,
      city: cust.city,
      address: cust.address || '',
      creditBalanceETB: cust.creditBalanceETB,
      notes: cust.notes || '',
    });
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Customer name is required';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, formData);
    } else {
      addCustomer({
        ...formData,
        totalSpentETB: 0,
        loyaltyPoints: 0,
      });
    }

    setIsAddEditModalOpen(false);
  };

  const handleExportCSV = () => {
    const headers = [
      'Name',
      'Phone',
      'Email',
      'Customer Type',
      'City',
      'Address',
      'Total Spent (ETB)',
      'Credit Balance (ETB)',
      'Loyalty Points',
    ];

    const rows = filteredCustomers.map((c) => [
      c.name,
      c.phone,
      c.email || '',
      c.customerType,
      c.city,
      c.address || '',
      c.totalSpentETB,
      c.creditBalanceETB,
      c.loyaltyPoints,
    ]);

    exportToCSV('nasir_amme_customers', headers, rows);
    addToast({
      type: 'info',
      title: 'Customers Exported',
      message: `${filteredCustomers.length} customer records exported to CSV.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Customers & Accounts
            </h1>
            <Badge variant="accent" size="sm">
              {customers.length} Profiles
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Retail buyers, hotel accounts, and regional mobile repair workshops in Dire Dawa.
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
          <Button
            variant="accent"
            size="sm"
            onClick={handleOpenAdd}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Register Customer
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer name, phone, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#D9A441] bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              <option value="all">All Customer Types</option>
              <option value="retail">Retail Consumers</option>
              <option value="wholesale">Wholesale / Workshops</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-600 text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4 text-right">Total Spent (ETB)</th>
                <th className="py-3 px-4 text-right">Credit Balance</th>
                <th className="py-3 px-4 text-center">Loyalty Points</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((cust) => (
                <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{cust.name}</div>
                    {cust.notes && (
                      <div className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">
                        {cust.notes}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <div className="font-medium text-slate-800">{cust.phone}</div>
                    {cust.email && <div className="text-[11px] text-slate-400">{cust.email}</div>}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={cust.customerType === 'wholesale' ? 'accent' : 'neutral'} size="sm">
                      {cust.customerType.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                    {cust.city}
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                    {formatETB(cust.totalSpentETB)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`font-bold ${
                        cust.creditBalanceETB > 0 ? 'text-amber-700' : 'text-slate-500'
                      }`}
                    >
                      {formatETB(cust.creditBalanceETB)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#16845B]">
                      <Award className="w-3.5 h-3.5" />
                      {cust.loyaltyPoints} pts
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setInspectingCustomer(cust)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                        title="View Profile"
                        aria-label={`View ${cust.name}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(cust)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                        title="Edit Customer"
                        aria-label={`Edit ${cust.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Customer Detail Modal */}
      {inspectingCustomer && (
        <Modal
          isOpen={!!inspectingCustomer}
          onClose={() => setInspectingCustomer(null)}
          size="md"
          title={inspectingCustomer.name}
          description={`Customer Type: ${inspectingCustomer.customerType.toUpperCase()} • ${inspectingCustomer.city}`}
          footer={
            <Button variant="primary" size="sm" onClick={() => setInspectingCustomer(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Total Lifetime Purchases</span>
                <span className="text-sm font-bold text-slate-900">
                  {formatETB(inspectingCustomer.totalSpentETB)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Outstanding Store Credit</span>
                <span className="text-sm font-bold text-amber-700">
                  {formatETB(inspectingCustomer.creditBalanceETB)}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>Phone: <strong>{inspectingCustomer.phone}</strong></span>
              </div>
              {inspectingCustomer.email && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>Email: <strong>{inspectingCustomer.email}</strong></span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>Location: {inspectingCustomer.address || 'Over the counter'}, {inspectingCustomer.city}</span>
              </div>
              <div className="flex items-center gap-2 text-[#16845B] font-semibold pt-1">
                <Award className="w-4 h-4" />
                <span>Loyalty Club: {inspectingCustomer.loyaltyPoints} points earned</span>
              </div>
            </div>

            {inspectingCustomer.notes && (
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-600">
                <span className="font-semibold block text-slate-700 mb-1">Customer Preferences:</span>
                {inspectingCustomer.notes}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        size="md"
        title={editingCustomer ? 'Edit Customer' : 'Register New Customer'}
        description="Add customer record for receipts, wholesale discounts, or store credit."
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer / Business Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Gende Kore Phone Repairs"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
            {formErrors.name && (
              <p className="text-xs text-rose-600 mt-1">{formErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+251 9..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
              {formErrors.phone && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Type
              </label>
              <select
                value={formData.customerType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customerType: e.target.value as 'retail' | 'wholesale',
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              >
                <option value="retail">Retail Consumer</option>
                <option value="wholesale">Wholesale Buyer / Workshop</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Address / Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Near Kebele 02, Buys in bulk on weekends"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingCustomer ? 'Save Changes' : 'Register Customer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
