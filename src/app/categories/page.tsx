'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Category } from '@/types';
import {
  Plus,
  Search,
  Zap,
  Cable,
  Headphones,
  BatteryCharging,
  Volume2,
  Shield,
  Edit2,
  Trash2,
  ArrowRight,
  Download,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { formatETB } from '@/lib/formatters';
import { exportToCSV, exportToJSON } from '@/lib/export';

export default function CategoriesPage() {
  const { categories, products, addCategory, updateCategory, deleteCategory, addToast } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Bulk Selection, Delete and Import States
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [parsedCategories, setParsedCategories] = useState<
    Array<{
      name: string;
      slug: string;
      iconName: string;
      description: string;
      isActive: boolean;
      isValid: boolean;
      error?: string;
    }>
  >([]);

  // Form State
  const initialForm = {
    name: '',
    slug: '',
    description: '',
    iconName: 'Zap',
    isActive: true,
  };
  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Icon mapping
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap':
        return <Zap className="w-5 h-5 text-amber-500" />;
      case 'Cable':
        return <Cable className="w-5 h-5 text-blue-500" />;
      case 'Headphones':
        return <Headphones className="w-5 h-5 text-emerald-500" />;
      case 'BatteryCharging':
        return <BatteryCharging className="w-5 h-5 text-indigo-500" />;
      case 'Volume2':
        return <Volume2 className="w-5 h-5 text-rose-500" />;
      case 'Shield':
      default:
        return <Shield className="w-5 h-5 text-[#D9A441]" />;
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  // Selection Helpers
  const isAllSelected =
    filteredCategories.length > 0 &&
    filteredCategories.every((c) => selectedCategoryIds.has(c.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedCategoryIds(new Set());
    } else {
      const next = new Set<string>();
      filteredCategories.forEach((c) => next.add(c.id));
      setSelectedCategoryIds(next);
    }
  };

  const handleToggleSelectCategory = (id: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Export Handlers
  const handleExportCSV = () => {
    const target =
      selectedCategoryIds.size > 0
        ? categories.filter((c) => selectedCategoryIds.has(c.id))
        : filteredCategories;

    const headers = [
      'Category Name',
      'Slug',
      'Icon',
      'Description',
      'Active Status',
      'Products Count',
      'Inventory Value (ETB)',
    ];

    const rows = target.map((c) => {
      const matched = products.filter((p) => p.category === c.name);
      const totalVal = matched.reduce((sum, p) => sum + p.costPrice * p.stockQuantity, 0);
      return [
        c.name,
        c.slug,
        c.iconName,
        c.description,
        c.isActive ? 'Active' : 'Inactive',
        matched.length,
        totalVal,
      ];
    });

    exportToCSV('nasir_amme_categories', headers, rows);
    addToast({
      type: 'info',
      title: 'Categories Exported',
      message: `${target.length} category group(s) exported to CSV.`,
    });
  };

  const handleExportJSON = () => {
    const target =
      selectedCategoryIds.size > 0
        ? categories.filter((c) => selectedCategoryIds.has(c.id))
        : filteredCategories;

    exportToJSON('nasir_amme_categories', target);
    addToast({
      type: 'info',
      title: 'JSON Exported',
      message: `${target.length} category group(s) exported to JSON.`,
    });
  };

  // Bulk Delete
  const handleConfirmBulkDelete = async () => {
    if (selectedCategoryIds.size === 0) return;
    setIsBulkDeleting(true);
    const ids = Array.from(selectedCategoryIds);
    let count = 0;
    for (const id of ids) {
      try {
        await deleteCategory(id);
        count++;
      } catch (err) {
        console.error('Error deleting category', id, err);
      }
    }
    setSelectedCategoryIds(new Set());
    setIsBulkDeleteModalOpen(false);
    setIsBulkDeleting(false);
    addToast({
      type: 'success',
      title: 'Bulk Deletion Complete',
      message: `${count} category group(s) removed from database.`,
    });
  };

  // Sample CSV
  const handleLoadSampleCSV = () => {
    const sample = `name,slug,iconName,description,isActive
Wireless Earbuds,wireless-earbuds,Headphones,High fidelity TWS wireless earbuds and bluetooth headsets,true
Fast Chargers,fast-chargers,Zap,PD and QuickCharge wall chargers and bricks,true
Braided Cables,braided-cables,Cable,Durable nylon braided Type-C and Lightning cables,true
Power Banks,power-banks,BatteryCharging,Heavy duty external battery packs 10000-30000mAh,true
Protective Cases,protective-cases,Shield,Shockproof phone covers and tempered glass,true`;
    setImportText(sample);
    parseCategoriesInput(sample);
  };

  // Parse CSV / JSON
  const parseCategoriesInput = (raw: string) => {
    setImportText(raw);
    const trimmed = raw.trim();
    if (!trimmed) {
      setParsedCategories([]);
      return;
    }

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = trimmed.startsWith('{') ? [JSON.parse(trimmed)] : JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const list = parsed.map((item: any) => {
            const name = String(item.name || item.title || '').trim();
            const slug = String(item.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
            const iconName = String(item.iconName || item.icon || 'Zap').trim();
            const description = String(item.description || item.desc || '').trim();
            const isActive = item.isActive !== undefined ? Boolean(item.isActive) : true;

            let isValid = true;
            let error = '';
            if (!name) {
              isValid = false;
              error = 'Category name required';
            } else if (!slug) {
              isValid = false;
              error = 'Slug required';
            }

            return {
              name,
              slug,
              iconName,
              description,
              isActive,
              isValid,
              error,
            };
          });
          setParsedCategories(list);
          return;
        }
      } catch {
        // Fallback to CSV parsing
      }
    }

    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      setParsedCategories([]);
      return;
    }

    const headerParts = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
    const nameIdx = headerParts.findIndex((h) => h.includes('name') || h.includes('title'));
    const slugIdx = headerParts.findIndex((h) => h.includes('slug') || h.includes('code'));
    const iconIdx = headerParts.findIndex((h) => h.includes('icon'));
    const descIdx = headerParts.findIndex((h) => h.includes('desc'));
    const activeIdx = headerParts.findIndex((h) => h.includes('active') || h.includes('status'));

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

      const name = (nameIdx !== -1 ? parts[nameIdx] : parts[0]) || '';
      let slug = (slugIdx !== -1 ? parts[slugIdx] : parts[1]) || '';
      if (!slug && name) {
        slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      }
      const iconName = (iconIdx !== -1 ? parts[iconIdx] : parts[2]) || 'Zap';
      const description = (descIdx !== -1 ? parts[descIdx] : parts[3]) || '';
      const rawActive = (activeIdx !== -1 ? parts[activeIdx] : parts[4]) || 'true';
      const isActive = rawActive.toLowerCase() !== 'false' && rawActive.toLowerCase() !== '0';

      let isValid = true;
      let error = '';
      if (!name) {
        isValid = false;
        error = 'Category name required';
      } else if (!slug) {
        isValid = false;
        error = 'Slug required';
      }

      return {
        name,
        slug,
        iconName,
        description,
        isActive,
        isValid,
        error,
      };
    });

    setParsedCategories(list);
  };

  // Commit Import
  const handleCommitImport = async () => {
    const valid = parsedCategories.filter((c) => c.isValid);
    if (valid.length === 0) return;
    setIsImporting(true);
    let count = 0;
    for (const item of valid) {
      try {
        await addCategory({
          name: item.name,
          slug: item.slug,
          iconName: item.iconName,
          description: item.description,
          isActive: item.isActive,
          productCount: 0,
          totalValueETB: 0,
        });
        count++;
      } catch (err) {
        console.error('Import category failed', err);
      }
    }
    setIsImporting(false);
    setIsImportModalOpen(false);
    setImportText('');
    setParsedCategories([]);
    addToast({
      type: 'success',
      title: 'Categories Imported',
      message: `Successfully registered ${count} category group(s) in catalog.`,
    });
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormData(initialForm);
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description,
      iconName: category.iconName,
      isActive: category.isActive,
    });
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  // Handle Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Category name is required';
    if (!formData.slug.trim()) errors.slug = 'Slug is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingCategory) {
      updateCategory(editingCategory.id, formData);
    } else {
      addCategory({
        ...formData,
        productCount: 0,
        totalValueETB: 0,
      });
    }

    setIsAddEditModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Product Categories
            </h1>
            <Badge variant="accent" size="sm">
              {categories.length} Groups
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organize products into store categories, brand groups, and POS navigation menus.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-4 h-4" />}
          >
            {selectedCategoryIds.size > 0 ? `CSV (${selectedCategoryIds.size})` : 'Export CSV'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            leftIcon={<Download className="w-4 h-4" />}
          >
            {selectedCategoryIds.size > 0 ? `JSON (${selectedCategoryIds.size})` : 'Export JSON'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setImportText('');
              setParsedCategories([]);
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
            Add Category
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <Card>
        <div className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search category titles or descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D9A441] bg-slate-50/50 dark:bg-slate-900/60 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-amber-500 focus:ring-0 cursor-pointer accent-amber-500"
              />
              <span>Select All ({filteredCategories.length})</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Floating Bulk Action Bar */}
      {selectedCategoryIds.size > 0 && (
        <div className="p-3 bg-gradient-to-r from-amber-500/15 via-slate-100 dark:via-slate-900 to-amber-500/15 border border-amber-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-bold font-mono text-xs flex items-center justify-center">
              {selectedCategoryIds.size}
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Categories selected
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
              Export CSV ({selectedCategoryIds.size})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export JSON ({selectedCategoryIds.size})
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete Selected ({selectedCategoryIds.size})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCategoryIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCategories.map((category) => {
          // Live count of matching products
          const matchedProducts = products.filter((p) => p.category === category.name);
          const totalVal = matchedProducts.reduce(
            (sum, p) => sum + p.costPrice * p.stockQuantity,
            0
          );
          const isSelected = selectedCategoryIds.has(category.id);

          return (
            <Card
              key={category.id}
              className={`hover:shadow-md transition-all flex flex-col justify-between ${
                isSelected ? 'ring-2 ring-amber-500/70 bg-amber-500/5 dark:bg-amber-500/5' : ''
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectCategory(category.id)}
                      className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-amber-500 focus:ring-0 cursor-pointer accent-amber-500"
                    />
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                      {renderIcon(category.iconName)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={category.isActive ? 'success' : 'neutral'} size="sm">
                      {category.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <button
                      onClick={() => handleOpenEdit(category)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Edit Category"
                      aria-label={`Edit ${category.name}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCategoryToDelete(category)}
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Delete Category"
                      aria-label={`Delete ${category.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-4">
                  {category.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 min-h-[32px]">
                  {category.description || 'No description provided.'}
                </p>

                {/* Metrics */}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 text-[11px] block">Products</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {matchedProducts.length} items
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 text-[11px] block">Inventory Value</span>
                    <span className="font-bold text-[#16845B] dark:text-emerald-400 text-sm">
                      {formatETB(totalVal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                  /{category.slug}
                </span>
                <Link
                  href={`/products?category=${encodeURIComponent(category.name)}`}
                  className="text-xs text-[#93660a] dark:text-amber-400 font-semibold flex items-center gap-1 hover:underline"
                >
                  <span>View Products</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        size="md"
        title={editingCategory ? 'Edit Category' : 'Create New Category'}
        description="Configure product grouping for Dire Dawa catalog"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                setFormData({ ...formData, name, slug: editingCategory ? formData.slug : slug });
              }}
              placeholder="e.g. Wireless Audio"
              className={`w-full px-3 py-2 text-sm rounded-lg border dark:border-slate-700 dark:bg-slate-900 dark:text-white ${
                formErrors.name ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
              } focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
            />
            {formErrors.name && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Slug / Code *
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className={`w-full px-3 py-2 text-sm rounded-lg border font-mono dark:border-slate-700 dark:bg-slate-900 dark:text-white ${
                formErrors.slug ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
              } focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
            />
            {formErrors.slug && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{formErrors.slug}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Icon Symbol
            </label>
            <select
              value={formData.iconName}
              onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              <option value="Zap" className="dark:bg-slate-900">Zap (Chargers & Power)</option>
              <option value="Cable" className="dark:bg-slate-900">Cable (Interconnects)</option>
              <option value="Headphones" className="dark:bg-slate-900">Headphones (Audio / TWS)</option>
              <option value="BatteryCharging" className="dark:bg-slate-900">Battery Charging (Power Banks)</option>
              <option value="Volume2" className="dark:bg-slate-900">Volume (Speakers)</option>
              <option value="Shield" className="dark:bg-slate-900">Shield (Protection / Cases)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What kind of accessories are placed under this category?"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="catActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-slate-300 dark:border-slate-700 text-[#101827] dark:text-white focus:ring-[#D9A441]"
            />
            <label htmlFor="catActive" className="text-xs text-slate-700 dark:text-slate-200 cursor-pointer font-medium">
              Category is active and visible in POS checkout
            </label>
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
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Category Confirmation Modal */}
      {categoryToDelete && (
        <Modal
          isOpen={!!categoryToDelete}
          onClose={() => setCategoryToDelete(null)}
          size="sm"
          title={`Delete Category: ${categoryToDelete.name}`}
          description="Remove category permanently from PostgreSQL database."
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setCategoryToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={async () => {
                  const cat = categoryToDelete;
                  setCategoryToDelete(null);
                  await deleteCategory(cat.id);
                }}
              >
                Delete from Database
              </Button>
            </div>
          }
        >
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Are you sure you want to remove <strong>{categoryToDelete.name}</strong> from the database?
            Any attached products will be safely reassigned to an active fallback category.
          </p>
        </Modal>
      )}

      {/* Bulk Delete Categories Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <Modal
          isOpen={isBulkDeleteModalOpen}
          onClose={() => setIsBulkDeleteModalOpen(false)}
          size="sm"
          title={`Bulk Delete: ${selectedCategoryIds.size} Categories`}
          description="Remove selected categories from database. Catalog items will fall back to general category."
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
                Delete {selectedCategoryIds.size} Categories
              </Button>
            </div>
          }
        >
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Are you sure you want to remove <strong>{selectedCategoryIds.size}</strong> selected categories? Products in these categories will not be deleted; their category designation will safely fall back to General Accessories.
          </p>
        </Modal>
      )}

      {/* Bulk Category Import Wizard Modal */}
      {isImportModalOpen && (
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          size="lg"
          title="Bulk Category Import Wizard"
          description="Import store categories and brand groups via CSV or JSON format with automatic slugification."
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 rounded-xl text-xs text-amber-900 dark:text-amber-200">
              <span>
                Required: <strong>name</strong>. Optional: <strong>slug, iconName, description, isActive</strong>.
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
                onChange={(e) => parseCategoriesInput(e.target.value)}
                placeholder="Paste CSV with header row or JSON array..."
                className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>

            {parsedCategories.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Validation Staging Preview ({parsedCategories.length} parsed)
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Valid: <strong className="text-emerald-600 dark:text-emerald-400">{parsedCategories.filter((c) => c.isValid).length}</strong> • 
                    Invalid: <strong className="text-rose-600 dark:text-rose-400">{parsedCategories.filter((c) => !c.isValid).length}</strong>
                  </span>
                </div>

                <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2 px-3">Category Name</th>
                        <th className="py-2 px-3">Slug</th>
                        <th className="py-2 px-3">Icon</th>
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                      {parsedCategories.map((c, idx) => (
                        <tr key={idx} className={c.isValid ? 'text-slate-700 dark:text-slate-300' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300'}>
                          <td className="py-2 px-3 font-semibold">{c.name || '—'}</td>
                          <td className="py-2 px-3 font-mono text-[11px]">{c.slug || '—'}</td>
                          <td className="py-2 px-3">{c.iconName}</td>
                          <td className="py-2 px-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">{c.description || '—'}</td>
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
                disabled={isImporting || parsedCategories.filter((c) => c.isValid).length === 0}
                isLoading={isImporting}
                onClick={handleCommitImport}
              >
                Commit Import ({parsedCategories.filter((c) => c.isValid).length} Valid Categories)
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
