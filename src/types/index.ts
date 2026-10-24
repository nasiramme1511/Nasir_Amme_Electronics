export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName: string;
  productCount: number;
  totalValueETB: number;
  isActive: boolean;
  createdAt: string;
}

export interface ProductSerialItem {
  id: string;
  serialNumber: string;
  status: 'in_stock' | 'sold' | 'defective' | 'returned';
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockThreshold: number;
  status: 'active' | 'inactive';
  location: string;
  description: string;
  warrantyMonths?: number;
  imageUrl?: string;
  createdBy?: string;
  hasSerials?: boolean;
  serials?: ProductSerialItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  code: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  paymentTerms: 'Immediate / Cash' | 'Net 15' | 'Net 30' | 'Consignment';
  activeOrdersCount: number;
  totalPurchasedETB: number;
  outstandingBalanceETB: number;
  status: 'active' | 'inactive';
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  customerType: 'retail' | 'wholesale';
  city: string;
  address?: string;
  creditBalanceETB: number;
  totalSpentETB: number;
  loyaltyPoints: number;
  priceTier?: 'STANDARD' | 'TIER_1_WHOLESALE' | 'TIER_2_VIP' | 'STAFF' | string;
  tinNumber?: string;
  allowCredit?: boolean;
  creditLimit?: number;
  paymentTerms?: string;
  notes?: string;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  sku: string;
  name: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  discount: number;
  total: number;
}

export type PaymentMethod = 'cash' | 'telebirr' | 'cbe_birr' | 'bank_transfer' | 'credit';

export interface Sale {
  id: string;
  receiptNumber: string;
  date: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerType: 'retail' | 'wholesale';
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  amountTendered?: number;
  changeGiven?: number;
  cashierId: string;
  cashierName: string;
  status: 'completed' | 'refunded' | 'partially_refunded';
  notes?: string;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  orderedQty: number;
  receivedQty: number;
  unitCost: number;
  totalCost: number;
}

export type POStatus = 'draft' | 'ordered' | 'received' | 'partially_received' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  expectedDelivery: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: POStatus;
  notes?: string;
  receivedDate?: string;
  receivedBy?: string;
}

export type MovementType =
  | 'sale'
  | 'purchase_receive'
  | 'return_restock'
  | 'damage_loss'
  | 'stock_count_adjustment'
  | 'manual_correction';

export interface StockMovement {
  id: string;
  timestamp: string;
  productId: string;
  productName: string;
  sku: string;
  type: MovementType;
  quantity: number; // positive for additions, negative for reductions
  previousStock: number;
  newStock: number;
  referenceNumber: string;
  notes: string;
  performedBy: string;
}

export interface StockCountItem {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  systemQuantity: number;
  countedQuantity: number | null;
  discrepancy: number;
  discrepancyValueETB: number;
  status: 'pending' | 'counted' | 'adjusted';
  notes?: string;
}

export interface ReturnItem {
  productId: string;
  productName: string;
  sku: string;
  saleItemId: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
  reason: 'defective' | 'wrong_item' | 'customer_regret' | 'warranty_claim';
  action: 'restock' | 'quarantine_damaged' | 'write_off';
}

export interface SaleReturn {
  id: string;
  returnNumber: string;
  originalReceiptNumber: string;
  saleId: string;
  date: string;
  customerName: string;
  items: ReturnItem[];
  totalRefundETB: number;
  refundMethod: 'cash' | 'credit_note' | 'telebirr' | 'original_method';
  status: 'approved' | 'completed' | 'rejected';
  processedBy: string;
  notes?: string;
}

export type RoleType = 'admin' | 'manager' | 'cashier' | 'stock_keeper';

export interface UserAccount {
  id: string;
  name: string;
  role: RoleType;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  lastActive: string;
  permissions: string[];
  quickPin?: string;
  forcePasswordChange?: boolean;
}

export interface ShopSettings {
  shopName: string;
  legalName: string;
  tinNumber: string;
  city: string;
  address: string;
  landmark: string;
  phonePrimary: string;
  phoneSecondary: string;
  email: string;
  receiptHeader: string;
  receiptFooter: string;
  taxRate: number;
  isTaxEnabled: boolean;
  currencySymbol: string;
  currencyCode: string;
  lowStockGlobalThreshold: number;
  barcodeSound: boolean;
  requireCustomerOnSale: boolean;
  vatNumber?: string;
  streetKebele?: string;
  paperWidth?: '80mm' | '58mm';
  printVatBreakdown?: boolean;
  printCustomerTin?: boolean;
  printCashierName?: boolean;
  preventNegativeStockSales?: boolean;
  strictBarcodeEnforcement?: boolean;
}

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp?: number;
}
