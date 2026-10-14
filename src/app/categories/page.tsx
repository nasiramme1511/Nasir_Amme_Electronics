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
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { formatETB } from '@/lib/formatters';

export default function CategoriesPage() {
  const { categories, products, addCategory, updateCategory } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Product Categories
            </h1>
            <Badge variant="accent" size="sm">
              {categories.length} Groups
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Organize electronics inventory into display sections and shelf groupings.
          </p>
        </div>

        <Button
          variant="accent"
          size="sm"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Category
        </Button>
      </div>

      {/* Search Bar */}
      <Card>
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search category titles or descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#D9A441] bg-slate-50/50"
            />
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline">
            Directly mapped to POS filters
          </span>
        </div>
      </Card>

      {/* Category Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCategories.map((category) => {
          // Live count of matching products
          const matchedProducts = products.filter((p) => p.category === category.name);
          const totalVal = matchedProducts.reduce(
            (sum, p) => sum + p.costPrice * p.stockQuantity,
            0
          );

          return (
            <Card key={category.id} className="hover:shadow-md transition-all flex flex-col justify-between">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                    {renderIcon(category.iconName)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={category.isActive ? 'success' : 'neutral'} size="sm">
                      {category.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <button
                      onClick={() => handleOpenEdit(category)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit Category"
                      aria-label={`Edit ${category.name}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-4">
                  {category.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[32px]">
                  {category.description}
                </p>

                {/* Metrics */}
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Products</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {matchedProducts.length} items
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Inventory Value</span>
                    <span className="font-bold text-[#16845B] text-sm">
                      {formatETB(totalVal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">
                  /{category.slug}
                </span>
                <Link
                  href={`/products?category=${encodeURIComponent(category.name)}`}
                  className="text-xs text-[#93660a] font-semibold flex items-center gap-1 hover:underline"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">
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
              className={`w-full px-3 py-2 text-sm rounded-lg border ${
                formErrors.name ? 'border-rose-500' : 'border-slate-300'
              } focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
            />
            {formErrors.name && (
              <p className="text-xs text-rose-600 mt-1">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Slug / Code *
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className={`w-full px-3 py-2 text-sm rounded-lg border font-mono ${
                formErrors.slug ? 'border-rose-500' : 'border-slate-300'
              } focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
            />
            {formErrors.slug && (
              <p className="text-xs text-rose-600 mt-1">{formErrors.slug}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Icon Symbol
            </label>
            <select
              value={formData.iconName}
              onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              <option value="Zap">Zap (Chargers & Power)</option>
              <option value="Cable">Cable (Interconnects)</option>
              <option value="Headphones">Headphones (Audio / TWS)</option>
              <option value="BatteryCharging">Battery Charging (Power Banks)</option>
              <option value="Volume2">Volume (Speakers)</option>
              <option value="Shield">Shield (Protection / Cases)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What kind of accessories are placed under this category?"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="catActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-slate-300 text-[#101827] focus:ring-[#D9A441]"
            />
            <label htmlFor="catActive" className="text-xs text-slate-700 cursor-pointer font-medium">
              Category is active and visible in POS checkout
            </label>
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
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
