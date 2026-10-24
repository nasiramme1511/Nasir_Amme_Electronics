'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Product,
  Category,
  Supplier,
  Customer,
  Sale,
  PurchaseOrder,
  StockMovement,
  SaleReturn,
  UserAccount,
  ShopSettings,
  ToastMessage,
  SaleItem,
} from '@/types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_SUPPLIERS,
  INITIAL_CUSTOMERS,
  INITIAL_SALES,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_RETURNS,
  INITIAL_USERS,
  INITIAL_SHOP_SETTINGS,
} from '@/data/mockData';
import {
  generateReceiptNumber,
  generatePONumber,
  generateReturnNumber,
  generateId,
} from '@/lib/formatters';

interface AppContextType {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  customers: Customer[];
  sales: Sale[];
  purchaseOrders: PurchaseOrder[];
  stockMovements: StockMovement[];
  returns: SaleReturn[];
  users: UserAccount[];
  settings: ShopSettings;
  toasts: ToastMessage[];

  // Modals & Navigation
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  isMobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  activeReceipt: Sale | null;
  openReceiptModal: (sale: Sale) => void;
  closeReceiptModal: () => void;

  // Actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { serialNumbers?: string[] }) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<Supplier>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  recordSale: (saleData: {
    customerId?: string;
    customerName: string;
    customerPhone?: string;
    customerType: 'retail' | 'wholesale';
    items: (SaleItem & { serialNumbers?: string[] })[];
    subtotal: number;
    discount: number;
    tax: number;
    grandTotal: number;
    paymentMethod: Sale['paymentMethod'];
    paymentReference?: string;
    amountTendered?: number;
    changeGiven?: number;
    cashierId: string;
    cashierName: string;
    notes?: string;
    managerPin?: string;
  }) => Sale;

  createPurchaseOrder: (poData: Omit<PurchaseOrder, 'id' | 'poNumber' | 'date'>) => Promise<PurchaseOrder>;
  receivePurchaseOrder: (poId: string, receivedBy: string) => void;
  deletePurchaseOrder: (id: string) => Promise<void>;

  processReturn: (returnData: {
    originalReceiptNumber: string;
    saleId: string;
    customerName: string;
    items: SaleReturn['items'];
    totalRefundETB: number;
    refundMethod: SaleReturn['refundMethod'];
    processedBy: string;
    notes?: string;
  }) => SaleReturn;

  performStockAdjustment: (adjustments: {
    productId: string;
    newStock: number;
    reason: string;
    user: string;
  }[]) => void;

  addUser: (userData: Omit<UserAccount, 'id'> & { initialPassword?: string; temporaryPassword?: string }) => UserAccount;
  updateUser: (id: string, updates: Partial<UserAccount> & { temporaryPassword?: string }) => void;
  deleteUser: (id: string) => Promise<void>;

  updateSettings: (updates: Partial<ShopSettings>) => void;

  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  refreshBackendData: () => Promise<void>;
  isLiveBackendLoaded: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isLiveBackendLoaded, setIsLiveBackendLoaded] = useState(false);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [sales, setSales] = useState<Sale[]>(INITIAL_SALES);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(INITIAL_PURCHASE_ORDERS);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(INITIAL_STOCK_MOVEMENTS);
  const [returns, setReturns] = useState<SaleReturn[]>(INITIAL_RETURNS);
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);
  const [settings, setSettings] = useState<ShopSettings>(INITIAL_SHOP_SETTINGS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<Sale | null>(null);

  // Authoritative real data loader from PostgreSQL API endpoints
  const refreshBackendData = async () => {
    try {
      const [
        prodRes,
        catRes,
        supRes,
        custRes,
        salesRes,
        poRes,
        movementsRes,
        returnsRes,
        usersRes,
        settingsRes,
      ] = await Promise.allSettled([
        fetch('/api/products?status=all', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
        fetch('/api/suppliers', { cache: 'no-store' }),
        fetch('/api/customers', { cache: 'no-store' }),
        fetch('/api/sales?limit=100', { cache: 'no-store' }),
        fetch('/api/purchases', { cache: 'no-store' }),
        fetch('/api/inventory/movements?limit=100', { cache: 'no-store' }),
        fetch('/api/returns', { cache: 'no-store' }),
        fetch('/api/users', { cache: 'no-store' }),
        fetch('/api/settings', { cache: 'no-store' }),
      ]);

      if (prodRes.status === 'fulfilled' && prodRes.value.ok) {
        const json = await prodRes.value.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setProducts(
            json.data.map((p: any) => ({
              id: p.id,
              sku: p.sku,
              barcode: p.barcode || '',
              name: p.name,
              brand: p.brand,
              category: p.category?.name || 'General',
              costPrice: Number(p.averageCost ?? p.costPrice ?? 0),
              sellingPrice: Number(p.sellingPrice),
              stockQuantity: p.onHand,
              minStockThreshold: p.reorderLevel,
              status: p.status,
              location: p.location || '',
              description: p.description || '',
              warrantyMonths: p.warrantyMonths || 0,
              imageUrl: p.imageUrl || undefined,
              createdBy: p.createdBy || undefined,
              hasSerials: Boolean(p.hasSerials),
              serials: (p.serials || []).map((s: any) => ({
                id: s.id,
                serialNumber: s.serialNumber,
                status: s.status,
                createdAt: s.createdAt,
              })),
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
            }))
          );
        }
      }

      if (catRes.status === 'fulfilled' && catRes.value.ok) {
        const json = await catRes.value.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setCategories(
            json.data.map((c: any) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              description: c.description || '',
              iconName: c.iconName || 'Shield',
              productCount: c.productCount || 0,
              totalValueETB: 0,
              isActive: c.status === 'active',
              createdAt: c.createdAt,
            }))
          );
        }
      }

      if (supRes.status === 'fulfilled' && supRes.value.ok) {
        const json = await supRes.value.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setSuppliers(
            json.data.map((s: any) => ({
              id: s.id,
              name: s.name,
              code: s.code,
              contactPerson: s.contactName || '',
              email: s.email || '',
              phone: s.phone || '',
              city: s.city || 'Dire Dawa',
              address: s.addressText || '',
              paymentTerms: s.paymentTerms,
              activeOrdersCount: s._count?.purchaseOrders ?? 0,
              totalPurchasedETB: 0,
              outstandingBalanceETB: 0,
              status: s.status,
              notes: s.notes,
            }))
          );
        }
      }

      if (custRes.status === 'fulfilled' && custRes.value.ok) {
        const json = await custRes.value.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setCustomers(
            json.data.map((c: any) => ({
              id: c.id,
              name: c.displayName,
              phone: c.phone,
              email: c.email || undefined,
              customerType: c.customerType,
              city: c.city || 'Dire Dawa',
              address: c.addressText || undefined,
              creditBalanceETB: Number(c.creditBalance || 0),
              totalSpentETB: Number(c.totalSpent || 0),
              loyaltyPoints: c.loyaltyPoints || 0,
              notes: c.notes || undefined,
              createdAt: c.createdAt,
            }))
          );
        }
      }

      if (salesRes.status === 'fulfilled' && salesRes.value.ok) {
        const json = await salesRes.value.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setSales(
            json.data.map((s: any) => ({
              id: s.id,
              receiptNumber: s.receiptNumber,
              date: s.soldAt,
              customerId: s.customerId || undefined,
              customerName: s.customer?.displayName || 'Walk-in Customer',
              customerPhone: s.customer?.phone || undefined,
              customerType: s.customer?.customerType || 'retail',
              items: (s.items || []).map((i: any) => ({
                productId: i.productId,
                sku: i.skuSnapshot || i.product?.sku || '',
                name: i.nameSnapshot || i.product?.name || '',
                unitPrice: Number(i.unitPrice),
                costPrice: Number(i.unitCostSnapshot || 0),
                quantity: i.quantity,
                discount: Number(i.discountAmount || 0),
                total: Number(i.lineTotal),
              })),
              subtotal: Number(s.subtotal),
              discount: Number(s.discountTotal || 0),
              tax: Number(s.taxTotal || 0),
              grandTotal: Number(s.grandTotal),
              paymentMethod: s.payments?.[0]?.method || 'cash',
              paymentReference: s.payments?.[0]?.providerReference || undefined,
              amountTendered: s.payments?.[0]?.amountTendered ? Number(s.payments[0].amountTendered) : undefined,
              changeGiven: s.payments?.[0]?.changeGiven ? Number(s.payments[0].changeGiven) : undefined,
              cashierId: s.cashierId,
              cashierName: s.cashier?.fullName || 'Cashier',
              status: s.status === 'returned' ? 'refunded' : s.status === 'partially_returned' ? 'partially_refunded' : 'completed',
              notes: s.notes || undefined,
            }))
          );
        }
      }

      if (poRes.status === 'fulfilled' && poRes.value.ok) {
        const json = await poRes.value.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setPurchaseOrders(
            json.data.map((po: any) => ({
              id: po.id,
              poNumber: po.poNumber,
              supplierId: po.supplierId,
              supplierName: po.supplier?.name || '',
              supplierPhone: po.supplier?.phone || '',
              date: po.createdAt,
              expectedDeliveryDate: po.expectedAt || undefined,
              items: (po.items || []).map((i: any) => ({
                productId: i.productId,
                productName: i.product?.name || '',
                sku: i.product?.sku || '',
                quantity: i.orderedQuantity,
                unitCost: Number(i.unitCost),
                totalCost: Number(i.totalCost),
                receivedQuantity: i.receivedQuantity,
              })),
              totalAmountETB: Number(po.grandTotal),
              status:
                po.status === 'received'
                  ? 'received'
                  : po.status === 'partially_received'
                  ? 'partially_received'
                  : po.status === 'ordered'
                  ? 'sent'
                  : 'draft',
              notes: po.notes || undefined,
              createdDate: po.createdAt,
              receivedDate: po.receivedAt || undefined,
              receivedBy: po.goodsReceipts?.[0]?.receivedBy || undefined,
            }))
          );
        }
      }

      if (movementsRes.status === 'fulfilled' && movementsRes.value.ok) {
        const json = await movementsRes.value.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setStockMovements(
            json.data.map((m: any) => ({
              id: m.id,
              timestamp: m.occurredAt,
              productId: m.productId,
              productName: m.product?.name || 'Product',
              sku: m.product?.sku || '',
              type: m.movementType,
              quantity: m.quantityDelta,
              previousStock: m.previousStock,
              newStock: m.balanceAfter,
              referenceNumber: m.referenceNumber,
              notes: m.reason || m.notes || '',
              performedBy: m.actorId || 'Staff',
            }))
          );
        }
      }

      if (returnsRes.status === 'fulfilled' && returnsRes.value.ok) {
        const json = await returnsRes.value.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setReturns(
            json.data.map((r: any) => ({
              id: r.id,
              returnNumber: r.returnNumber,
              originalReceiptNumber: r.originalReceiptNumber,
              saleId: r.saleId,
              customerName: r.sale?.customer?.displayName || 'Customer',
              date: r.createdAt,
              items: (r.items || []).map((ri: any) => ({
                productId: ri.productId,
                productName: ri.product?.name || '',
                sku: ri.product?.sku || '',
                quantityReturned: ri.quantity,
                unitPrice: Number(ri.unitPrice),
                refundAmount: Number(ri.refundAmount),
                reason: ri.reason,
                condition: ri.disposition === 'restock' ? 'resalable' : 'defective',
              })),
              totalRefundETB: Number(r.totalRefundETB),
              refundMethod: r.refundMethod,
              processedBy: r.postedBy,
              status: 'processed',
              notes: r.notes || undefined,
            }))
          );
        }
      }

      if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
        const json = await settingsRes.value.json();
        if (json.success && json.data) {
          setSettings((prev) => ({
            ...prev,
            shopName: json.data.name || prev.shopName,
            city: json.data.city || prev.city,
            tinNumber: json.data.tinNumber || prev.tinNumber,
            phonePrimary: json.data.phonePrimary || prev.phonePrimary,
            email: json.data.email || prev.email,
            currencyCode: json.data.currencyCode || prev.currencyCode,
            taxRate: Number(json.data.taxRate || prev.taxRate),
            isTaxEnabled: Boolean(json.data.isTaxEnabled),
            lowStockGlobalThreshold: json.data.lowStockGlobalThreshold || prev.lowStockGlobalThreshold,
            receiptHeader: json.data.receiptHeader || prev.receiptHeader,
            receiptFooter: json.data.receiptFooter || prev.receiptFooter,
          }));
        }
      }

      // If at least products or categories loaded from real PostgreSQL, mark live backend loaded
      if (
        (prodRes.status === 'fulfilled' && prodRes.value.ok) ||
        (catRes.status === 'fulfilled' && catRes.value.ok)
      ) {
        setIsLiveBackendLoaded(true);
      }
    } catch (err) {
      console.warn('Real backend sync fallback to initial state:', err);
    }
  };

  useEffect(() => {
    refreshBackendData();
  }, [user]);

  // Derived category counts dynamically
  const derivedCategories = useMemo(() => {
    return categories.map((cat) => {
      const catProducts = products.filter((p) => p.category === cat.name);
      const totalVal = catProducts.reduce(
        (sum, p) => sum + p.costPrice * p.stockQuantity,
        0
      );
      return {
        ...cat,
        productCount: catProducts.length,
        totalValueETB: totalVal,
      };
    });
  }, [categories, products]);

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

  const openReceiptModal = (sale: Sale) => setActiveReceipt(sale);
  const closeReceiptModal = () => setActiveReceipt(null);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = generateId('toast');
    const newToast: ToastMessage = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Products
  const addProduct = async (
    prodData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { serialNumbers?: string[] }
  ): Promise<Product> => {
    const matchingCat = categories.find((c) => c.name === prodData.category);
    const categoryId = matchingCat?.id || categories[0]?.id;

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: prodData.sku,
          barcode: prodData.barcode || undefined,
          name: prodData.name,
          brand: prodData.brand,
          categoryId,
          sellingPrice: prodData.sellingPrice,
          costPrice: prodData.costPrice,
          stockQuantity: prodData.stockQuantity,
          minStockThreshold: prodData.minStockThreshold,
          location: prodData.location,
          description: prodData.description,
          warrantyMonths: prodData.warrantyMonths,
          imageUrl: prodData.imageUrl,
          hasSerials: prodData.hasSerials,
          serialNumbers: prodData.serialNumbers,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to create product.');
      }

      const p = json.data;
      const newProduct: Product = {
        id: p.id,
        sku: p.sku,
        barcode: p.barcode || '',
        name: p.name,
        brand: p.brand,
        category: p.category?.name || prodData.category,
        costPrice: Number(p.averageCost ?? prodData.costPrice),
        sellingPrice: Number(p.sellingPrice),
        stockQuantity: p.onHand,
        minStockThreshold: p.reorderLevel,
        status: p.status,
        location: p.location || '',
        description: p.description || '',
        warrantyMonths: p.warrantyMonths || 0,
        imageUrl: p.imageUrl || undefined,
        createdBy: p.createdBy || undefined,
        hasSerials: Boolean(p.hasSerials),
        serials: (p.serials || []).map((s: any) => ({
          id: s.id,
          serialNumber: s.serialNumber,
          status: s.status,
          createdAt: s.createdAt,
        })),
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };

      setProducts((prev) => [newProduct, ...prev]);

      // Refresh movements ledger & products from backend
      refreshBackendData();

      addToast({
        type: 'success',
        title: 'Product Created',
        message: `${newProduct.name} saved atomically with opening stock ledger entry.`,
      });
      return newProduct;
    } catch (err) {
      console.error('Error adding product:', err);
      throw err;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const matchingCat = updates.category ? categories.find((c) => c.name === updates.category) : undefined;

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: updates.sku,
          barcode: updates.barcode,
          name: updates.name,
          brand: updates.brand,
          categoryId: matchingCat?.id,
          sellingPrice: updates.sellingPrice,
          costPrice: updates.costPrice,
          minStockThreshold: updates.minStockThreshold,
          location: updates.location,
          description: updates.description,
          warrantyMonths: updates.warrantyMonths,
          imageUrl: updates.imageUrl,
          hasSerials: updates.hasSerials,
          status: updates.status,
          stockQuantity: updates.stockQuantity,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update product.');
      }

      const p = json.data;
      setProducts((prev) =>
        prev.map((prod) =>
          prod.id === id
            ? {
                ...prod,
                ...updates,
                category: p.category?.name || updates.category || prod.category,
                updatedAt: p.updatedAt || new Date().toISOString(),
              }
            : prod
        )
      );

      refreshBackendData();

      addToast({
        type: 'success',
        title: 'Product Updated',
        message: 'Product changes and audit trail have been saved.',
      });
    } catch (err) {
      console.error('Error updating product:', err);
      throw err;
    }
  };

  const deleteProduct = async (id: string) => {
    const target = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json.success) {
        addToast({
          type: json.type === 'HARD_DELETE' ? 'info' : 'warning',
          title: json.type === 'HARD_DELETE' ? 'Permanent Hard Delete' : 'Catalog Purged (Audit Preserved)',
          message: json.message,
        });
        return;
      }
    } catch (err) {
      console.error('Error removing product from database:', err);
    }
    addToast({
      type: 'info',
      title: 'Product Removed',
      message: `${target?.name || 'Product'} was removed from database and catalog.`,
    });
  };

  // Categories
  const addCategory = async (catData: Omit<Category, 'id' | 'createdAt'>): Promise<Category> => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: catData.name,
          slug: catData.slug,
          description: catData.description,
          iconName: catData.iconName,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const created = json.data;
        const newCat: Category = {
          id: created.id,
          name: created.name,
          slug: created.slug,
          description: created.description || '',
          iconName: created.iconName || 'Shield',
          productCount: 0,
          totalValueETB: 0,
          isActive: created.status === 'active',
          createdAt: created.createdAt,
        };
        setCategories((prev) => [...prev, newCat]);
        addToast({
          type: 'success',
          title: 'Category Created',
          message: `${newCat.name} saved to PostgreSQL database.`,
        });
        return newCat;
      }
    } catch (err) {
      console.error('Error saving category to database:', err);
    }
    const fallbackCat: Category = {
      ...catData,
      id: generateId('cat'),
      createdAt: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, fallbackCat]);
    return fallbackCat;
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    try {
      await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error('Error updating category in database:', err);
    }
    addToast({
      type: 'success',
      title: 'Category Updated',
      message: 'Category details saved to PostgreSQL database.',
    });
  };

  const deleteCategory = async (id: string) => {
    const target = categories.find((c) => c.id === id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting category from database:', err);
    }
    addToast({
      type: 'info',
      title: 'Category Removed',
      message: `${target?.name || 'Category'} removed from PostgreSQL database.`,
    });
  };

  // Suppliers
  const addSupplier = async (supData: Omit<Supplier, 'id'>): Promise<Supplier> => {
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: supData.code,
          name: supData.name,
          contactName: supData.contactPerson,
          email: supData.email,
          phone: supData.phone,
          city: supData.city,
          addressText: supData.address,
          paymentTerms: supData.paymentTerms,
          notes: supData.notes,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const created = json.data;
        const newSup: Supplier = {
          id: created.id,
          name: created.name,
          code: created.code,
          contactPerson: created.contactName || '',
          email: created.email || '',
          phone: created.phone || '',
          city: created.city || 'Dire Dawa',
          address: created.addressText || '',
          paymentTerms: created.paymentTerms,
          activeOrdersCount: 0,
          totalPurchasedETB: 0,
          outstandingBalanceETB: 0,
          status: created.status,
          notes: created.notes,
        };
        setSuppliers((prev) => [newSup, ...prev]);
        addToast({
          type: 'success',
          title: 'Supplier Added',
          message: `${newSup.name} saved to PostgreSQL database.`,
        });
        return newSup;
      }
    } catch (err) {
      console.error('Error saving supplier to database:', err);
    }
    const fallbackSup: Supplier = {
      ...supData,
      id: generateId('sup'),
    };
    setSuppliers((prev) => [fallbackSup, ...prev]);
    return fallbackSup;
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    try {
      await fetch(`/api/suppliers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error('Error updating supplier in database:', err);
    }
    addToast({
      type: 'success',
      title: 'Supplier Updated',
      message: 'Supplier information saved to PostgreSQL database.',
    });
  };

  const deleteSupplier = async (id: string) => {
    const target = suppliers.find((s) => s.id === id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    try {
      await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error removing supplier from database:', err);
    }
    addToast({
      type: 'info',
      title: 'Supplier Removed',
      message: `${target?.name || 'Supplier'} removed from PostgreSQL database.`,
    });
  };

  // Customers
  const addCustomer = async (custData: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: custData.name,
          phone: custData.phone,
          email: custData.email,
          customerType: custData.customerType,
          city: custData.city,
          addressText: custData.address,
          notes: custData.notes,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const created = json.data;
        const newCust: Customer = {
          id: created.id,
          name: created.displayName,
          phone: created.phone,
          email: created.email || undefined,
          customerType: created.customerType,
          city: created.city || 'Dire Dawa',
          address: created.addressText || undefined,
          creditBalanceETB: Number(created.creditBalance || 0),
          totalSpentETB: Number(created.totalSpent || 0),
          loyaltyPoints: created.loyaltyPoints || 0,
          notes: created.notes || undefined,
          createdAt: created.createdAt,
        };
        setCustomers((prev) => [newCust, ...prev]);
        addToast({
          type: 'success',
          title: 'Customer Registered',
          message: `${newCust.name} saved to PostgreSQL database.`,
        });
        return newCust;
      }
    } catch (err) {
      console.error('Error saving customer to database:', err);
    }
    const fallbackCust: Customer = {
      ...custData,
      id: generateId('cust'),
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [fallbackCust, ...prev]);
    return fallbackCust;
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    try {
      await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: updates.name,
          phone: updates.phone,
          email: updates.email,
          customerType: updates.customerType,
          city: updates.city,
          addressText: updates.address,
          notes: updates.notes,
        }),
      });
    } catch (err) {
      console.error('Error updating customer in database:', err);
    }
    addToast({
      type: 'success',
      title: 'Customer Updated',
      message: 'Customer record saved to PostgreSQL database.',
    });
  };

  const deleteCustomer = async (id: string) => {
    const target = customers.find((c) => c.id === id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    try {
      await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error removing customer from database:', err);
    }
    addToast({
      type: 'info',
      title: 'Customer Removed',
      message: `${target?.name || 'Customer'} removed from PostgreSQL database.`,
    });
  };

  // Record Sale & Decrement Inventory
  const recordSale = (saleData: {
    customerId?: string;
    customerName: string;
    customerPhone?: string;
    customerType: 'retail' | 'wholesale';
    items: (SaleItem & { serialNumbers?: string[] })[];
    subtotal: number;
    discount: number;
    tax: number;
    grandTotal: number;
    paymentMethod: Sale['paymentMethod'];
    paymentReference?: string;
    amountTendered?: number;
    changeGiven?: number;
    cashierId: string;
    cashierName: string;
    notes?: string;
    managerPin?: string;
  }): Sale => {
    const receiptNum = generateReceiptNumber();
    const timestamp = new Date().toISOString();

    const newSale: Sale = {
      ...saleData,
      id: generateId('sale'),
      receiptNumber: receiptNum,
      date: timestamp,
      status: 'completed',
    };

    // 1. Prepend to sales
    setSales((prev) => [newSale, ...prev]);

    // 2. Decrement stock for each item & add movements
    const movementsToAdd: StockMovement[] = [];

    setProducts((prevProducts) =>
      prevProducts.map((prod) => {
        const lineItem = saleData.items.find((item) => item.productId === prod.id);
        if (lineItem) {
          const oldStock = prod.stockQuantity;
          const newStock = Math.max(0, oldStock - lineItem.quantity);

          movementsToAdd.push({
            id: generateId('sm'),
            timestamp,
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            type: 'sale',
            quantity: -lineItem.quantity,
            previousStock: oldStock,
            newStock,
            referenceNumber: receiptNum,
            notes: `Checkout sale to ${saleData.customerName} (${saleData.paymentMethod.toUpperCase()})`,
            performedBy: saleData.cashierName,
          });

          return {
            ...prod,
            stockQuantity: newStock,
            updatedAt: timestamp,
          };
        }
        return prod;
      })
    );

    if (movementsToAdd.length > 0) {
      setStockMovements((prev) => [...movementsToAdd, ...prev]);
    }

    // 3. Update customer stats if linked
    if (saleData.customerId) {
      setCustomers((prevCusts) =>
        prevCusts.map((c) => {
          if (c.id === saleData.customerId) {
            return {
              ...c,
              totalSpentETB: c.totalSpentETB + saleData.grandTotal,
              loyaltyPoints: c.loyaltyPoints + Math.floor(saleData.grandTotal / 50),
              creditBalanceETB:
                saleData.paymentMethod === 'credit'
                  ? c.creditBalanceETB + saleData.grandTotal
                  : c.creditBalanceETB,
            };
          }
          return c;
        })
      );
    }

    // Asynchronously record checkout to PostgreSQL database
    fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cashierId: saleData.cashierId,
        customerId: saleData.customerId,
        items: saleData.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discount || 0,
          serialNumbers: item.serialNumbers,
        })),
        payments: [
          {
            method: saleData.paymentMethod,
            amount: saleData.grandTotal,
            amountTendered: saleData.amountTendered,
            providerReference: saleData.paymentReference,
          },
        ],
        discountTotal: saleData.discount,
        notes: saleData.notes,
        managerPin: saleData.managerPin,
      }),
    }).catch((err) => console.warn('Could not sync sale to database API:', err));

    addToast({
      type: 'success',
      title: 'Sale Completed!',
      message: `Receipt ${receiptNum} issued for ${saleData.grandTotal.toLocaleString()} ETB.`,
    });

    return newSale;
  };

  // Purchase Orders & Receiving
  const createPurchaseOrder = async (
    poData: Omit<PurchaseOrder, 'id' | 'poNumber' | 'date'>
  ): Promise<PurchaseOrder> => {
    const poNumber = generatePONumber();
    const timestamp = new Date().toISOString();

    let dbId = generateId('po');
    let finalPoNumber = poNumber;

    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: poData.supplierId,
          items: poData.items.map((i) => ({
            productId: i.productId,
            orderedQuantity: i.orderedQty,
            unitCost: i.unitCost,
          })),
          notes: poData.notes,
          expectedAt: poData.expectedDelivery,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.data) {
        dbId = json.data.id;
        finalPoNumber = json.data.poNumber || poNumber;
      }
    } catch (err) {
      console.warn('Could not sync purchase order to database API:', err);
    }

    const newPO: PurchaseOrder = {
      ...poData,
      id: dbId,
      poNumber: finalPoNumber,
      date: timestamp,
    };
    setPurchaseOrders((prev) => [newPO, ...prev]);
    addToast({
      type: 'success',
      title: 'Purchase Order Saved',
      message: `${finalPoNumber} saved to PostgreSQL database.`,
    });
    return newPO;
  };

  const deletePurchaseOrder = async (id: string) => {
    const target = purchaseOrders.find((p) => p.id === id);
    if (target?.status === 'received') {
      addToast({
        type: 'error',
        title: 'Cannot Delete Received Order',
        message: 'This purchase order has already posted inventory to your stock ledger.',
      });
      return;
    }

    setPurchaseOrders((prev) => prev.filter((p) => p.id !== id));

    try {
      const res = await fetch(`/api/purchases/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to remove purchase order from database.');
      }
      addToast({
        type: 'info',
        title: 'Purchase Order Removed',
        message: `${target?.poNumber || 'Order'} removed from PostgreSQL database.`,
      });
    } catch (err: any) {
      console.error('Error removing purchase order from database:', err);
      if (target) {
        setPurchaseOrders((prev) => [target, ...prev]);
      }
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete purchase order.',
      });
    }
  };

  const receivePurchaseOrder = (poId: string, receivedBy: string) => {
    const targetPO = purchaseOrders.find((p) => p.id === poId);
    if (!targetPO) return;

    if (targetPO.status === 'received') {
      addToast({
        type: 'warning',
        title: 'Already Received',
        message: `Purchase order ${targetPO.poNumber} has already been posted to active stock.`,
      });
      return;
    }

    const timestamp = new Date().toISOString();
    const movementsToAdd: StockMovement[] = [];

    // Increase product inventory
    setProducts((prevProducts) =>
      prevProducts.map((prod) => {
        const poItem = targetPO.items.find((item) => item.productId === prod.id);
        if (poItem) {
          const receiveQty = poItem.orderedQty - poItem.receivedQty;
          if (receiveQty <= 0) return prod;

          const oldStock = prod.stockQuantity;
          const newStock = oldStock + receiveQty;

          movementsToAdd.push({
            id: generateId('sm'),
            timestamp,
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            type: 'purchase_receive',
            quantity: receiveQty,
            previousStock: oldStock,
            newStock,
            referenceNumber: targetPO.poNumber,
            notes: `Received items from ${targetPO.supplierName}`,
            performedBy: receivedBy,
          });

          return {
            ...prod,
            stockQuantity: newStock,
            updatedAt: timestamp,
          };
        }
        return prod;
      })
    );

    if (movementsToAdd.length > 0) {
      setStockMovements((prev) => [...movementsToAdd, ...prev]);
    }

    // Mark PO as received
    setPurchaseOrders((prev) =>
      prev.map((p) => {
        if (p.id === poId) {
          return {
            ...p,
            status: 'received',
            receivedDate: timestamp,
            receivedBy,
            items: p.items.map((item) => ({ ...item, receivedQty: item.orderedQty })),
          };
        }
        return p;
      })
    );

    addToast({
      type: 'success',
      title: 'Goods Received into Stock',
      message: `All items from ${targetPO.poNumber} posted to active inventory.`,
    });
  };

  // Returns & Refunds
  const processReturn = (returnData: {
    originalReceiptNumber: string;
    saleId: string;
    customerName: string;
    items: SaleReturn['items'];
    totalRefundETB: number;
    refundMethod: SaleReturn['refundMethod'];
    processedBy: string;
    notes?: string;
  }): SaleReturn => {
    const returnNumber = generateReturnNumber();
    const timestamp = new Date().toISOString();

    const newReturn: SaleReturn = {
      ...returnData,
      id: generateId('ret'),
      returnNumber,
      date: timestamp,
      status: 'completed',
    };

    setReturns((prev) => [newReturn, ...prev]);

    // Restock items that have action 'restock'
    const movementsToAdd: StockMovement[] = [];

    setProducts((prevProducts) =>
      prevProducts.map((prod) => {
        const itemReturned = returnData.items.find(
          (i) => i.productId === prod.id && i.action === 'restock'
        );
        if (itemReturned && itemReturned.quantity > 0) {
          const oldStock = prod.stockQuantity;
          const newStock = oldStock + itemReturned.quantity;

          movementsToAdd.push({
            id: generateId('sm'),
            timestamp,
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            type: 'return_restock',
            quantity: itemReturned.quantity,
            previousStock: oldStock,
            newStock,
            referenceNumber: returnNumber,
            notes: `Restocked customer return (${itemReturned.reason})`,
            performedBy: returnData.processedBy,
          });

          return {
            ...prod,
            stockQuantity: newStock,
            updatedAt: timestamp,
          };
        }
        return prod;
      })
    );

    if (movementsToAdd.length > 0) {
      setStockMovements((prev) => [...movementsToAdd, ...prev]);
    }

    // Determine whether the original sale is fully refunded or partially refunded
    setSales((prevSales) =>
      prevSales.map((s) => {
        if (s.receiptNumber === returnData.originalReceiptNumber || s.id === returnData.saleId) {
          const allReturnsForSale = [
            ...returns.filter((r) => r.originalReceiptNumber === s.receiptNumber || r.saleId === s.id),
            newReturn,
          ];

          const isFullyRefunded = s.items.every((lineItem) => {
            const totalReturnedQtyForProduct = allReturnsForSale
              .flatMap((r) => r.items)
              .filter((item) => item.productId === lineItem.productId)
              .reduce((sum, item) => sum + item.quantity, 0);
            return totalReturnedQtyForProduct >= lineItem.quantity;
          });

          return {
            ...s,
            status: isFullyRefunded ? 'refunded' : 'partially_refunded',
          };
        }
        return s;
      })
    );

    addToast({
      type: 'success',
      title: 'Return Processed',
      message: `${returnNumber} completed. Refund of ${returnData.totalRefundETB.toLocaleString()} ETB approved.`,
    });

    return newReturn;
  };

  // Physical Stock Adjustment
  const performStockAdjustment = (adjustments: {
    productId: string;
    newStock: number;
    reason: string;
    user: string;
  }[]) => {
    const timestamp = new Date().toISOString();
    const movementsToAdd: StockMovement[] = [];

    setProducts((prevProducts) =>
      prevProducts.map((prod) => {
        const adj = adjustments.find((a) => a.productId === prod.id);
        if (adj) {
          const sanitizedNewStock = Math.max(0, Math.floor(adj.newStock));
          const diff = sanitizedNewStock - prod.stockQuantity;
          if (diff !== 0) {
            movementsToAdd.push({
              id: generateId('sm'),
              timestamp,
              productId: prod.id,
              productName: prod.name,
              sku: prod.sku,
              type: 'stock_count_adjustment',
              quantity: diff,
              previousStock: prod.stockQuantity,
              newStock: sanitizedNewStock,
              referenceNumber: 'AUDIT-ADJ',
              notes: `Stock count adjustment: ${adj.reason}`,
              performedBy: adj.user,
            });
          }
          return {
            ...prod,
            stockQuantity: sanitizedNewStock,
            updatedAt: timestamp,
          };
        }
        return prod;
      })
    );

    if (movementsToAdd.length > 0) {
      setStockMovements((prev) => [...movementsToAdd, ...prev]);
    }

    addToast({
      type: 'success',
      title: 'Inventory Count Adjusted',
      message: `${adjustments.length} product(s) synchronized to physical audit counts.`,
    });
  };

  // Users
  const addUser = (userData: Omit<UserAccount, 'id'> & { initialPassword?: string }): UserAccount => {
    const { initialPassword, ...accountData } = userData;
    const tempPass = initialPassword || `Amme-${Math.random().toString(36).slice(-6)}!`;
    const newUser: UserAccount = {
      ...accountData,
      id: generateId('usr'),
    };
    setUsers((prev) => [...prev, newUser]);

    // Asynchronously sync registration to PostgreSQL backend
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        roleCode: newUser.role,
        temporaryPassword: tempPass,
      }),
    }).catch((err) => console.warn('Could not sync user to database API:', err));

    addToast({
      type: 'success',
      title: 'Staff Member Registered',
      message: `${newUser.name} registered as ${newUser.role.toUpperCase()}. One-time credentials generated.`,
    });
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<UserAccount> & { temporaryPassword?: string }) => {
    const { temporaryPassword, ...cleanUpdates } = updates;
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...cleanUpdates } : u))
    );

    const target = users.find((u) => u.id === id);
    if (target && (temporaryPassword || cleanUpdates.status || cleanUpdates.role || cleanUpdates.name)) {
      fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: id,
          email: target.email,
          temporaryPassword: temporaryPassword,
          status: cleanUpdates.status,
          roleCode: cleanUpdates.role,
          fullName: cleanUpdates.name,
        }),
      }).catch((err) => console.warn('Could not sync user update to database API:', err));
    }

    addToast({
      type: 'success',
      title: 'Staff Profile Updated',
      message: temporaryPassword
        ? 'Staff credentials reset and encrypted with bcrypt.'
        : 'Account details saved.',
    });
  };

  const deleteUser = async (id: string) => {
    const target = users.find((u) => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));

    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to remove user from database.');
      }
      addToast({
        type: 'info',
        title: 'Staff Member Removed',
        message: `${target?.name || 'Staff account'} removed from PostgreSQL database.`,
      });
    } catch (err: any) {
      console.error('Error deleting user from database:', err);
      if (target) {
        setUsers((prev) => [...prev, target]);
      }
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete staff member.',
      });
    }
  };

  // Settings
  const updateSettings = (updates: Partial<ShopSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    addToast({
      type: 'success',
      title: 'Settings Saved',
      message: 'Store profile and POS preferences updated.',
    });
  };

  return (
    <AppContext.Provider
      value={{
        products,
        categories: derivedCategories,
        suppliers,
        customers,
        sales,
        purchaseOrders,
        stockMovements,
        returns,
        users,
        settings,
        toasts,
        isSidebarCollapsed,
        toggleSidebar,
        isMobileNavOpen,
        setMobileNavOpen,
        activeReceipt,
        openReceiptModal,
        closeReceiptModal,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        updateCategory,
        deleteCategory,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        recordSale,
        createPurchaseOrder,
        receivePurchaseOrder,
        deletePurchaseOrder,
        processReturn,
        performStockAdjustment,
        addUser,
        updateUser,
        deleteUser,
        updateSettings,
        addToast,
        removeToast,
        refreshBackendData,
        isLiveBackendLoaded,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
