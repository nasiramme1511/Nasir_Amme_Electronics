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
  Upload,
  CheckCircle2,
  Edit2,
  Trash2,
  Eye,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { formatETB } from '@/lib/formatters';
import { exportToCSV, exportToJSON } from '@/lib/export';
import RegisterCustomerModal from '@/components/customers/RegisterCustomerModal';

export default function CustomersPage() {
  const { customers, addCustomer, updateCustomer, deleteCustomer, addToast } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [inspectingCustomer, setInspectingCustomer] = useState<Customer | null>(null);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Bulk Selection, Delete and Import States
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [parsedCustomers, setParsedCustomers] = useState<
    Array<{
      name: string;
      phone: string;
      email: string;
      customerType: 'retail' | 'wholesale';
      city: string;
      address: string;
      creditBalanceETB: number;
      notes: string;
      isValid: boolean;
      error?: string;
    }>
  >([]);

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

  // Selection Helpers
  const isAllSelected =
    filteredCustomers.length > 0 &&
    filteredCustomers.every((c) => selectedCustomerIds.has(c.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedCustomerIds(new Set());
    } else {
      const next = new Set<string>();
      filteredCustomers.forEach((c) => next.add(c.id));
      setSelectedCustomerIds(next);
    }
  };

  const handleToggleSelectCustomer = (id: string) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExportCSV = () => {
    const targetCustomers =
      selectedCustomerIds.size > 0
        ? customers.filter((c) => selectedCustomerIds.has(c.id))
        : filteredCustomers;

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

    const rows = targetCustomers.map((c) => [
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
      message: `${targetCustomers.length} customer records exported to CSV.`,
    });
  };

  const handleExportJSON = () => {
    const targetCustomers =
      selectedCustomerIds.size > 0
        ? customers.filter((c) => selectedCustomerIds.has(c.id))
        : filteredCustomers;

    exportToJSON('nasir_amme_customers', targetCustomers);
    addToast({
      type: 'info',
      title: 'JSON Exported',
      message: `${targetCustomers.length} customer records exported to JSON.`,
    });
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedCustomerIds.size === 0) return;
    setIsBulkDeleting(true);
    const ids = Array.from(selectedCustomerIds);
    let count = 0;
    for (const id of ids) {
      try {
        await deleteCustomer(id);
        count++;
      } catch (err) {
        console.error('Error deleting customer', id, err);
      }
    }
    setSelectedCustomerIds(new Set());
    setIsBulkDeleteModalOpen(false);
    setIsBulkDeleting(false);
    addToast({
      type: 'success',
      title: 'Bulk Deletion Complete',
      message: `${count} customer(s) removed from database.`,
    });
  };

  const handleLoadSampleCSV = () => {
    const sample = `name,phone,email,customerType,city,address,creditBalanceETB,notes
Elias Worku,+251915123456,elias.worku@gmail.com,retail,Dire Dawa,Megala Market Area,0,Regular smartphone accessories buyer
Dire Dawa Tech Hub,+251915987654,procure@ddtechhub.et,wholesale,Dire Dawa,Kezira Commercial Road,2500,Bulk order credit line
Al-Nur Mobile Repair,+251911445566,alnur.repair@yahoo.com,wholesale,Harar,Main Harar Bazaar,0,Purchases Joyroom screens and cables`;
    setImportText(sample);
    parseCustomersInput(sample);
  };

  const parseCustomersInput = (raw: string) => {
    setImportText(raw);
    const trimmed = raw.trim();
    if (!trimmed) {
      setParsedCustomers([]);
      return;
    }

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = trimmed.startsWith('{') ? [JSON.parse(trimmed)] : JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const list = parsed.map((item: any) => {
            const name = String(item.name || item.displayName || '').trim();
            const phone = String(item.phone || '').trim();
            const email = String(item.email || '').trim();
            const customerType = (item.customerType === 'wholesale' ? 'wholesale' : 'retail') as 'retail' | 'wholesale';
            const city = String(item.city || 'Dire Dawa').trim();
            const address = String(item.address || '').trim();
            const creditBalanceETB = Number(item.creditBalanceETB || item.creditBalance || 0);
            const notes = String(item.notes || '');

            let isValid = true;
            let error = '';
            if (!name) {
              isValid = false;
              error = 'Customer name required';
            } else if (!phone) {
              isValid = false;
              error = 'Phone number required';
            }

            return {
              name,
              phone,
              email,
              customerType,
              city,
              address,
              creditBalanceETB,
              notes,
              isValid,
              error,
            };
          });
          setParsedCustomers(list);
          return;
        }
      } catch {
        // Fallback to CSV
      }
    }

    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      setParsedCustomers([]);
      return;
    }

    const headerParts = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
    const nameIdx = headerParts.findIndex((h) => h.includes('name'));
    const phoneIdx = headerParts.findIndex((h) => h.includes('phone') || h.includes('tel') || h.includes('mobile'));
    const emailIdx = headerParts.findIndex((h) => h.includes('email'));
    const typeIdx = headerParts.findIndex((h) => h.includes('type'));
    const cityIdx = headerParts.findIndex((h) => h.includes('city'));
    const addrIdx = headerParts.findIndex((h) => h.includes('addr'));
    const creditIdx = headerParts.findIndex((h) => h.includes('credit') || h.includes('balance'));
    const notesIdx = headerParts.findIndex((h) => h.includes('note'));

    const list = lines.slice(1).map((line) => {
      const parts: string[] = [];
      let current = '';
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuote = !inQuote;
        else if (char === ',' && !inQuote) {
          parts.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      parts.push(current.trim().replace(/^["']|["']$/g, ''));

      const name = nameIdx !== -1 ? parts[nameIdx] || '' : parts[0] || '';
      const phone = (phoneIdx !== -1 ? parts[phoneIdx] : parts[1]) || '';
      const email = (emailIdx !== -1 ? parts[emailIdx] : parts[2]) || '';
      const customerType = ((typeIdx !== -1 ? parts[typeIdx] : parts[3])?.toLowerCase().includes('whole') ? 'wholesale' : 'retail') as 'retail' | 'wholesale';
      const city = (cityIdx !== -1 ? parts[cityIdx] : parts[4]) || 'Dire Dawa';
      const address = (addrIdx !== -1 ? parts[addrIdx] : parts[5]) || '';
      const creditBalanceETB = Number((creditIdx !== -1 ? parts[creditIdx] : parts[6]) || 0);
      const notes = (notesIdx !== -1 ? parts[notesIdx] : parts[7]) || '';

      let isValid = true;
      let error = '';
      if (!name) {
        isValid = false;
        error = 'Customer name required';
      } else if (!phone) {
        isValid = false;
        error = 'Phone number required';
      }

      return {
        name,
        phone,
        email,
        customerType,
        city,
        address,
        creditBalanceETB,
        notes,
        isValid,
        error,
      };
    });

    setParsedCustomers(list);
  };

  const handleCommitImport = async () => {
    const valid = parsedCustomers.filter((c) => c.isValid);
    if (valid.length === 0) return;
    setIsImporting(true);
    let count = 0;
    for (const item of valid) {
      try {
        await addCustomer({
          name: item.name,
          phone: item.phone,
          email: item.email || undefined,
          customerType: item.customerType,
          city: item.city,
          address: item.address,
          creditBalanceETB: item.creditBalanceETB,
          totalSpentETB: 0,
          loyaltyPoints: 0,
          notes: item.notes,
        });
        count++;
      } catch (err) {
        console.error('Import customer failed', err);
      }
    }
    setIsImporting(false);
    setIsImportModalOpen(false);
    setImportText('');
    setParsedCustomers([]);
    addToast({
      type: 'success',
      title: 'Import Complete',
      message: `Successfully registered ${count} customer(s) in database.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Customers & Accounts
            </h1>
            <Badge variant="accent" size="sm">
              {customers.length} Profiles
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage customer profiles and account balances.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-4 h-4" />}
          >
            {selectedCustomerIds.size > 0 ? `CSV (${selectedCustomerIds.size})` : 'Export CSV'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            leftIcon={<Download className="w-4 h-4" />}
          >
            {selectedCustomerIds.size > 0 ? `JSON (${selectedCustomerIds.size})` : 'Export JSON'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setImportText('');
              setParsedCustomers([]);
              setIsImportModalOpen(true);
            }}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Import
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
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D9A441] bg-slate-50/50 dark:bg-slate-900/60"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              <option className="dark:bg-slate-900" value="all">All Customer Types</option>
              <option className="dark:bg-slate-900" value="retail">Retail Consumers</option>
              <option className="dark:bg-slate-900" value="wholesale">Wholesale / Workshops</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Floating Bulk Action Bar */}
      {selectedCustomerIds.size > 0 && (
        <div className="p-3 bg-gradient-to-r from-amber-500/15 via-slate-100 dark:via-slate-900 to-amber-500/15 border border-amber-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-bold font-mono text-xs flex items-center justify-center">
              {selectedCustomerIds.size}
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Customers selected
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              (Multi-record batch operations)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export CSV ({selectedCustomerIds.size})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export JSON ({selectedCustomerIds.size})
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete Selected ({selectedCustomerIds.size})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCustomerIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-amber-500 focus:ring-0 cursor-pointer accent-amber-500"
                  />
                </th>
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.map((cust) => (
                <tr
                  key={cust.id}
                  className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                    selectedCustomerIds.has(cust.id) ? 'bg-amber-500/10 dark:bg-amber-500/10' : ''
                  }`}
                >
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedCustomerIds.has(cust.id)}
                      onChange={() => handleToggleSelectCustomer(cust.id)}
                      className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-amber-500 focus:ring-0 cursor-pointer accent-amber-500"
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white">{cust.name}</div>
                    {cust.notes && (
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 max-w-xs">
                        {cust.notes}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <div className="font-medium text-slate-800 dark:text-slate-200">{cust.phone}</div>
                    {cust.email && <div className="text-[11px] text-slate-400 dark:text-slate-500">{cust.email}</div>}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant={cust.customerType === 'wholesale' ? 'accent' : 'neutral'} size="sm">
                      {cust.customerType.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-200">
                    {cust.city}
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-slate-900 dark:text-white">
                    {formatETB(cust.totalSpentETB)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`font-bold ${
                        cust.creditBalanceETB > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
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
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                        title="View Profile"
                        aria-label={`View ${cust.name}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(cust)}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md"
                        title="Edit Customer"
                        aria-label={`Edit ${cust.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCustomerToDelete(cust)}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md"
                        title="Delete Customer"
                        aria-label={`Delete ${cust.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
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
            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block font-semibold">Total Lifetime Purchases</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatETB(inspectingCustomer.totalSpentETB)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block font-semibold">Outstanding Store Credit</span>
                <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                  {formatETB(inspectingCustomer.creditBalanceETB)}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span>Phone: <strong>{inspectingCustomer.phone}</strong></span>
              </div>
              {inspectingCustomer.email && (
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span>Email: <strong>{inspectingCustomer.email}</strong></span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span>Location: {inspectingCustomer.address || 'Over the counter'}, {inspectingCustomer.city}</span>
              </div>
              <div className="flex items-center gap-2 text-[#16845B] font-semibold pt-1">
                <Award className="w-4 h-4" />
                <span>Loyalty Club: {inspectingCustomer.loyaltyPoints} points earned</span>
              </div>
            </div>

            {inspectingCustomer.notes && (
              <div className="p-3 bg-white dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold block text-slate-700 dark:text-slate-200 mb-1">Customer Preferences:</span>
                {inspectingCustomer.notes}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Register Customer Ledger Modal */}
      <RegisterCustomerModal
        isOpen={isAddEditModalOpen && !editingCustomer}
        onClose={() => setIsAddEditModalOpen(false)}
      />

      {/* Edit Customer Modal */}
      <Modal
        isOpen={isAddEditModalOpen && !!editingCustomer}
        onClose={() => setIsAddEditModalOpen(false)}
        size="md"
        title="Edit Customer"
        description="Update customer record details or store contact information."
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Customer / Business Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Gende Kore Phone Repairs"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
            {formErrors.name && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{formErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+251 9..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
              {formErrors.phone && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{formErrors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
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
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              >
                <option className="dark:bg-slate-900" value="retail">Retail Consumer</option>
                <option className="dark:bg-slate-900" value="wholesale">Wholesale Buyer / Workshop</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Address / Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Near Kebele 02, Buys in bulk on weekends"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
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

      {/* Delete Customer Confirmation Modal */}
      {customerToDelete && (
        <Modal
          isOpen={!!customerToDelete}
          onClose={() => setCustomerToDelete(null)}
          size="sm"
          title={`Delete Customer: ${customerToDelete.name}`}
          description="Remove customer permanently from PostgreSQL database."
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setCustomerToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  const c = customerToDelete;
                  setCustomerToDelete(null);
                  await deleteCustomer(c.id);
                }}
              >
                Delete from Database
              </Button>
            </div>
          }
        >
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Are you sure you want to remove <strong>{customerToDelete.name}</strong> from the database?
            Historical sales receipts linked to this customer will be safely preserved.
          </p>
        </Modal>
      )}

      {/* Bulk Delete Customers Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <Modal
          isOpen={isBulkDeleteModalOpen}
          onClose={() => setIsBulkDeleteModalOpen(false)}
          size="sm"
          title={`Bulk Delete: ${selectedCustomerIds.size} Customers`}
          description="Remove selected customers from PostgreSQL database. Audit logs and receipts will remain intact."
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isBulkDeleting}
                onClick={() => setIsBulkDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={isBulkDeleting}
                isLoading={isBulkDeleting}
                onClick={handleConfirmBulkDelete}
              >
                Delete {selectedCustomerIds.size} Customers
              </Button>
            </div>
          }
        >
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Are you sure you want to remove <strong>{selectedCustomerIds.size}</strong> selected customers? Any historical sales transactions and receipts linked to these customers will remain preserved in the ledger.
          </p>
        </Modal>
      )}

      {/* Bulk Customer Import Wizard Modal */}
      {isImportModalOpen && (
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          size="lg"
          title="Bulk Customer Import Wizard"
          description="Import retail and wholesale customers via CSV or JSON format with automatic phone number and type validation."
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 rounded-xl text-xs text-amber-900 dark:text-amber-200">
              <span>
                Required: <strong>name, phone</strong>. Optional: <strong>email, customerType (retail/wholesale), city, address, creditBalanceETB, notes</strong>.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadSampleCSV}
                className="shrink-0"
              >
                Load Sample Template
              </Button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Paste Raw CSV or JSON Data
              </label>
              <textarea
                rows={5}
                value={importText}
                onChange={(e) => parseCustomersInput(e.target.value)}
                placeholder="Paste CSV with header row or JSON array..."
                className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>

            {parsedCustomers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Validation Staging Preview ({parsedCustomers.length} parsed)
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Valid: <strong className="text-emerald-600 dark:text-emerald-400">{parsedCustomers.filter((c) => c.isValid).length}</strong> • 
                    Invalid: <strong className="text-rose-600 dark:text-rose-400">{parsedCustomers.filter((c) => !c.isValid).length}</strong>
                  </span>
                </div>

                <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2 px-3">Customer Name</th>
                        <th className="py-2 px-3">Phone</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">City</th>
                        <th className="py-2 px-3">Credit (ETB)</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                      {parsedCustomers.map((c, idx) => (
                        <tr key={idx} className={c.isValid ? 'text-slate-700 dark:text-slate-300' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300'}>
                          <td className="py-2 px-3 font-semibold">{c.name || '—'}</td>
                          <td className="py-2 px-3 font-mono text-[11px]">{c.phone || '—'}</td>
                          <td className="py-2 px-3 uppercase text-[10px] font-bold">{c.customerType}</td>
                          <td className="py-2 px-3">{c.city}</td>
                          <td className="py-2 px-3">{c.creditBalanceETB}</td>
                          <td className="py-2 px-3">
                            {c.isValid ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                                <CheckCircle2 className="w-3 h-3" /> Ready
                              </span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400 font-mono text-[10px]">{c.error}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                disabled={isImporting}
                onClick={() => setIsImportModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                disabled={isImporting || parsedCustomers.filter((c) => c.isValid).length === 0}
                isLoading={isImporting}
                onClick={handleCommitImport}
              >
                Commit Import ({parsedCustomers.filter((c) => c.isValid).length} Valid Customers)
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
