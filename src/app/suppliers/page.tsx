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
  Upload,
  CheckCircle2,
  Edit2,
  Trash2,
  Eye,
  Building,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { formatETB } from '@/lib/formatters';
import { exportToCSV, exportToJSON } from '@/lib/export';
import RegisterSupplierModal from '@/components/suppliers/RegisterSupplierModal';

export default function SuppliersPage() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, addToast } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTerms, setSelectedTerms] = useState<string>('all');
  const [inspectingSupplier, setInspectingSupplier] = useState<Supplier | null>(null);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Bulk Selection, Delete and Import States
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [parsedSuppliers, setParsedSuppliers] = useState<
    Array<{
      code: string;
      name: string;
      contactPerson: string;
      email: string;
      phone: string;
      city: string;
      address: string;
      paymentTerms: Supplier['paymentTerms'];
      status: 'active' | 'inactive';
      notes: string;
      isValid: boolean;
      error?: string;
    }>
  >([]);

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

  // Selection Helpers
  const isAllSelected =
    filteredSuppliers.length > 0 &&
    filteredSuppliers.every((s) => selectedSupplierIds.has(s.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSupplierIds(new Set());
    } else {
      const next = new Set<string>();
      filteredSuppliers.forEach((s) => next.add(s.id));
      setSelectedSupplierIds(next);
    }
  };

  const handleToggleSelectSupplier = (id: string) => {
    setSelectedSupplierIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExportCSV = () => {
    const targetSuppliers =
      selectedSupplierIds.size > 0
        ? suppliers.filter((s) => selectedSupplierIds.has(s.id))
        : filteredSuppliers;

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

    const rows = targetSuppliers.map((s) => [
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
      message: `${targetSuppliers.length} supplier records exported to CSV.`,
    });
  };

  const handleExportJSON = () => {
    const targetSuppliers =
      selectedSupplierIds.size > 0
        ? suppliers.filter((s) => selectedSupplierIds.has(s.id))
        : filteredSuppliers;

    exportToJSON('nasir_amme_suppliers', targetSuppliers);
    addToast({
      type: 'info',
      title: 'JSON Exported',
      message: `${targetSuppliers.length} supplier records exported to JSON.`,
    });
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedSupplierIds.size === 0) return;
    setIsBulkDeleting(true);
    const ids = Array.from(selectedSupplierIds);
    let count = 0;
    for (const id of ids) {
      try {
        await deleteSupplier(id);
        count++;
      } catch (err) {
        console.error('Error deleting supplier', id, err);
      }
    }
    setSelectedSupplierIds(new Set());
    setIsBulkDeleteModalOpen(false);
    setIsBulkDeleting(false);
    addToast({
      type: 'success',
      title: 'Bulk Deletion Complete',
      message: `${count} supplier(s) removed from database.`,
    });
  };

  const handleLoadSampleCSV = () => {
    const sample = `code,name,contactPerson,email,phone,city,address,paymentTerms,status,notes
SUP-101,Joyroom Middle East FZE,Tariq Al-Mansoor,tariq@joyroom-me.ae,+971501234567,Dubai,Deira Wholesale District,Immediate / Cash,active,Direct Joyroom shipments via Djibouti
SUP-102,Anker Direct Africa,Abebe Kebede,abebe@anker-et.com,+251911223344,Addis Ababa,Bole Subcity,Net 30,active,Authorized Anker distributor
SUP-103,Baseus Horn of Africa,Saron Welde,saron@baseus-horn.et,+251915667788,Dire Dawa,Kezira Commercial Zone,Net 15,active,Screen guards and charging cables`;
    setImportText(sample);
    parseSuppliersInput(sample);
  };

  const parseSuppliersInput = (raw: string) => {
    setImportText(raw);
    const trimmed = raw.trim();
    if (!trimmed) {
      setParsedSuppliers([]);
      return;
    }

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = trimmed.startsWith('{') ? [JSON.parse(trimmed)] : JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const list = parsed.map((item: any, idx: number) => {
            const name = String(item.name || item.companyName || '').trim();
            const code = String(item.code || `SUP-${Date.now().toString().slice(-4)}-${idx + 1}`).trim();
            const contactPerson = String(item.contactPerson || item.contact || '').trim();
            const email = String(item.email || '').trim();
            const phone = String(item.phone || '').trim();
            const city = String(item.city || 'Dire Dawa').trim();
            const address = String(item.address || '').trim();
            const paymentTerms = (item.paymentTerms || 'Net 15') as Supplier['paymentTerms'];
            const status = (item.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive';
            const notes = String(item.notes || '');

            let isValid = true;
            let error = '';
            if (!name) {
              isValid = false;
              error = 'Supplier name required';
            }

            return {
              code,
              name,
              contactPerson,
              email,
              phone,
              city,
              address,
              paymentTerms,
              status,
              notes,
              isValid,
              error,
            };
          });
          setParsedSuppliers(list);
          return;
        }
      } catch {
        // Fallback to CSV
      }
    }

    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      setParsedSuppliers([]);
      return;
    }

    const headerParts = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
    const codeIdx = headerParts.findIndex((h) => h.includes('code'));
    const nameIdx = headerParts.findIndex((h) => h.includes('name'));
    const contactIdx = headerParts.findIndex((h) => h.includes('contact') || h.includes('person'));
    const emailIdx = headerParts.findIndex((h) => h.includes('email'));
    const phoneIdx = headerParts.findIndex((h) => h.includes('phone'));
    const cityIdx = headerParts.findIndex((h) => h.includes('city'));
    const addrIdx = headerParts.findIndex((h) => h.includes('address'));
    const termsIdx = headerParts.findIndex((h) => h.includes('term'));
    const statusIdx = headerParts.findIndex((h) => h.includes('status'));
    const notesIdx = headerParts.findIndex((h) => h.includes('note'));

    const list = lines.slice(1).map((line, idx) => {
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

      const name = nameIdx !== -1 ? parts[nameIdx] || '' : parts[1] || parts[0] || '';
      const code = (codeIdx !== -1 ? parts[codeIdx] : parts[0]) || `SUP-${Date.now().toString().slice(-4)}-${idx + 1}`;
      const contactPerson = (contactIdx !== -1 ? parts[contactIdx] : parts[2]) || '';
      const email = (emailIdx !== -1 ? parts[emailIdx] : parts[3]) || '';
      const phone = (phoneIdx !== -1 ? parts[phoneIdx] : parts[4]) || '';
      const city = (cityIdx !== -1 ? parts[cityIdx] : parts[5]) || 'Dire Dawa';
      const address = (addrIdx !== -1 ? parts[addrIdx] : parts[6]) || '';
      const paymentTerms = ((termsIdx !== -1 ? parts[termsIdx] : parts[7]) || 'Net 15') as Supplier['paymentTerms'];
      const status = ((statusIdx !== -1 ? parts[statusIdx] : parts[8]) === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive';
      const notes = (notesIdx !== -1 ? parts[notesIdx] : parts[9]) || '';

      let isValid = true;
      let error = '';
      if (!name) {
        isValid = false;
        error = 'Supplier name required';
      }

      return {
        code,
        name,
        contactPerson,
        email,
        phone,
        city,
        address,
        paymentTerms,
        status,
        notes,
        isValid,
        error,
      };
    });

    setParsedSuppliers(list);
  };

  const handleCommitImport = async () => {
    const valid = parsedSuppliers.filter((s) => s.isValid);
    if (valid.length === 0) return;
    setIsImporting(true);
    let count = 0;
    for (const item of valid) {
      try {
        await addSupplier({
          code: item.code,
          name: item.name,
          contactPerson: item.contactPerson,
          email: item.email,
          phone: item.phone,
          city: item.city,
          address: item.address,
          paymentTerms: item.paymentTerms,
          activeOrdersCount: 0,
          totalPurchasedETB: 0,
          outstandingBalanceETB: 0,
          status: item.status,
          notes: item.notes,
        });
        count++;
      } catch (err) {
        console.error('Import supplier failed', err);
      }
    }
    setIsImporting(false);
    setIsImportModalOpen(false);
    setImportText('');
    setParsedSuppliers([]);
    addToast({
      type: 'success',
      title: 'Import Complete',
      message: `Successfully imported ${count} vendor(s) into database.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Suppliers Directory
            </h1>
            <Badge variant="accent" size="sm">
              {suppliers.length} Vendors
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage supplier partnerships and vendor contacts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-4 h-4" />}
          >
            {selectedSupplierIds.size > 0 ? `CSV (${selectedSupplierIds.size})` : 'Export CSV'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            leftIcon={<Download className="w-4 h-4" />}
          >
            {selectedSupplierIds.size > 0 ? `JSON (${selectedSupplierIds.size})` : 'Export JSON'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setImportText('');
              setParsedSuppliers([]);
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
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D9A441] bg-slate-50/50 dark:bg-slate-900/60"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedTerms}
              onChange={(e) => setSelectedTerms(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              <option className="dark:bg-slate-900" value="all">All Payment Terms</option>
              <option className="dark:bg-slate-900" value="Immediate / Cash">Immediate / Cash</option>
              <option className="dark:bg-slate-900" value="Net 15">Net 15</option>
              <option className="dark:bg-slate-900" value="Net 30">Net 30</option>
              <option className="dark:bg-slate-900" value="Consignment">Consignment</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Floating Bulk Action Bar */}
      {selectedSupplierIds.size > 0 && (
        <div className="p-3 bg-gradient-to-r from-amber-500/15 via-slate-100 dark:via-slate-900 to-amber-500/15 border border-amber-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-bold font-mono text-xs flex items-center justify-center">
              {selectedSupplierIds.size}
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Vendors selected
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
              Export CSV ({selectedSupplierIds.size})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export JSON ({selectedSupplierIds.size})
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete Selected ({selectedSupplierIds.size})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSupplierIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Suppliers Table */}
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSuppliers.map((sup) => (
                <tr
                  key={sup.id}
                  className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                    selectedSupplierIds.has(sup.id) ? 'bg-amber-500/10 dark:bg-amber-500/10' : ''
                  }`}
                >
                  <td className="py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedSupplierIds.has(sup.id)}
                      onChange={() => handleToggleSelectSupplier(sup.id)}
                      className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-amber-500 focus:ring-0 cursor-pointer accent-amber-500"
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white">{sup.name}</div>
                    <div className="font-mono text-xs text-slate-400 dark:text-slate-500">{sup.code}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">{sup.contactPerson}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{sup.phone}</div>
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <div className="flex items-center gap-1 font-medium text-slate-800 dark:text-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sup.city}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[150px]">
                      {sup.address}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant="neutral" size="sm">
                      {sup.paymentTerms}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-slate-800 dark:text-slate-200">
                    {formatETB(sup.totalPurchasedETB)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`font-bold ${
                        sup.outstandingBalanceETB > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
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
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                        title="View Supplier Profile"
                        aria-label={`View ${sup.name}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(sup)}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md"
                        title="Edit Supplier"
                        aria-label={`Edit ${sup.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSupplierToDelete(sup)}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md"
                        title="Delete Supplier"
                        aria-label={`Delete ${sup.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
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
            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block font-semibold">Total Purchases</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatETB(inspectingSupplier.totalPurchasedETB)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 block font-semibold">Outstanding Balance</span>
                <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                  {formatETB(inspectingSupplier.outstandingBalanceETB)}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Building className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span>Contact Person: <strong>{inspectingSupplier.contactPerson}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span>Phone: <strong>{inspectingSupplier.phone}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span>Email: <strong>{inspectingSupplier.email}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <span>Address: {inspectingSupplier.address}, {inspectingSupplier.city}</span>
              </div>
            </div>

            {inspectingSupplier.notes && (
              <div className="p-3 bg-white dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold block text-slate-700 dark:text-slate-200 mb-1">Internal Notes:</span>
                {inspectingSupplier.notes}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Register Supplier Modal */}
      <RegisterSupplierModal
        isOpen={isAddEditModalOpen && !editingSupplier}
        onClose={() => setIsAddEditModalOpen(false)}
      />

      {/* Edit Supplier Modal */}
      <Modal
        isOpen={isAddEditModalOpen && !!editingSupplier}
        onClose={() => setIsAddEditModalOpen(false)}
        size="md"
        title="Edit Supplier"
        description="Update vendor contact details and default trade payment terms."
      >
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Company / Trading Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Red Sea Electronics"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
            {formErrors.name && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{formErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Contact Person *
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
              {formErrors.contactPerson && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{formErrors.contactPerson}</p>
              )}
            </div>

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
                City / Hub
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
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              <option className="dark:bg-slate-900" value="Immediate / Cash">Immediate / Cash</option>
              <option className="dark:bg-slate-900" value="Net 15">Net 15</option>
              <option className="dark:bg-slate-900" value="Net 30">Net 30</option>
              <option className="dark:bg-slate-900" value="Consignment">Consignment</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Address & Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Warehouse location, cargo routes, delivery terms"
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
              {editingSupplier ? 'Save Supplier' : 'Register Supplier'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Supplier Confirmation Modal */}
      {supplierToDelete && (
        <Modal
          isOpen={!!supplierToDelete}
          onClose={() => setSupplierToDelete(null)}
          size="sm"
          title={`Delete Supplier: ${supplierToDelete.name}`}
          description="Remove supplier permanently from PostgreSQL database."
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSupplierToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  const s = supplierToDelete;
                  setSupplierToDelete(null);
                  await deleteSupplier(s.id);
                }}
              >
                Delete from Database
              </Button>
            </div>
          }
        >
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Are you sure you want to remove <strong>{supplierToDelete.name}</strong> from the database?
            If no purchase orders are linked, this supplier will be completely deleted.
          </p>
        </Modal>
      )}

      {/* Bulk Delete Suppliers Modal */}
      {isBulkDeleteModalOpen && (
        <Modal
          isOpen={isBulkDeleteModalOpen}
          onClose={() => setIsBulkDeleteModalOpen(false)}
          size="sm"
          title={`Bulk Delete ${selectedSupplierIds.size} Suppliers`}
          description="Remove selected suppliers from PostgreSQL database."
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
                Delete {selectedSupplierIds.size} Suppliers
              </Button>
            </div>
          }
        >
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Are you sure you want to remove <strong>{selectedSupplierIds.size}</strong> selected suppliers? Any historical purchase orders and financial logs will remain preserved.
          </p>
        </Modal>
      )}

      {/* Bulk Supplier Import Wizard Modal */}
      {isImportModalOpen && (
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          size="lg"
          title="Bulk Supplier Import Wizard"
          description="Import vendors and suppliers via CSV or JSON format with automatic phone and payment terms validation."
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 rounded-xl text-xs text-amber-900 dark:text-amber-200">
              <span>
                Required: <strong>name</strong>. Optional: <strong>code, contactPerson, email, phone, city, address, paymentTerms, status, notes</strong>.
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
                onChange={(e) => parseSuppliersInput(e.target.value)}
                placeholder="Paste CSV with header row or JSON array..."
                className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>

            {parsedSuppliers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Validation Staging Preview ({parsedSuppliers.length} vendors parsed)
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Valid: <strong className="text-emerald-600 dark:text-emerald-400">{parsedSuppliers.filter((s) => s.isValid).length}</strong> • 
                    Invalid: <strong className="text-rose-600 dark:text-rose-400">{parsedSuppliers.filter((s) => !s.isValid).length}</strong>
                  </span>
                </div>

                <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2 px-3">Vendor Name</th>
                        <th className="py-2 px-3">Code</th>
                        <th className="py-2 px-3">Contact</th>
                        <th className="py-2 px-3">Payment Terms</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                      {parsedSuppliers.map((s, idx) => (
                        <tr key={idx} className={s.isValid ? 'text-slate-700 dark:text-slate-300' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300'}>
                          <td className="py-2 px-3 font-semibold">{s.name || '—'}</td>
                          <td className="py-2 px-3 font-mono text-[11px]">{s.code}</td>
                          <td className="py-2 px-3">{s.contactPerson || s.phone || '—'}</td>
                          <td className="py-2 px-3">{s.paymentTerms}</td>
                          <td className="py-2 px-3">
                            {s.isValid ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                                <CheckCircle2 className="w-3 h-3" /> Ready
                              </span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400 font-mono text-[10px]">{s.error}</span>
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
                disabled={isImporting || parsedSuppliers.filter((s) => s.isValid).length === 0}
                isLoading={isImporting}
                onClick={handleCommitImport}
              >
                Commit Import ({parsedSuppliers.filter((s) => s.isValid).length} Valid Vendors)
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
