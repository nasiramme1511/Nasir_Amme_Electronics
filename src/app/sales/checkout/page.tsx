'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Product, SaleItem, PaymentMethod } from '@/types';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  Barcode,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatETB } from '@/lib/formatters';

interface CartItem extends SaleItem {
  maxStock: number;
}

export default function CheckoutPOSPage() {
  const { products, customers, categories, recordSale, openReceiptModal, addToast } = useApp();

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust-01');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('telebirr');
  const [tenderedAmount, setTenderedAmount] = useState<number | ''>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [saleNotes, setSaleNotes] = useState<string>('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Barcode quick scan simulator
  const [barcodeInput, setBarcodeInput] = useState('');

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || customers[0];
  }, [customers, selectedCustomerId]);

  // Filtered Products for Grid
  const availableProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        searchTerm === '' ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.includes(searchTerm) ||
        p.brand.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;

      return matchSearch && matchCat;
    });
  }, [products, searchTerm, selectedCategory]);

  // Add Product to Cart
  const handleAddToCart = (product: Product) => {
    if (product.stockQuantity <= 0) {
      addToast({
        type: 'warning',
        title: 'Out of Stock',
        message: `${product.name} has zero available units.`,
      });
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          addToast({
            type: 'warning',
            title: 'Max Stock Reached',
            message: `Only ${product.stockQuantity} units available in Dire Dawa shop.`,
          });
          return prevCart;
        }
        return prevCart.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.unitPrice - item.discount,
              }
            : item
        );
      } else {
        return [
          ...prevCart,
          {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            unitPrice: product.sellingPrice,
            costPrice: product.costPrice,
            quantity: 1,
            discount: 0,
            total: product.sellingPrice,
            maxStock: product.stockQuantity,
          },
        ];
      }
    });
  };

  // Barcode scan simulator submit
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const found = products.find(
      (p) => p.barcode === barcodeInput.trim() || p.sku.toLowerCase() === barcodeInput.trim().toLowerCase()
    );

    if (found) {
      handleAddToCart(found);
      setBarcodeInput('');
      addToast({
        type: 'success',
        title: 'Barcode Scanned',
        message: `Added ${found.name}`,
      });
    } else {
      addToast({
        type: 'error',
        title: 'Barcode Not Found',
        message: `No product matching code "${barcodeInput}".`,
      });
    }
  };

  // Update item quantity
  const handleUpdateQty = (productId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.maxStock) {
              addToast({
                type: 'warning',
                title: 'Insufficient Stock',
                message: `Maximum stock for this item is ${item.maxStock} units.`,
              });
              return item;
            }
            return {
              ...item,
              quantity: newQty,
              total: newQty * item.unitPrice - item.discount,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Remove line from cart
  const handleRemoveLine = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Cart Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [cart]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  // Cash payment validation & change calculation
  const isCashValid = useMemo(() => {
    if (paymentMethod !== 'cash') return true;
    if (tenderedAmount === '' || typeof tenderedAmount !== 'number' || isNaN(tenderedAmount)) {
      return false;
    }
    return tenderedAmount >= grandTotal;
  }, [paymentMethod, tenderedAmount, grandTotal]);

  const cashValidationError = useMemo(() => {
    if (paymentMethod !== 'cash') return '';
    if (tenderedAmount === '') {
      return 'Cash tender amount is required to complete this cash sale.';
    }
    if (Number(tenderedAmount) < grandTotal) {
      const shortBy = grandTotal - Number(tenderedAmount);
      return `Insufficient cash! Short by ${formatETB(shortBy)}. Minimum tender is ${formatETB(grandTotal)}.`;
    }
    return '';
  }, [paymentMethod, tenderedAmount, grandTotal]);

  const changeDue = useMemo(() => {
    if (paymentMethod !== 'cash' || tenderedAmount === '' || Number(tenderedAmount) < grandTotal) {
      return 0;
    }
    return Number(tenderedAmount) - grandTotal;
  }, [paymentMethod, tenderedAmount, grandTotal]);

  // Quick tender buttons
  const setQuickTender = (amt: number) => {
    setTenderedAmount(amt);
  };

  // Complete Sale
  const handleCheckoutSubmit = () => {
    if (cart.length === 0 || isSubmitting) return;

    if (paymentMethod === 'cash') {
      if (tenderedAmount === '' || Number(tenderedAmount) < grandTotal) {
        addToast({
          type: 'error',
          title: 'Insufficient Cash Tendered',
          message: `Cash handed must be at least ${formatETB(grandTotal)}.`,
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const validatedAmountTendered =
        paymentMethod === 'cash' ? Number(tenderedAmount) : undefined;

      const saleRecord = recordSale({
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Retail Customer',
        customerPhone: selectedCustomer?.phone,
        customerType: selectedCustomer?.customerType || 'retail',
        items: cart.map((item) => ({
          productId: item.productId,
          sku: item.sku,
          name: item.name,
          unitPrice: item.unitPrice,
          costPrice: item.costPrice,
          quantity: item.quantity,
          discount: item.discount,
          total: item.total,
        })),
        subtotal,
        discount: discountAmount,
        tax: 0,
        grandTotal,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        amountTendered: validatedAmountTendered,
        changeGiven: paymentMethod === 'cash' ? changeDue : undefined,
        cashierId: 'usr-03',
        cashierName: 'Tigist Alem (Senior Cashier)',
        notes: saleNotes.trim() || undefined,
      });

      // Reset checkout terminal
      setCart([]);
      setDiscountAmount(0);
      setTenderedAmount('');
      setPaymentReference('');
      setSaleNotes('');
      setIsConfirmModalOpen(false);

      // Open receipt modal immediately for printing preview
      openReceiptModal(saleRecord);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#101827] text-[#D9A441] flex items-center justify-center font-bold">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">
                POS Cashier Terminal
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                Active Till
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Dire Dawa Main Branch • Counter 01 • Cashier: Tigist Alem
            </p>
          </div>
        </div>

        {/* Quick Barcode Scanner Input */}
        <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2 max-w-xs w-full">
          <div className="relative flex-1">
            <Barcode className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Scan barcode / enter SKU..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-[#D9A441] bg-slate-50"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" className="h-8 text-xs">
            Scan
          </Button>
        </form>
      </div>

      {/* Main Split Layout: Left Catalog Grid, Right Tactile Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Side: Product Selector (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Search & Category Pills */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products by title, model, or brand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50/70 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-[#101827] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Accessories ({products.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.name)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === c.name
                      ? 'bg-[#101827] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {availableProducts.map((prod) => {
              const inStock = prod.stockQuantity > 0;
              const cartItem = cart.find((i) => i.productId === prod.id);

              return (
                <div
                  key={prod.id}
                  onClick={() => inStock && handleAddToCart(prod)}
                  className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between relative cursor-pointer select-none ${
                    inStock
                      ? 'bg-white border-slate-200 hover:border-[#D9A441] hover:shadow-md active:scale-[0.98]'
                      : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                  }`}
                >
                  {cartItem && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#101827] text-[#D9A441] text-[11px] font-bold flex items-center justify-center shadow-xs">
                      {cartItem.quantity}
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {prod.brand}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-2 mt-0.5 leading-tight">
                      {prod.name}
                    </h4>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#101827]">
                        {formatETB(prod.sellingPrice)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {prod.stockQuantity} left
                      </div>
                    </div>

                    <button
                      disabled={!inStock}
                      className={`p-1.5 rounded-lg transition-colors ${
                        inStock
                          ? 'bg-[#D9A441]/10 text-[#93660a] hover:bg-[#D9A441] hover:text-[#101827]'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Interactive Cart & Checkout Panel (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {/* Cart Header & Customer Selector */}
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Cart Items ({cart.reduce((s, i) => s + i.quantity, 0)})
              </span>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-[11px] text-rose-600 hover:underline font-semibold"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Customer Dropdown */}
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#D9A441]"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customerType.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cart Lines List */}
          <div className="p-4 flex-1 overflow-y-auto max-h-[280px] divide-y divide-slate-100">
            {cart.map((item) => (
              <div key={item.productId} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                <div className="flex-1 pr-1">
                  <h5 className="text-xs font-bold text-slate-900 line-clamp-1">
                    {item.name}
                  </h5>
                  <div className="text-[11px] text-slate-500 font-mono">
                    {formatETB(item.unitPrice)} each
                  </div>
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-1.5 bg-slate-100 px-1.5 py-0.5 rounded-lg border border-slate-200">
                  <button
                    onClick={() => handleUpdateQty(item.productId, -1)}
                    className="p-1 text-slate-600 hover:text-slate-900"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold text-slate-900 px-1 min-w-[18px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleUpdateQty(item.productId, 1)}
                    className="p-1 text-slate-600 hover:text-slate-900"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="text-right min-w-[70px]">
                  <div className="text-xs font-bold text-slate-900">
                    {formatETB(item.total)}
                  </div>
                  <button
                    onClick={() => handleRemoveLine(item.productId)}
                    className="text-[10px] text-rose-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <ShoppingCart className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">Your cart is empty. Click any item on the left to add.</p>
              </div>
            )}
          </div>

          {/* Payment Method Selector & Totals */}
          <div className="p-4 bg-slate-50/90 border-t border-slate-200 space-y-3">
            {/* Payment Method Tabs */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                Payment Method
              </span>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('telebirr')}
                  className={`p-2 rounded-lg border text-center font-semibold transition-all ${
                    paymentMethod === 'telebirr'
                      ? 'bg-[#101827] text-[#D9A441] border-[#101827] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Telebirr
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cbe_birr')}
                  className={`p-2 rounded-lg border text-center font-semibold transition-all ${
                    paymentMethod === 'cbe_birr'
                      ? 'bg-[#101827] text-white border-[#101827] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  CBE Birr
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-2 rounded-lg border text-center font-semibold transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-[#16845B] text-white border-[#16845B] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit')}
                  className={`p-2 rounded-lg border text-center font-semibold transition-all ${
                    paymentMethod === 'credit'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Credit
                </button>
              </div>
            </div>

            {/* Payment Reference or Cash Tendered input */}
            {paymentMethod === 'cash' ? (
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Tendered (ETB):</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter cash given"
                    value={tenderedAmount}
                    onChange={(e) =>
                      setTenderedAmount(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))
                    }
                    className={`w-36 px-2.5 py-1 text-right font-bold text-sm border rounded focus:ring-1 ${
                      cashValidationError
                        ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-500'
                        : 'border-slate-300 focus:ring-[#D9A441]'
                    }`}
                  />
                </div>

                {/* Quick note buttons */}
                <div className="flex items-center gap-1.5 justify-end text-[10px]">
                  <span className="text-slate-400">Quick:</span>
                  <button
                    type="button"
                    onClick={() => setQuickTender(grandTotal)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-bold cursor-pointer"
                  >
                    Exact
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickTender(Math.ceil(grandTotal / 500) * 500)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-bold cursor-pointer"
                  >
                    Round 500
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickTender(Math.ceil(grandTotal / 1000) * 1000)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded font-bold cursor-pointer"
                  >
                    Round 1K
                  </button>
                </div>

                {cashValidationError && (
                  <div className="p-2 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[11px] font-medium leading-tight">
                    {cashValidationError}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 font-bold text-[#16845B]">
                  <span>Change to Return:</span>
                  <span className="text-sm">{formatETB(changeDue)}</span>
                </div>
              </div>
            ) : (
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <input
                  type="text"
                  placeholder={
                    paymentMethod === 'telebirr'
                      ? 'Telebirr Transaction / Approval Code'
                      : paymentMethod === 'cbe_birr'
                      ? 'CBE Birr Ref (FT...)'
                      : 'Invoice / Account Reference'
                  }
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#D9A441] font-mono"
                />
              </div>
            )}

            {/* Discount & Totals */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span>{formatETB(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Discount (ETB):</span>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-20 px-2 py-0.5 text-right font-medium text-xs border border-slate-300 rounded"
                />
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Grand Total (ETB):</span>
                <span className="text-xl text-[#101827]">{formatETB(grandTotal)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <Button
              variant="accent"
              size="lg"
              className="w-full font-bold shadow-md"
              disabled={cart.length === 0 || !isCashValid}
              onClick={() => setIsConfirmModalOpen(true)}
              leftIcon={<CheckCircle2 className="w-5 h-5" />}
            >
              Complete Sale • {formatETB(grandTotal)}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal before issuing final receipt */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          if (!isSubmitting) setIsConfirmModalOpen(false);
        }}
        size="md"
        title="Confirm Retail Checkout"
        description="Verify order total and payment details before issuing receipt."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setIsConfirmModalOpen(false)}
            >
              Back to Cart
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isSubmitting || !isCashValid}
              onClick={handleCheckoutSubmit}
            >
              {isSubmitting ? 'Issuing Receipt...' : 'Confirm & Issue Receipt'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-semibold text-slate-900">{selectedCustomer?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Items Count:</span>
              <span>{cart.reduce((s, i) => s + i.quantity, 0)} units ({cart.length} lines)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Mode:</span>
              <span className="font-bold uppercase text-slate-800">{paymentMethod}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Payable:</span>
              <span className="text-base text-[#101827]">{formatETB(grandTotal)}</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 leading-relaxed text-[11px]">
            <strong>Demonstration POS Note:</strong> This is a local client-side prototype. Submitting will update local stock counts and present an authentic Dire Dawa retail thermal receipt.
          </div>
        </div>
      </Modal>
    </div>
  );
}
