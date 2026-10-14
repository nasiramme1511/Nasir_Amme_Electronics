'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Supplier } from '@/types';
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Download,
  Edit2,
  Eye,
  Building,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { formatETB } from '@/lib/formatters';
import { exportToCSV } from '@/lib/export';

export default function SuppliersPage() {
  const { suppliers, addSupplier, updateSupplier, addToast } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTerms, setSelectedTerms] = useState<string>('all');
  const [inspectingSupplier, setInspectingSupplier] = useState<Supplier | null>(null);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  interface SupplierFormData {
    name: string;
    code: string;
    contactPerson: string;
    email: string;
    phone: string;
    city: string;
    address: string;
    paymentTerms: Supplier['paymentTerms'];
    status: 'active' | 'inactive';
    notes: string;
  }

  const initialForm: SupplierFormData = {
    name: '',
    code: '',
    contactPerson: '',
    email: '',
    phone: '',
    city: 'Dire Dawa',
    address: '',
    paymentTerms: 'Net 15',
    status: 'active',
    notes: '',
  };
  const [formData, setFormData] = useState<SupplierFormData>(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchSearch =
        searchTerm === '' ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.code.toLowerCase().includes(searchTerm.toLowerCase());

      const matchTerms = selectedTerms === 'all' || s.paymentTerms === selectedTerms;

      return matchSearch && matchTerms;
    });
  }, [suppliers, searchTerm, selectedTerms]);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData(initialForm);
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name,
      code: sup.code,
      contactPerson: sup.contactPerson,
      email: sup.email,
      phone: sup.phone,
      city: sup.city,
      address: sup.address,
      paymentTerms: sup.paymentTerms,
      status: sup.status,
      notes: sup.notes || '',
    });
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Supplier name is required';
    if (!formData.contactPerson.trim()) errors.contactPerson = 'Contact person is required';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, formData);
    } else {
      addSupplier({
        ...formData,
        code: formData.code || `SUP-${Math.floor(100 + Math.random() * 900)}`,
        activeOrdersCount: 0,
        totalPurchasedETB: 0,
        outstandingBalanceETB: 0,
      });
    }

    setIsAddEditModalOpen(false);
  };

  const handleExportCSV = () => {
    const headers = [
      'Supplier Code',
      'Company Name',
      'Contact Person',
      'Phone',
      'Email',
      'City',
      'Address',
      'Payment Terms',
      'Active POs',
      'Total Purchased (ETB)',
      'Outstanding Balance (ETB)',
      'Status',
    ];

    const rows = filteredSuppliers.map((s) => [
      s.code,
      s.name,
      s.contactPerson,
      s.phone,
      s.email,
      s.city,
      s.address,
      s.paymentTerms,
      s.activeOrdersCount,
      s.totalPurchasedETB,
      s.outstandingBalanceETB,
      s.status,
    ]);

    exportToCSV('nasir_amme_suppliers', headers, rows);
    addToast({
      type: 'info',
      title: 'Suppliers Exported',
      message: `${filteredSuppliers.length} supplier records exported to CSV.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Suppliers Directory
            </h1>
            <Badge variant="accent" size="sm">
              {suppliers.length} Vendors
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Regional and international electronics distributors serving Nasir Amme Electronics.
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
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <div className="p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by vendor, contact, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#D9A441] bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedTerms}
              onChange={(e) => setSelectedTerms(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              <option value="all">All Payment Terms</option>
              <option value="Immediate / Cash">Immediate / Cash</option>
              <option value="Net 15">Net 15</option>
              <option value="Net 30">Net 30</option>
              <option value="Consignment">Consignment</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-600 text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Vendor & Code</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Payment Terms</th>
                <th className="py-3 px-4 text-right">Total Purchased</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.map((sup) => (
                <tr key={sup.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{sup.name}</div>
                    <div className="font-mono text-xs text-slate-400">{sup.code}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800 text-xs">{sup.contactPerson}</div>
                    <div className="text-[11px] text-slate-500">{sup.phone}</div>
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <div className="flex items-center gap-1 font-medium text-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sup.city}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                      {sup.address}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant="neutral" size="sm">
                      {sup.paymentTerms}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-slate-800">
                    {formatETB(sup.totalPurchasedETB)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`font-bold ${
                        sup.outstandingBalanceETB > 0 ? 'text-amber-700' : 'text-slate-500'
                      }`}
                    >
                      {formatETB(sup.outstandingBalanceETB)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <Badge variant={sup.status === 'active' ? 'success' : 'neutral'} size="sm">
                      {sup.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setInspectingSupplier(sup)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                        title="View Supplier Profile"
                        aria-label={`View ${sup.name}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(sup)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                        title="Edit Supplier"
                        aria-label={`Edit ${sup.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    No suppliers match your search filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Supplier Profile Modal */}
      {inspectingSupplier && (
        <Modal
          isOpen={!!inspectingSupplier}
          onClose={() => setInspectingSupplier(null)}
          size="md"
          title={inspectingSupplier.name}
          description={`Vendor Code: ${inspectingSupplier.code} • ${inspectingSupplier.city}`}
          footer={
            <Button variant="primary" size="sm" onClick={() => setInspectingSupplier(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Total Purchases</span>
                <span className="text-sm font-bold text-slate-900">
                  {formatETB(inspectingSupplier.totalPurchasedETB)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Outstanding Balance</span>
                <span className="text-sm font-bold text-amber-700">
                  {formatETB(inspectingSupplier.outstandingBalanceETB)}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Building className="w-4 h-4 text-slate-400" />
                <span>Contact Person: <strong>{inspectingSupplier.contactPerson}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>Phone: <strong>{inspectingSupplier.phone}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>Email: <strong>{inspectingSupplier.email}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>Address: {inspectingSupplier.address}, {inspectingSupplier.city}</span>
              </div>
            </div>

            {inspectingSupplier.notes && (
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-600">
                <span className="font-semibold block text-slate-700 mb-1">Internal Notes:</span>
                {inspectingSupplier.notes}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        size="md"
        title={editingSupplier ? 'Edit Supplier' : 'Register New Supplier'}
        description="Add vendor contact details and default trade payment terms."
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Company / Trading Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Red Sea Electronics"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
            {formErrors.name && (
              <p className="text-xs text-rose-600 mt-1">{formErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Person *
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
              {formErrors.contactPerson && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.contactPerson}</p>
              )}
            </div>

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
                City / Hub
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
              Payment Terms
            </label>
            <select
              value={formData.paymentTerms}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  paymentTerms: e.target.value as Supplier['paymentTerms'],
                })
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              <option value="Immediate / Cash">Immediate / Cash</option>
              <option value="Net 15">Net 15</option>
              <option value="Net 30">Net 30</option>
              <option value="Consignment">Consignment</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Address & Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Warehouse location, cargo routes, delivery terms"
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
              {editingSupplier ? 'Save Supplier' : 'Register Supplier'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
