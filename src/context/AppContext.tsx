'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
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
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => Category;
  updateCategory: (id: string, updates: Partial<Category>) => void;

  addSupplier: (supplier: Omit<Supplier, 'id'>) => Supplier;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;

  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;

  recordSale: (saleData: {
    customerId?: string;
    customerName: string;
    customerPhone?: string;
    customerType: 'retail' | 'wholesale';
    items: SaleItem[];
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
  }) => Sale;

  createPurchaseOrder: (poData: Omit<PurchaseOrder, 'id' | 'poNumber' | 'date'>) => PurchaseOrder;
  receivePurchaseOrder: (poId: string, receivedBy: string) => void;

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

  addUser: (userData: Omit<UserAccount, 'id'>) => UserAccount;
  updateUser: (id: string, updates: Partial<UserAccount>) => void;

  updateSettings: (updates: Partial<ShopSettings>) => void;

  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
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
  const addProduct = (prodData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product => {
    const newProduct: Product = {
      ...prodData,
      id: generateId('prod'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProducts((prev) => [newProduct, ...prev]);

    // Add initial movement entry if stock > 0
    if (newProduct.stockQuantity > 0) {
      const movement: StockMovement = {
        id: generateId('sm'),
        timestamp: new Date().toISOString(),
        productId: newProduct.id,
        productName: newProduct.name,
        sku: newProduct.sku,
        type: 'manual_correction',
        quantity: newProduct.stockQuantity,
        previousStock: 0,
        newStock: newProduct.stockQuantity,
        referenceNumber: 'INIT-ADD',
        notes: 'Initial inventory quantity logged during product creation',
        performedBy: 'Nasir Amme',
      };
      setStockMovements((prev) => [movement, ...prev]);
    }

    addToast({
      type: 'success',
      title: 'Product Added',
      message: `${newProduct.name} is now active in the catalog.`,
    });
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const targetProduct = products.find((p) => p.id === id);
    if (!targetProduct) return;

    let movementToAdd: StockMovement | null = null;
    const cleanUpdates = { ...updates };

    if (cleanUpdates.stockQuantity !== undefined) {
      // Reject / clamp negative stock quantities
      const sanitizedNewStock = Math.max(0, Math.floor(cleanUpdates.stockQuantity));
      cleanUpdates.stockQuantity = sanitizedNewStock;

      const diff = sanitizedNewStock - targetProduct.stockQuantity;
      if (diff !== 0) {
        movementToAdd = {
          id: generateId('sm'),
          timestamp: new Date().toISOString(),
          productId: targetProduct.id,
          productName: cleanUpdates.name || targetProduct.name,
          sku: cleanUpdates.sku || targetProduct.sku,
          type: 'manual_correction',
          quantity: diff,
          previousStock: targetProduct.stockQuantity,
          newStock: sanitizedNewStock,
          referenceNumber: 'CATALOG-EDIT',
          notes: `Manual catalog stock edit: adjusted from ${targetProduct.stockQuantity} to ${sanitizedNewStock} units`,
          performedBy: 'Nasir Amme (Admin)',
        };
      }
    }

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            ...cleanUpdates,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );

    if (movementToAdd) {
      setStockMovements((prev) => [movementToAdd!, ...prev]);
    }

    addToast({
      type: 'success',
      title: 'Product Updated',
      message: 'Product changes have been saved.',
    });
  };

  const deleteProduct = (id: string) => {
    const target = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    addToast({
      type: 'info',
      title: 'Product Removed',
      message: `${target?.name || 'Product'} was removed from catalog.`,
    });
  };

  // Categories
  const addCategory = (catData: Omit<Category, 'id' | 'createdAt'>): Category => {
    const newCat: Category = {
      ...catData,
      id: generateId('cat'),
      createdAt: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, newCat]);
    addToast({
      type: 'success',
      title: 'Category Created',
      message: `${newCat.name} category has been added.`,
    });
    return newCat;
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    addToast({
      type: 'success',
      title: 'Category Updated',
      message: 'Category details have been saved.',
    });
  };

  // Suppliers
  const addSupplier = (supData: Omit<Supplier, 'id'>): Supplier => {
    const newSup: Supplier = {
      ...supData,
      id: generateId('sup'),
    };
    setSuppliers((prev) => [newSup, ...prev]);
    addToast({
      type: 'success',
      title: 'Supplier Added',
      message: `${newSup.name} added to vendor directory.`,
    });
    return newSup;
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    addToast({
      type: 'success',
      title: 'Supplier Updated',
      message: 'Supplier information saved.',
    });
  };

  // Customers
  const addCustomer = (custData: Omit<Customer, 'id' | 'createdAt'>): Customer => {
    const newCust: Customer = {
      ...custData,
      id: generateId('cust'),
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCust, ...prev]);
    addToast({
      type: 'success',
      title: 'Customer Registered',
      message: `${newCust.name} has been enrolled.`,
    });
    return newCust;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    addToast({
      type: 'success',
      title: 'Customer Updated',
      message: 'Customer record updated.',
    });
  };

  // Record Sale & Decrement Inventory
  const recordSale = (saleData: {
    customerId?: string;
    customerName: string;
    customerPhone?: string;
    customerType: 'retail' | 'wholesale';
    items: SaleItem[];
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

    addToast({
      type: 'success',
      title: 'Sale Completed!',
      message: `Receipt ${receiptNum} issued for ${saleData.grandTotal.toLocaleString()} ETB.`,
    });

    return newSale;
  };

  // Purchase Orders & Receiving
  const createPurchaseOrder = (poData: Omit<PurchaseOrder, 'id' | 'poNumber' | 'date'>): PurchaseOrder => {
    const poNumber = generatePONumber();
    const newPO: PurchaseOrder = {
      ...poData,
      id: generateId('po'),
      poNumber,
      date: new Date().toISOString(),
    };
    setPurchaseOrders((prev) => [newPO, ...prev]);
    addToast({
      type: 'success',
      title: 'Purchase Order Drafted',
      message: `${poNumber} created for ${newPO.supplierName}.`,
    });
    return newPO;
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
  const addUser = (userData: Omit<UserAccount, 'id'>): UserAccount => {
    const newUser: UserAccount = {
      ...userData,
      id: generateId('usr'),
    };
    setUsers((prev) => [...prev, newUser]);
    addToast({
      type: 'success',
      title: 'Staff Member Added',
      message: `${newUser.name} assigned role of ${newUser.role.toUpperCase()}.`,
    });
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<UserAccount>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );
    addToast({
      type: 'success',
      title: 'User Profile Updated',
      message: 'Account details saved.',
    });
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
        addSupplier,
        updateSupplier,
        addCustomer,
        updateCustomer,
        recordSale,
        createPurchaseOrder,
        receivePurchaseOrder,
        processReturn,
        performStockAdjustment,
        addUser,
        updateUser,
        updateSettings,
        addToast,
        removeToast,
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
