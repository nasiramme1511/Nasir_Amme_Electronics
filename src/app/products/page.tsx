'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
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
  Upload,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Image as ImageIcon,
  X,
  Lock,
  Cpu,
  Clock,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { formatETB, generateSKU, formatDate } from '@/lib/formatters';
import { validateEAN13, generateValidEAN13 } from '@/lib/barcode';
import { exportToCSV, exportToJSON } from '@/lib/export';

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
  imageUrl: string;
  hasSerials: boolean;
  serialNumbersText: string;
  confirmBelowCost: boolean;
}

export default function ProductsPage() {
  const { products, categories, addProduct, updateProduct, deleteProduct, addToast } = useApp();
  const { hasRole } = useAuth();

  // Role Permissions
  // Admin & Manager are authorized to create products and set cost prices
  const canCreateProduct = hasRole('admin', 'manager');
  const canSetCostPrice = hasRole('admin', 'manager');

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

  // Bulk Selection, Delete and Import State
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [parsedProducts, setParsedProducts] = useState<
    Array<{
      name: string;
      sku: string;
      barcode: string;
      brand: string;
      category: string;
      costPrice: number;
      sellingPrice: number;
      stockQuantity: number;
      minStockThreshold: number;
      location: string;
      warrantyMonths: number;
      description: string;
      isValid: boolean;
      error?: string;
    }>
  >([]);

  // Uploading state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    imageUrl: '',
    hasSerials: false,
    serialNumbersText: '',
    confirmBelowCost: false,
  };

  const [formData, setFormData] = useState<ProductFormData>(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Unique brands list
  const uniqueBrands = useMemo(() => {
    const brands = new Set(products.map((p) => p.brand).filter(Boolean));
    return Array.from(brands);
  }, [products]);

  // Live Pricing Calculations
  const liveGrossProfit = formData.sellingPrice - formData.costPrice;
  const liveGrossMarginPercent =
    formData.sellingPrice > 0 ? (liveGrossProfit / formData.sellingPrice) * 100 : 0;
  const liveMarkupPercent =
    formData.costPrice > 0 ? (liveGrossProfit / formData.costPrice) * 100 : 0;
  const isSellingBelowCost =
    formData.sellingPrice > 0 && formData.costPrice > 0 && formData.sellingPrice < formData.costPrice;

  // Live Barcode EAN-13 Validation
  const barcodeCheck = useMemo(() => {
    const clean = formData.barcode.trim();
    if (!clean) return null;
    if (clean.length === 13 && /^\d+$/.test(clean)) {
      return validateEAN13(clean);
    }
    return null;
  }, [formData.barcode]);

  // Live Duplicate Barcode Check
  const duplicateBarcodeWarning = useMemo(() => {
    const clean = formData.barcode.trim();
    if (!clean) return null;
    const match = products.find(
      (p) => p.barcode === clean && (!editingProduct || p.id !== editingProduct.id)
    );
    if (match) {
      return `Barcode is already assigned to "${match.name}" (SKU: ${match.sku})`;
    }
    return null;
  }, [formData.barcode, products, editingProduct]);

  // Live Serial Numbers Parsing
  const parsedSerials = useMemo(() => {
    if (!formData.serialNumbersText.trim()) return [];
    return Array.from(
      new Set(
        formData.serialNumbersText
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
  }, [formData.serialNumbersText]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchSearch =
          searchTerm === '' ||
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.barcode.includes(searchTerm) ||
          p.brand.toLowerCase().includes(searchTerm.toLowerCase());

        const matchCategory =
          selectedCategory === 'all' || p.category === selectedCategory;

        let matchStock = true;
        if (selectedStockStatus === 'in_stock') {
          matchStock = p.stockQuantity > p.minStockThreshold;
        } else if (selectedStockStatus === 'low_stock') {
          matchStock = p.stockQuantity > 0 && p.stockQuantity <= p.minStockThreshold;
        } else if (selectedStockStatus === 'out_of_stock') {
          matchStock = p.stockQuantity === 0;
        }

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

  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setCurrentPage(1);
  };

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
    if (!canCreateProduct) {
      addToast({
        type: 'error',
        title: 'Permission Denied',
        message: 'Only Administrators and Store Managers can create new products.',
      });
      return;
    }

    setEditingProduct(null);
    setFormData({
      ...initialForm,
      sku: generateSKU('ELE'),
      barcode: generateValidEAN13('600'),
    });
    setFormErrors({});
    setServerError(null);
    setUploadError(null);
    setIsAddEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (product: Product) => {
    if (!canCreateProduct) {
      addToast({
        type: 'error',
        title: 'Permission Denied',
        message: 'Only Administrators and Store Managers can edit product records.',
      });
      return;
    }

    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      brand: product.brand,
      category: product.category,
      costPrice: product.costPrice || 0,
      sellingPrice: product.sellingPrice,
      stockQuantity: product.stockQuantity,
      minStockThreshold: product.minStockThreshold,
      status: product.status,
      location: product.location,
      description: product.description,
      warrantyMonths: product.warrantyMonths || 0,
      imageUrl: product.imageUrl || '',
      hasSerials: Boolean(product.hasSerials || (product.serials && product.serials.length > 0)),
      serialNumbersText: product.serials?.map((s) => s.serialNumber).join('\n') || '',
      confirmBelowCost: false,
    });
    setFormErrors({});
    setServerError(null);
    setUploadError(null);
    setIsAddEditModalOpen(true);
  };

  // Image Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files (JPEG, PNG, WEBP, GIF) are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size exceeds 5MB limit.');
      return;
    }

    setIsUploadingImage(true);
    setUploadError(null);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to upload image.');
      }

      setFormData((prev) => ({ ...prev, imageUrl: json.data.url }));
      addToast({
        type: 'success',
        title: 'Image Uploaded',
        message: 'Product photo uploaded and preview ready.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error uploading image.';
      setUploadError(msg);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Form Submit Handler
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Product title / model is required';
    if (!formData.sku.trim()) errors.sku = 'Unique SKU code is required';
    if (!formData.brand.trim()) errors.brand = 'Brand manufacturer is required';

    // Pricing validation: Reject negative prices
    if (formData.sellingPrice < 0) {
      errors.sellingPrice = 'Selling price cannot be negative';
    } else if (formData.sellingPrice === 0) {
      errors.sellingPrice = 'Selling price must be greater than 0';
    }

    if (canSetCostPrice && formData.costPrice < 0) {
      errors.costPrice = 'Cost price cannot be negative';
    }

    // Flag selling price below cost
    if (
      canSetCostPrice &&
      formData.sellingPrice > 0 &&
      formData.costPrice > 0 &&
      formData.sellingPrice < formData.costPrice &&
      !formData.confirmBelowCost
    ) {
      errors.sellingPrice = 'Selling price is below cost. Check confirmation box below to proceed.';
    }

    // Stock validation
    if (formData.stockQuantity < 0) errors.stockQuantity = 'Stock balance cannot be negative';
    if (formData.minStockThreshold < 0) errors.minStockThreshold = 'Low stock threshold cannot be negative';

    // Barcode validation
    if (formData.barcode.trim()) {
      if (duplicateBarcodeWarning) {
        errors.barcode = duplicateBarcodeWarning;
      } else if (barcodeCheck && !barcodeCheck.isValid) {
        errors.barcode = barcodeCheck.error || 'Invalid EAN-13 barcode.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: formData.name.trim(),
          sku: formData.sku.trim(),
          barcode: formData.barcode.trim() || undefined,
          brand: formData.brand.trim(),
          category: formData.category,
          costPrice: canSetCostPrice ? Number(formData.costPrice) : editingProduct.costPrice,
          sellingPrice: Number(formData.sellingPrice),
          stockQuantity: Number(formData.stockQuantity),
          minStockThreshold: Number(formData.minStockThreshold),
          status: formData.status,
          location: formData.location.trim(),
          description: formData.description.trim(),
          warrantyMonths: Number(formData.warrantyMonths) || 0,
          imageUrl: formData.imageUrl.trim() || undefined,
          hasSerials: formData.hasSerials,
        });
      } else {
        await addProduct({
          name: formData.name.trim(),
          sku: formData.sku.trim(),
          barcode: formData.barcode.trim() || '',
          brand: formData.brand.trim(),
          category: formData.category,
          costPrice: canSetCostPrice ? Number(formData.costPrice) : 0,
          sellingPrice: Number(formData.sellingPrice),
          stockQuantity: Number(formData.stockQuantity),
          minStockThreshold: Number(formData.minStockThreshold),
          status: formData.status,
          location: formData.location.trim(),
          description: formData.description.trim(),
          warrantyMonths: Number(formData.warrantyMonths) || 0,
          imageUrl: formData.imageUrl.trim() || undefined,
          hasSerials: formData.hasSerials,
          serialNumbers: formData.hasSerials ? parsedSerials : [],
        });
      }

      setIsAddEditModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save product.';
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Selection Helpers
  const isAllSelected =
    paginatedProducts.length > 0 &&
    paginatedProducts.every((p) => selectedProductIds.has(p.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedProductIds((prev) => {
        const next = new Set(prev);
        paginatedProducts.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedProductIds((prev) => {
        const next = new Set(prev);
        paginatedProducts.forEach((p) => next.add(p.id));
        return next;
      });
    }
  };

  const handleToggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // CSV Export
  const handleExportCSV = () => {
    const targetProducts =
      selectedProductIds.size > 0
        ? products.filter((p) => selectedProductIds.has(p.id))
        : filteredProducts;

    const headers = [
      'SKU',
      'Barcode',
      'Name',
      'Brand',
      'Category',
      ...(canSetCostPrice ? ['Cost Price (ETB)'] : []),
      'Selling Price (ETB)',
      ...(canSetCostPrice ? ['Gross Margin (ETB)'] : []),
      'Stock Quantity',
      'Min Threshold',
      'Stock Status',
      'Warranty (Months)',
      'Serials Tracked',
      'Store Location',
      'Status',
    ];

    const rows = targetProducts.map((p) => {
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
        ...(canSetCostPrice ? [p.costPrice] : []),
        p.sellingPrice,
        ...(canSetCostPrice ? [margin] : []),
        p.stockQuantity,
        p.minStockThreshold,
        statusLabel,
        p.warrantyMonths || 0,
        p.hasSerials ? 'Yes' : 'No',
        p.location,
        p.status,
      ];
    });

    exportToCSV('nasir_amme_products_catalog', headers, rows);
    addToast({
      type: 'info',
      title: 'Catalog Exported',
      message: `${targetProducts.length} product records exported to CSV.`,
    });
  };

  // JSON Export
  const handleExportJSON = () => {
    const targetProducts =
      selectedProductIds.size > 0
        ? products.filter((p) => selectedProductIds.has(p.id))
        : filteredProducts;

    exportToJSON('nasir_amme_products_catalog', targetProducts);
    addToast({
      type: 'info',
      title: 'JSON Catalog Exported',
      message: `${targetProducts.length} product records exported to JSON.`,
    });
  };

  // Bulk Delete
  const handleConfirmBulkDelete = async () => {
    if (selectedProductIds.size === 0) return;
    setIsBulkDeleting(true);
    const ids = Array.from(selectedProductIds);
    let count = 0;
    for (const id of ids) {
      try {
        await deleteProduct(id);
        count++;
      } catch (err) {
        console.error('Failed to delete product', id, err);
      }
    }
    setSelectedProductIds(new Set());
    setIsBulkDeleteModalOpen(false);
    setIsBulkDeleting(false);
    addToast({
      type: 'success',
      title: 'Bulk Deletion Complete',
      message: `${count} products removed and archived.`,
    });
  };

  // Load Sample CSV Template
  const handleLoadSampleCSV = () => {
    const sample = `name,sku,barcode,brand,category,costPrice,sellingPrice,stockQuantity,minStockThreshold,location,warrantyMonths,description
Joyroom JR-T03S Pro ANC,JOY-TWS-01,6941237123456,Joyroom,Headphones (Audio / TWS),2400,3200,15,5,Main Shelf A-02,12,True wireless stereo with active noise cancellation
Anker PowerCore 20000mAh,ANK-PB-02,6949876543210,Anker,Battery Charging (Power Banks),3800,4900,10,3,Main Shelf B-01,18,High capacity power bank with fast PowerIQ
Baseus Cafule Type-C Cable 2m,BAS-CAB-03,6945556667778,Baseus,Cables & Interconnects,350,550,40,10,Peg Hook C-04,6,Durable nylon braided fast charging cable`;
    setImportText(sample);
    parseProductsInput(sample);
  };

  // Parse Products Input (CSV or JSON)
  const parseProductsInput = (raw: string) => {
    setImportText(raw);
    const trimmed = raw.trim();
    if (!trimmed) {
      setParsedProducts([]);
      return;
    }

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = trimmed.startsWith('{') ? [JSON.parse(trimmed)] : JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const list = parsed.map((item: any) => {
            const name = String(item.name || item.productName || '').trim();
            const brand = String(item.brand || 'Joyroom').trim();
            const category = String(item.category || categories[0]?.name || 'Accessories').trim();
            const costPrice = Number(item.costPrice || 0);
            const sellingPrice = Number(item.sellingPrice || 0);
            const stockQuantity = Number(item.stockQuantity ?? item.stock ?? 10);
            const minStockThreshold = Number(item.minStockThreshold ?? 5);
            const sku = String(item.sku || generateSKU(brand.slice(0, 3).toUpperCase() || 'ELE'));
            const barcode = String(item.barcode || generateValidEAN13(sku));
            const location = String(item.location || 'Main Shelf A-01');
            const warrantyMonths = Number(item.warrantyMonths || 12);
            const description = String(item.description || '');

            let isValid = true;
            let error = '';
            if (!name) {
              isValid = false;
              error = 'Product name required';
            } else if (sellingPrice <= 0) {
              isValid = false;
              error = 'Selling price must be > 0';
            }

            return {
              name,
              sku,
              barcode,
              brand,
              category,
              costPrice,
              sellingPrice,
              stockQuantity,
              minStockThreshold,
              location,
              warrantyMonths,
              description,
              isValid,
              error,
            };
          });
          setParsedProducts(list);
          return;
        }
      } catch {
        // Fallback to CSV
      }
    }

    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      setParsedProducts([]);
      return;
    }

    const headerParts = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
    const nameIdx = headerParts.findIndex((h) => h.includes('name'));
    const skuIdx = headerParts.findIndex((h) => h === 'sku');
    const barcodeIdx = headerParts.findIndex((h) => h.includes('barcode') || h.includes('ean'));
    const brandIdx = headerParts.findIndex((h) => h === 'brand');
    const catIdx = headerParts.findIndex((h) => h.includes('cat'));
    const costIdx = headerParts.findIndex((h) => h.includes('cost'));
    const sellIdx = headerParts.findIndex((h) => h.includes('sell') || h.includes('price'));
    const stockIdx = headerParts.findIndex((h) => h.includes('stock') || h.includes('qty'));
    const minIdx = headerParts.findIndex((h) => h.includes('min') || h.includes('thresh'));
    const locIdx = headerParts.findIndex((h) => h.includes('loc'));
    const warIdx = headerParts.findIndex((h) => h.includes('warr'));
    const descIdx = headerParts.findIndex((h) => h.includes('desc'));

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
      const brand = (brandIdx !== -1 ? parts[brandIdx] : parts[3]) || 'Joyroom';
      const category = (catIdx !== -1 ? parts[catIdx] : parts[4]) || categories[0]?.name || 'Accessories';
      const costPrice = Number((costIdx !== -1 ? parts[costIdx] : parts[5]) || 0);
      const sellingPrice = Number((sellIdx !== -1 ? parts[sellIdx] : parts[6]) || 0);
      const stockQuantity = Number((stockIdx !== -1 ? parts[stockIdx] : parts[7]) || 10);
      const minStockThreshold = Number((minIdx !== -1 ? parts[minIdx] : parts[8]) || 5);
      const sku = (skuIdx !== -1 ? parts[skuIdx] : parts[1]) || generateSKU(brand.slice(0, 3).toUpperCase() || 'ELE');
      const barcode = (barcodeIdx !== -1 ? parts[barcodeIdx] : parts[2]) || generateValidEAN13(sku);
      const location = (locIdx !== -1 ? parts[locIdx] : parts[9]) || 'Main Shelf A-01';
      const warrantyMonths = Number((warIdx !== -1 ? parts[warIdx] : parts[10]) || 12);
      const description = (descIdx !== -1 ? parts[descIdx] : parts[11]) || '';

      let isValid = true;
      let error = '';
      if (!name) {
        isValid = false;
        error = 'Product name required';
      } else if (sellingPrice <= 0) {
        isValid = false;
        error = 'Selling price must be > 0';
      }

      return {
        name,
        sku,
        barcode,
        brand,
        category,
        costPrice,
        sellingPrice,
        stockQuantity,
        minStockThreshold,
        location,
        warrantyMonths,
        description,
        isValid,
        error,
      };
    });

    setParsedProducts(list);
  };

  // Commit Import
  const handleCommitImport = async () => {
    const valid = parsedProducts.filter((p) => p.isValid);
    if (valid.length === 0) return;
    setIsImporting(true);
    let count = 0;
    for (const item of valid) {
      try {
        await addProduct({
          name: item.name,
          sku: item.sku,
          barcode: item.barcode,
          brand: item.brand,
          category: item.category,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          stockQuantity: item.stockQuantity,
          minStockThreshold: item.minStockThreshold,
          status: 'active',
          location: item.location,
          description: item.description,
          warrantyMonths: item.warrantyMonths,
          hasSerials: false,
        });
        count++;
      } catch (err) {
        console.error('Import error for item', item.name, err);
      }
    }
    setIsImporting(false);
    setIsImportModalOpen(false);
    setImportText('');
    setParsedProducts([]);
    addToast({
      type: 'success',
      title: 'Import Complete',
      message: `Successfully imported ${count} product(s) into catalog.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Product Catalog
            </h1>
            <Badge variant="accent" size="sm">
              {products.length} Items Total
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage catalog items, pricing, and stock levels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="w-4 h-4" />}
          >
            {selectedProductIds.size > 0 ? `CSV (${selectedProductIds.size})` : 'Export CSV'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            leftIcon={<Download className="w-4 h-4" />}
          >
            {selectedProductIds.size > 0 ? `JSON (${selectedProductIds.size})` : 'Export JSON'}
          </Button>

          {canCreateProduct && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setImportText('');
                setParsedProducts([]);
                setIsImportModalOpen(true);
              }}
              leftIcon={<Upload className="w-4 h-4" />}
            >
              Import
            </Button>
          )}

          {canCreateProduct ? (
            <Button
              variant="accent"
              size="sm"
              onClick={handleOpenAdd}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Product
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs text-slate-500 font-medium border border-slate-200 dark:border-slate-700">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Creation requires Admin/Manager role</span>
            </div>
          )}
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
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 dark:bg-slate-900/60 dark:text-white transition-colors"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => handleFilterChange(setSelectedCategory, e.target.value)}
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
              className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="all">All Brands</option>
              {uniqueBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

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
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Floating Bulk Action Bar */}
      {selectedProductIds.size > 0 && (
        <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold font-mono text-xs flex items-center justify-center">
              {selectedProductIds.size}
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Products selected
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
              Export CSV ({selectedProductIds.size})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Export JSON ({selectedProductIds.size})
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete Selected ({selectedProductIds.size})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedProductIds(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Products Table Card */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                  />
                </th>
                <th className="py-3 px-4 w-20 text-center">Photo</th>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Product Name & SKU</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Brand & Category</th>
                <th
                  onClick={() => handleSort('price')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Selling (ETB)</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {!canSetCostPrice && <Lock className="w-3 h-3 text-slate-400" />}
                    <span>Cost (ETB)</span>
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Margin %</th>
                <th
                  onClick={() => handleSort('stock')}
                  className="py-3 px-4 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white select-none"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Stock Level</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Warranty</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    No products found matching the criteria.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
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
                    <tr
                      key={product.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        selectedProductIds.has(product.id) ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.has(product.id)}
                          onChange={() => handleToggleSelectProduct(product.id)}
                          className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                        />
                      </td>

                      {/* Image Thumbnail (64px x 64px, object-contain, neutral bg) */}
                      <td className="py-3 px-4 text-center">
                        <div
                          onClick={() => setInspectingProduct(product)}
                          className="w-16 h-16 min-w-[64px] min-h-[64px] max-w-[64px] max-h-[64px] rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center p-1.5 mx-auto cursor-pointer hover:border-blue-400 transition-all hover:shadow-xs group"
                          title={`Click to inspect ${product.name}`}
                        >
                          {product.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-contain transition-transform group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400">
                              <Package className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                              <span className="font-bold text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">
                                {product.brand.slice(0, 3)}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Name, SKU, Barcode */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white line-clamp-1 max-w-xs">
                          {product.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[11px]">
                            {product.sku}
                          </span>
                          {product.barcode && (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Barcode className="w-3 h-3" />
                              {product.barcode}
                            </span>
                          )}
                          {product.hasSerials && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-medium">
                              <Cpu className="w-2.5 h-2.5" />
                              Serials
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Brand & Category */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                          {product.brand}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                          {product.category}
                        </div>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {formatETB(product.sellingPrice)}
                      </td>

                      {/* Cost Price (Restricted Role Guard) */}
                      <td className="py-3.5 px-4 text-right text-xs text-slate-500 dark:text-slate-400">
                        {canSetCostPrice ? (
                          formatETB(product.costPrice)
                        ) : (
                          <span className="text-slate-400 select-none font-mono">*** ETB</span>
                        )}
                      </td>

                      {/* Margin % */}
                      <td className="py-3.5 px-4 text-right text-xs font-semibold">
                        {canSetCostPrice ? (
                          marginETB < 0 ? (
                            <span className="text-rose-600 dark:text-rose-400">
                              {marginPercent}% Loss
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              +{marginPercent}%
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 select-none">***</span>
                        )}
                      </td>

                      {/* Stock Level */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`text-sm font-bold ${
                              isOutOfStock
                                ? 'text-rose-600 dark:text-rose-400'
                                : isLowStock
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {product.stockQuantity} pcs
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            min {product.minStockThreshold}
                          </span>
                        </div>
                      </td>

                      {/* Warranty */}
                      <td className="py-3.5 px-4 text-center text-xs text-slate-600 dark:text-slate-300">
                        {product.warrantyMonths && product.warrantyMonths > 0 ? (
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {product.warrantyMonths}m
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">None</span>
                        )}
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
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                            title="View Details & Audit"
                            aria-label={`View ${product.name}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canCreateProduct && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(product)}
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md transition-colors"
                                title="Edit Product"
                                aria-label={`Edit ${product.name}`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingProductId(product.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors"
                                title="Delete Product"
                                aria-label={`Delete ${product.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
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

        {/* Pagination bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>Showing {paginatedProducts.length} of {filteredProducts.length} entries</span>
            <div className="flex items-center gap-1 ml-4">
              <span>Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
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
            <span className="px-3 py-1 font-semibold text-slate-700 dark:text-slate-200">
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
              {canCreateProduct ? (
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
              ) : (
                <div />
              )}
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
            {/* Image & Main Specs Header */}
            <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center p-2 shrink-0 shadow-xs">
                {inspectingProduct.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={inspectingProduct.imageUrl}
                    alt={inspectingProduct.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="w-8 h-8 mb-1 opacity-60" />
                    <span className="text-[10px]">No Photo</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 w-full">
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block">
                    Selling Price
                  </span>
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    {formatETB(inspectingProduct.sellingPrice)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block">
                    Cost Price
                  </span>
                  <span className="text-base font-medium text-slate-700 dark:text-slate-200">
                    {canSetCostPrice ? (
                      formatETB(inspectingProduct.costPrice)
                    ) : (
                      <span className="text-slate-400">*** ETB</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block">
                    Gross Margin
                  </span>
                  <span className="text-base font-bold text-[#16845B] dark:text-emerald-400">
                    {canSetCostPrice ? (
                      `+${formatETB(inspectingProduct.sellingPrice - inspectingProduct.costPrice)}`
                    ) : (
                      <span className="text-slate-400">***</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block">
                    Current Stock
                  </span>
                  <span className="text-base font-bold text-[#101827] dark:text-white">
                    {inspectingProduct.stockQuantity} pcs
                  </span>
                </div>
              </div>
            </div>

            {/* Audit Trail Banner (Requirement 8) */}
            <div className="bg-blue-50/60 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  <strong>Created by:</strong> {inspectingProduct.createdBy || 'Authorized Staff'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-[11px]">
                <Clock className="w-3.5 h-3.5" />
                <span>Registered: {formatDate(inspectingProduct.createdAt)}</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Product Overview & Description
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed bg-white dark:bg-[#101726] p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                {inspectingProduct.description || 'No detailed description specified.'}
              </p>
            </div>

            {/* Location & Barcode Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101726] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Store Shelf Location</span>
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {inspectingProduct.location || 'Unassigned'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Dire Dawa Retail Branch
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101726] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Barcode className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  <span>Barcode & SKU Specs</span>
                </div>
                <div className="font-mono text-xs text-slate-900 dark:text-white">
                  SKU: {inspectingProduct.sku}
                </div>
                <div className="font-mono text-xs text-slate-600 dark:text-slate-400">
                  EAN-13: {inspectingProduct.barcode || 'None'}
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Warranty: {inspectingProduct.warrantyMonths || 0} Months Store Warranty
                </div>
              </div>
            </div>

            {/* Serial Numbers Section (Requirement 5) */}
            {inspectingProduct.hasSerials && (
              <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-200">
                    <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Tracked Device Serial Numbers</span>
                  </div>
                  <Badge variant="accent" size="sm">
                    {inspectingProduct.serials?.length || 0} Registered
                  </Badge>
                </div>
                {inspectingProduct.serials && inspectingProduct.serials.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {inspectingProduct.serials.map((s) => (
                      <span
                        key={s.id}
                        className="px-2 py-1 font-mono text-xs bg-white dark:bg-slate-900 rounded border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200"
                      >
                        {s.serialNumber}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    Serial number tracking enabled for future goods receiving.
                  </p>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isAddEditModalOpen}
        onClose={() => !isSubmitting && setIsAddEditModalOpen(false)}
        size="lg"
        title={editingProduct ? 'Edit Product Record' : 'Add New Electronics Product'}
        description="Configure product specifications, live ETB pricing, barcode, opening stock, and warranty."
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          {serverError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title / Model */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Product Title / Model *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Baseus GaN 65W Fast Charger"
                className={`w-full px-3 py-2 text-sm rounded-lg border dark:border-slate-700 dark:bg-slate-900 dark:text-white ${
                  formErrors.name ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
              />
              {formErrors.name && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{formErrors.name}</p>
              )}
            </div>

            {/* SKU (Requirement 1: Auto-generate & editable) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  SKU Code *
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      sku: generateSKU(formData.brand.slice(0, 3) || 'ELE'),
                    })
                  }
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline font-medium flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Auto Generate
                </button>
              </div>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className={`w-full px-3 py-2 text-sm rounded-lg border font-mono dark:border-slate-700 dark:bg-slate-900 dark:text-white ${
                  formErrors.sku ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
              />
              {formErrors.sku && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{formErrors.sku}</p>
              )}
            </div>

            {/* Barcode (Requirement 2: EAN-13 validation & duplicate prevention) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Barcode / EAN-13
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      barcode: generateValidEAN13('600'),
                    })
                  }
                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline font-medium flex items-center gap-1"
                >
                  <Barcode className="w-3 h-3" />
                  Generate Valid EAN-13
                </button>
              </div>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Scan or enter 13-digit barcode"
                className={`w-full px-3 py-2 text-sm rounded-lg border font-mono dark:border-slate-700 dark:bg-slate-900 dark:text-white ${
                  formErrors.barcode || duplicateBarcodeWarning || (barcodeCheck && !barcodeCheck.isValid)
                    ? 'border-rose-500'
                    : barcodeCheck?.isValid
                    ? 'border-emerald-500'
                    : 'border-slate-300 dark:border-slate-700'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
              />

              {/* Barcode Status Helper */}
              {barcodeCheck?.isValid && !duplicateBarcodeWarning && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Valid EAN-13 Checksum Verified
                </p>
              )}
              {barcodeCheck && !barcodeCheck.isValid && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                  {barcodeCheck.error}
                </p>
              )}
              {duplicateBarcodeWarning && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {duplicateBarcodeWarning}
                </p>
              )}
              {formErrors.barcode && !duplicateBarcodeWarning && !barcodeCheck && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                  {formErrors.barcode}
                </p>
              )}
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Brand *
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g. Anker, Oraimo, Samsung, Apple"
                className={`w-full px-3 py-2 text-sm rounded-lg border dark:border-slate-700 dark:bg-slate-900 dark:text-white ${
                  formErrors.brand ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
              />
              {formErrors.brand && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{formErrors.brand}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Cost Price (Requirement 7: Role Authorization Guard) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Cost Price (ETB) *
                </label>
                {!canSetCostPrice && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Admin/Manager only
                  </span>
                )}
              </div>
              <input
                type="number"
                min="0"
                step="any"
                disabled={!canSetCostPrice}
                value={formData.costPrice || ''}
                onChange={(e) =>
                  setFormData({ ...formData, costPrice: Math.max(0, Number(e.target.value)) })
                }
                placeholder="0.00"
                className={`w-full px-3 py-2 text-sm rounded-lg border dark:border-slate-700 dark:bg-slate-900 dark:text-white ${
                  !canSetCostPrice ? 'bg-slate-100 dark:bg-slate-800 cursor-not-allowed text-slate-500' : ''
                } ${
                  formErrors.costPrice ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
              />
              {formErrors.costPrice && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{formErrors.costPrice}</p>
              )}
            </div>

            {/* Selling Price */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Selling Price (ETB) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.sellingPrice || ''}
                onChange={(e) =>
                  setFormData({ ...formData, sellingPrice: Math.max(0, Number(e.target.value)) })
                }
                placeholder="0.00"
                className={`w-full px-3 py-2 text-sm rounded-lg border dark:border-slate-700 dark:bg-slate-900 dark:text-white ${
                  formErrors.sellingPrice ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors`}
              />
              {formErrors.sellingPrice && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{formErrors.sellingPrice}</p>
              )}
            </div>

            {/* Live Pricing & Margin Calculations (Requirement 3) */}
            <div
              className={`sm:col-span-2 p-3.5 rounded-lg border transition-colors ${
                isSellingBelowCost
                  ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                  : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200/70 dark:border-emerald-900/60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-600 dark:text-slate-300">Live Gross Profit:</span>
                  <strong
                    className={`ml-1 text-sm font-bold ${
                      liveGrossProfit < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {formatETB(liveGrossProfit)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-300">Gross Margin:</span>
                  <strong
                    className={`ml-1 text-sm font-bold ${
                      liveGrossMarginPercent < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {liveGrossMarginPercent.toFixed(1)}%
                  </strong>
                </div>
                <div>
                  <span className="text-slate-600 dark:text-slate-300">Markup Rate:</span>
                  <strong
                    className={`ml-1 text-sm font-bold ${
                      liveMarkupPercent < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {liveMarkupPercent.toFixed(1)}%
                  </strong>
                </div>
              </div>

              {/* Selling Price Below Cost Flag & Acknowledgment */}
              {isSellingBelowCost && (
                <div className="mt-2.5 pt-2 border-t border-rose-200 dark:border-rose-800/80 text-xs text-rose-800 dark:text-rose-300">
                  <div className="flex items-start gap-1.5 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>
                      FLAG: Selling price is below unit cost! Loss of {formatETB(Math.abs(liveGrossProfit))} per unit.
                    </span>
                  </div>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer font-medium">
                    <input
                      type="checkbox"
                      checked={formData.confirmBelowCost}
                      onChange={(e) =>
                        setFormData({ ...formData, confirmBelowCost: e.target.checked })
                      }
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <span>
                      Acknowledge selling below cost (Loss Leader / Clearance sale)
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Opening Stock (Requirement 4: Saved atomically as ledger transaction) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Opening Stock Quantity *
              </label>
              <input
                type="number"
                min="0"
                value={formData.stockQuantity}
                onChange={(e) =>
                  setFormData({ ...formData, stockQuantity: Math.max(0, Number(e.target.value)) })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Saved atomically as an immutable initial stock ledger movement.
              </p>
            </div>

            {/* Min Threshold */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Low Stock Threshold *
              </label>
              <input
                type="number"
                min="0"
                value={formData.minStockThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, minStockThreshold: Math.max(0, Number(e.target.value)) })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white transition-colors"
              />
            </div>

            {/* Warranty (Requirement 5) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Store Warranty Duration (Months)
              </label>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {[0, 3, 6, 12, 24].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFormData({ ...formData, warrantyMonths: m })}
                    className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                      formData.warrantyMonths === m
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    {m === 0 ? 'No Warranty' : `${m} Months`}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="0"
                value={formData.warrantyMonths}
                onChange={(e) =>
                  setFormData({ ...formData, warrantyMonths: Math.max(0, Number(e.target.value)) })
                }
                placeholder="Custom months"
                className="w-full sm:w-48 px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white transition-colors"
              />
            </div>

            {/* Device Serial Numbers (Requirement 5) */}
            <div className="sm:col-span-2 p-3.5 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <label className="text-xs font-semibold text-purple-950 dark:text-purple-200 cursor-pointer">
                    Track Individual Device Serial Numbers (IMEI / Serial)
                  </label>
                </div>
                <input
                  type="checkbox"
                  checked={formData.hasSerials}
                  onChange={(e) => setFormData({ ...formData, hasSerials: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
              </div>

              {formData.hasSerials && (
                <div className="space-y-2 mt-2">
                  <textarea
                    rows={2}
                    value={formData.serialNumbersText}
                    onChange={(e) =>
                      setFormData({ ...formData, serialNumbersText: e.target.value })
                    }
                    placeholder="Enter serial numbers separated by newlines or commas (e.g. SN1001, SN1002)..."
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-purple-200 dark:border-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:bg-slate-900 dark:text-white"
                  />
                  <div className="flex items-center justify-between text-[11px] text-purple-700 dark:text-purple-300">
                    <span>
                      {parsedSerials.length} serials entered (Initial stock: {formData.stockQuantity})
                    </span>
                    {formData.stockQuantity > 0 && parsedSerials.length !== formData.stockQuantity && (
                      <span className="text-amber-600 dark:text-amber-400">
                        {parsedSerials.length < formData.stockQuantity
                          ? `Optional: ${formData.stockQuantity - parsedSerials.length} more serials can be added`
                          : `Note: ${parsedSerials.length} serials entered for ${formData.stockQuantity} stock`}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Image Upload (Requirement 6) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Product Photo (Stored & URL saved in database)
              </label>

              {formData.imageUrl ? (
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.imageUrl}
                    alt="Product preview"
                    className="w-16 h-16 rounded-lg object-cover border border-slate-300 dark:border-slate-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate">
                      {formData.imageUrl}
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                      ✓ Image ready for catalog
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, imageUrl: '' })}
                    leftIcon={<X className="w-3.5 h-3.5 text-rose-500" />}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="product-image-upload"
                  />
                  <label
                    htmlFor="product-image-upload"
                    className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                      isUploadingImage
                        ? 'border-blue-400 bg-blue-50/30'
                        : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-900/40'
                    }`}
                  >
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isUploadingImage ? 'Uploading product photo...' : 'Click to upload product image'}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      JPEG, PNG, WEBP or GIF (max 5MB)
                    </span>
                  </label>
                  {uploadError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{uploadError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Location in Shop */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Shelf / Counter Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Shelf A-01, Showcase B"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white transition-colors"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Catalog Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="active">Active (Available for POS)</option>
                <option value="inactive">Inactive (Hidden from POS)</option>
              </select>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Product Description & Notes
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tech specs, compatibility, and packaging details"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-white transition-colors"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setIsAddEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
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
        message="This action will deactivate this item from Nasir Amme Electronics catalog and inventory tables. It preserves historical sales receipts and audit trails."
        confirmLabel="Deactivate Product"
        variant="danger"
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title={`Deactivate & Remove ${selectedProductIds.size} Products?`}
        message="This action will remove the selected products from catalog and inventory listings while safely preserving sales history and ledger entries. Are you sure you wish to continue?"
        confirmLabel={isBulkDeleting ? 'Deleting...' : `Deactivate ${selectedProductIds.size} Products`}
        variant="danger"
      />

      {/* Bulk Product Import Modal */}
      {isImportModalOpen && (
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          size="lg"
          title="Bulk Product Import Wizard"
          description="Import products via RFC-4180 CSV or JSON format with automatic SKU & barcode validation."
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-xl text-xs text-blue-900 dark:text-blue-200">
              <span>
                Required columns: <strong>name, sellingPrice</strong>. Optional: <strong>sku, barcode, brand, category, costPrice, stockQuantity, location</strong>.
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
                onChange={(e) => parseProductsInput(e.target.value)}
                placeholder="Paste CSV with header row or JSON array..."
                className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>

            {parsedProducts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">
                    Validation Staging Preview ({parsedProducts.length} items parsed)
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Valid: <strong className="text-emerald-600 dark:text-emerald-400">{parsedProducts.filter((p) => p.isValid).length}</strong> • 
                    Invalid: <strong className="text-rose-600 dark:text-rose-400">{parsedProducts.filter((p) => !p.isValid).length}</strong>
                  </span>
                </div>

                <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2 px-3">Product Name</th>
                        <th className="py-2 px-3">SKU</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3 text-right">Selling (ETB)</th>
                        <th className="py-2 px-3 text-center">Stock</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                      {parsedProducts.map((p, idx) => (
                        <tr key={idx} className={p.isValid ? 'text-slate-700 dark:text-slate-300' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300'}>
                          <td className="py-2 px-3 font-semibold">{p.name || '—'}</td>
                          <td className="py-2 px-3 font-mono text-[11px]">{p.sku}</td>
                          <td className="py-2 px-3">{p.category}</td>
                          <td className="py-2 px-3 text-right font-medium">{formatETB(p.sellingPrice)}</td>
                          <td className="py-2 px-3 text-center">{p.stockQuantity}</td>
                          <td className="py-2 px-3">
                            {p.isValid ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                                <CheckCircle2 className="w-3 h-3" /> Ready
                              </span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400 font-mono text-[10px]">{p.error}</span>
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
                variant="primary"
                disabled={isImporting || parsedProducts.filter((p) => p.isValid).length === 0}
                isLoading={isImporting}
                onClick={handleCommitImport}
              >
                Commit Import ({parsedProducts.filter((p) => p.isValid).length} Valid Products)
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
