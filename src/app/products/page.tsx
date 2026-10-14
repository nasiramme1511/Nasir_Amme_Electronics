'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Product } from '@/types';
import {
  Search,
  Plus,
  Download,
  Edit2,
  Trash2,
  Eye,
  Barcode,
  ArrowUpDown,
  MapPin,
  RefreshCw,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { formatETB, generateSKU } from '@/lib/formatters';
import { exportToCSV } from '@/lib/export';

interface ProductFormData {
  name: string;
  sku: string;
  barcode: string;
  brand: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockThreshold: number;
  status: 'active' | 'inactive';
  location: string;
  description: string;
  warrantyMonths: number;
}

export default function ProductsPage() {
  const { products, categories, addProduct, updateProduct, deleteProduct, addToast } = useApp();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'updated'>('updated');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [inspectingProduct, setInspectingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Form State
  const initialForm: ProductFormData = {
    name: '',
    sku: '',
    barcode: '',
    brand: '',
    category: categories[0]?.name || 'Chargers & Power Adapters',
    costPrice: 0,
    sellingPrice: 0,
    stockQuantity: 10,
    minStockThreshold: 5,
    status: 'active',
    location: 'Main Shelf A-01',
    description: '',
    warrantyMonths: 12,
  };
  const [formData, setFormData] = useState<ProductFormData>(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Unique brands list
  const uniqueBrands = useMemo(() => {
    const brands = new Set(products.map((p) => p.brand).filter(Boolean));
    return Array.from(brands);
  }, [products]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search filter
        const matchSearch =
          searchTerm === '' ||
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.barcode.includes(searchTerm) ||
          p.brand.toLowerCase().includes(searchTerm.toLowerCase());

        // Category filter
        const matchCategory =
          selectedCategory === 'all' || p.category === selectedCategory;

        // Stock status filter
        let matchStock = true;
        if (selectedStockStatus === 'in_stock') {
          matchStock = p.stockQuantity > p.minStockThreshold;
        } else if (selectedStockStatus === 'low_stock') {
          matchStock = p.stockQuantity > 0 && p.stockQuantity <= p.minStockThreshold;
        } else if (selectedStockStatus === 'out_of_stock') {
          matchStock = p.stockQuantity === 0;
        }

        // Brand filter
        const matchBrand = selectedBrand === 'all' || p.brand === selectedBrand;

        return matchSearch && matchCategory && matchStock && matchBrand;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'name') {
          diff = a.name.localeCompare(b.name);
        } else if (sortBy === 'price') {
          diff = a.sellingPrice - b.sellingPrice;
        } else if (sortBy === 'stock') {
          diff = a.stockQuantity - b.stockQuantity;
        } else if (sortBy === 'updated') {
          diff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
        return sortDirection === 'asc' ? diff : -diff;
      });
  }, [products, searchTerm, selectedCategory, selectedStockStatus, selectedBrand, sortBy, sortDirection]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Reset page when filters change
  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setCurrentPage(1);
  };

  // Toggle sorting
  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      ...initialForm,
      sku: generateSKU('ELE'),
      barcode: `${Math.floor(6000000000000 + Math.random() * 900000000000)}`,
    });
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      brand: product.brand,
      category: product.category,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      stockQuantity: product.stockQuantity,
      minStockThreshold: product.minStockThreshold,
      status: product.status,
      location: product.location,
      description: product.description,
      warrantyMonths: product.warrantyMonths || 0,
    });
    setFormErrors({});
    setIsAddEditModalOpen(true);
  };

  // Form Validation and Submit
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Product name is required';
    if (!formData.sku.trim()) errors.sku = 'SKU is required';
    if (!formData.brand.trim()) errors.brand = 'Brand is required';
    if (formData.costPrice < 0) errors.costPrice = 'Cost cannot be negative';
    if (formData.sellingPrice <= 0) errors.sellingPrice = 'Selling price must be greater than 0';
    if (formData.sellingPrice < formData.costPrice) {
      errors.sellingPrice = 'Selling price cannot be less than cost price';
    }
    if (formData.stockQuantity < 0) errors.stockQuantity = 'Stock cannot be negative';
    if (formData.minStockThreshold < 0) errors.minStockThreshold = 'Threshold cannot be negative';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        ...formData,
      });
    } else {
      addProduct({
        ...formData,
      });
    }

    setIsAddEditModalOpen(false);
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'SKU',
      'Barcode',
      'Name',
      'Brand',
      'Category',
      'Cost Price (ETB)',
      'Selling Price (ETB)',
      'Margin (ETB)',
      'Stock Quantity',
      'Min Threshold',
      'Stock Status',
      'Store Location',
      'Status',
    ];

    const rows = filteredProducts.map((p) => {
      const margin = p.sellingPrice - p.costPrice;
      const statusLabel =
        p.stockQuantity === 0
          ? 'Out of Stock'
          : p.stockQuantity <= p.minStockThreshold
          ? 'Low Stock'
          : 'In Stock';

      return [
        p.sku,
        p.barcode,
        p.name,
        p.brand,
        p.category,
        p.costPrice,
        p.sellingPrice,
        margin,
        p.stockQuantity,
        p.minStockThreshold,
        statusLabel,
        p.location,
        p.status,
      ];
    });

    exportToCSV('nasir_amme_products_catalog', headers, rows);
    addToast({
      type: 'info',
      title: 'Catalog Exported',
      message: `${filteredProducts.length} product records exported to CSV.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Product Catalog
            </h1>
            <Badge variant="accent" size="sm">
              {products.length} Items Total
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage electronics accessories, stock thresholds, pricing, and shelf locations in Dire Dawa.
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
            Add Product
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <div className="p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, SKU, brand, or barcode..."
              value={searchTerm}
              onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#D9A441] bg-slate-50/50"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => handleFilterChange(setSelectedCategory, e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Stock Status Filter */}
            <select
              value={selectedStockStatus}
              onChange={(e) => handleFilterChange(setSelectedStockStatus, e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock (Healthy)</option>
              <option value="low_stock">Low Stock (Alert)</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>

            {/* Brand Filter */}
            <select
              value={selectedBrand}
              onChange={(e) => handleFilterChange(setSelectedBrand, e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              <option value="all">All Brands</option>
              {uniqueBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Clear filters if active */}
            {(searchTerm || selectedCategory !== 'all' || selectedStockStatus !== 'all' || selectedBrand !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedStockStatus('all');
                  setSelectedBrand('all');
                  setCurrentPage(1);
                }}
                className="text-xs text-rose-600 hover:text-rose-700"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-600 text-xs font-semibold border-b border-slate-200">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Product Name & SKU</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Brand & Category</th>
                <th
                  onClick={() => handleSort('price')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Selling (ETB)</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Cost (ETB)</th>
                <th className="py-3 px-4 text-right">Margin %</th>
                <th
                  onClick={() => handleSort('stock')}
                  className="py-3 px-4 text-center cursor-pointer hover:text-slate-900 select-none"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Stock Level</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.map((product) => {
                const marginETB = product.sellingPrice - product.costPrice;
                const marginPercent =
                  product.sellingPrice > 0
                    ? ((marginETB / product.sellingPrice) * 100).toFixed(0)
                    : '0';

                const isLowStock =
                  product.stockQuantity > 0 &&
                  product.stockQuantity <= product.minStockThreshold;
                const isOutOfStock = product.stockQuantity === 0;

                return (
                  <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Name, SKU, Barcode */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 line-clamp-1 max-w-xs">
                        {product.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono">
                        <span className="bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                          {product.sku}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {product.barcode}
                        </span>
                      </div>
                    </td>

                    {/* Brand & Category */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 text-xs">
                        {product.brand}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                        {product.category}
                      </div>
                    </td>

                    {/* Selling Price */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatETB(product.sellingPrice)}
                    </td>

                    {/* Cost Price */}
                    <td className="py-3.5 px-4 text-right text-xs text-slate-500">
                      {formatETB(product.costPrice)}
                    </td>

                    {/* Margin */}
                    <td className="py-3.5 px-4 text-right text-xs font-semibold text-[#16845B]">
                      +{marginPercent}%
                    </td>

                    {/* Stock Level */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span
                          className={`text-sm font-bold ${
                            isOutOfStock
                              ? 'text-rose-600'
                              : isLowStock
                              ? 'text-amber-600'
                              : 'text-slate-900'
                          }`}
                        >
                          {product.stockQuantity} pcs
                        </span>
                        <span className="text-[10px] text-slate-400">
                          min {product.minStockThreshold}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      {isOutOfStock ? (
                        <Badge variant="danger" size="sm">
                          Out of Stock
                        </Badge>
                      ) : isLowStock ? (
                        <Badge variant="warning" size="sm">
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          In Stock
                        </Badge>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setInspectingProduct(product)}
                          className="p-1.5 text-slate-500 hover:text-[#101827] hover:bg-slate-100 rounded-md transition-colors"
                          title="View Details"
                          aria-label={`View ${product.name}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(product)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit Product"
                          aria-label={`Edit ${product.name}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingProductId(product.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Delete Product"
                          aria-label={`Delete ${product.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Package className="w-10 h-10 text-slate-300 mx-auto" />
                      <h4 className="text-sm font-semibold text-slate-700">
                        No products match your criteria
                      </h4>
                      <p className="text-xs text-slate-400">
                        Try adjusting search keywords, category, or stock status filters.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredProducts.length)} of{' '}
              {filteredProducts.length} entries
            </span>

            {/* Page size control */}
            <div className="flex items-center gap-1.5">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-700 text-xs focus:ring-1 focus:ring-[#D9A441]"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>per page</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="px-3 py-1 font-semibold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Product Details Slide-over / Modal */}
      {inspectingProduct && (
        <Modal
          isOpen={!!inspectingProduct}
          onClose={() => setInspectingProduct(null)}
          size="lg"
          title={inspectingProduct.name}
          description={`${inspectingProduct.brand} • ${inspectingProduct.category}`}
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const p = inspectingProduct;
                  setInspectingProduct(null);
                  handleOpenEdit(p);
                }}
                leftIcon={<Edit2 className="w-4 h-4" />}
              >
                Edit Details
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setInspectingProduct(null)}
              >
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Top specs summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Selling Price
                </span>
                <span className="text-base font-bold text-slate-900">
                  {formatETB(inspectingProduct.sellingPrice)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Cost Price
                </span>
                <span className="text-base font-medium text-slate-700">
                  {formatETB(inspectingProduct.costPrice)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Gross Margin
                </span>
                <span className="text-base font-bold text-[#16845B]">
                  +{formatETB(inspectingProduct.sellingPrice - inspectingProduct.costPrice)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Current Stock
                </span>
                <span className="text-base font-bold text-[#101827]">
                  {inspectingProduct.stockQuantity} pcs
                </span>
              </div>
            </div>

            {/* Description & specs */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Product Overview & Description
              </h4>
              <p className="text-sm text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                {inspectingProduct.description || 'No detailed description specified.'}
              </p>
            </div>

            {/* Location & Barcode Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <MapPin className="w-4 h-4 text-[#D9A441]" />
                  <span>Shop Floor Location</span>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {inspectingProduct.location}
                </div>
                <div className="text-xs text-slate-500">
                  Dire Dawa Retail Branch (Near B-Capital Hotel)
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Barcode className="w-4 h-4 text-slate-700" />
                  <span>Barcode & SKU Specs</span>
                </div>
                <div className="font-mono text-xs text-slate-900">
                  SKU: {inspectingProduct.sku}
                </div>
                <div className="font-mono text-xs text-slate-600">
                  EAN-13: {inspectingProduct.barcode}
                </div>
                <div className="text-[11px] text-slate-400">
                  Warranty: {inspectingProduct.warrantyMonths || 0} Months Store Warranty
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        size="lg"
        title={editingProduct ? 'Edit Product Record' : 'Add New Electronics Product'}
        description="Configure product specifications, pricing in ETB, and inventory thresholds."
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Title / Model *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Baseus GaN 65W Fast Charger"
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  formErrors.name ? 'border-rose-500' : 'border-slate-300'
                } focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
              />
              {formErrors.name && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.name}</p>
              )}
            </div>

            {/* SKU with Generate Button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">SKU Code *</label>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      sku: generateSKU(formData.brand.slice(0, 3) || 'ELE'),
                    })
                  }
                  className="text-[11px] text-[#93660a] hover:underline font-medium flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Auto Generate
                </button>
              </div>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className={`w-full px-3 py-2 text-sm rounded-lg border font-mono ${
                  formErrors.sku ? 'border-rose-500' : 'border-slate-300'
                } focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
              />
              {formErrors.sku && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.sku}</p>
              )}
            </div>

            {/* Barcode */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Barcode / EAN-13
              </label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Scan or enter barcode"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Brand *
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g. Anker, Oraimo, Samsung, Apple"
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  formErrors.brand ? 'border-rose-500' : 'border-slate-300'
                } focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
              />
              {formErrors.brand && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.brand}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Cost Price */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cost Price (ETB) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.costPrice || ''}
                onChange={(e) =>
                  setFormData({ ...formData, costPrice: Number(e.target.value) })
                }
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  formErrors.costPrice ? 'border-rose-500' : 'border-slate-300'
                } focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
              />
              {formErrors.costPrice && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.costPrice}</p>
              )}
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Selling Price (ETB) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.sellingPrice || ''}
                onChange={(e) =>
                  setFormData({ ...formData, sellingPrice: Number(e.target.value) })
                }
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  formErrors.sellingPrice ? 'border-rose-500' : 'border-slate-300'
                } focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
              />
              {formErrors.sellingPrice && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.sellingPrice}</p>
              )}
            </div>

            {/* Margin Calculation helper */}
            <div className="sm:col-span-2 bg-emerald-50/70 p-3 rounded-lg border border-emerald-200/60 flex items-center justify-between text-xs text-emerald-900">
              <span>
                Calculated Gross Margin:
                <strong className="ml-1 text-sm text-[#16845B]">
                  {formatETB(formData.sellingPrice - formData.costPrice)}
                </strong>
              </span>
              <span>
                Markup Rate:
                <strong className="ml-1 text-sm text-[#16845B]">
                  {formData.sellingPrice > 0
                    ? `${(((formData.sellingPrice - formData.costPrice) / formData.sellingPrice) * 100).toFixed(1)}%`
                    : '0%'}
                </strong>
              </span>
            </div>

            {/* Stock Quantity */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Stock Quantity *
              </label>
              <input
                type="number"
                min="0"
                value={formData.stockQuantity}
                onChange={(e) =>
                  setFormData({ ...formData, stockQuantity: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>

            {/* Min Threshold */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Low Stock Threshold *
              </label>
              <input
                type="number"
                min="0"
                value={formData.minStockThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, minStockThreshold: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>

            {/* Location in shop */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shelf / Counter Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Shelf A-01, Showcase B"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>

            {/* Warranty */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Warranty (Months)
              </label>
              <input
                type="number"
                min="0"
                value={formData.warrantyMonths}
                onChange={(e) =>
                  setFormData({ ...formData, warrantyMonths: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Description & Notes
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tech specs, compatibility, and packaging details"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>
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
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deletingProductId}
        onClose={() => setDeletingProductId(null)}
        onConfirm={() => {
          if (deletingProductId) {
            deleteProduct(deletingProductId);
            setDeletingProductId(null);
          }
        }}
        title="Remove Product from Catalog?"
        message="This action will delete this item from Nasir Amme Electronics catalog and inventory tables. It does not affect historical sales receipts."
        confirmLabel="Delete Product"
        variant="danger"
      />
    </div>
  );
}
