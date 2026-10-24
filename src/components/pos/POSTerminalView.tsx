'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Search,
  Barcode,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Smartphone,
  Banknote,
  Receipt,
  User,
  PauseCircle,
  X,
  CheckCircle2,
  Printer,
  Percent,
  RotateCcw,
  Sun,
  Moon,
  Sparkles,
  Layers,
  ArrowRight,
  Landmark,
  ShieldAlert,
  KeyRound,
  AlertTriangle,
  Lock,
  FileSpreadsheet,
  Vault,
  ShieldCheck,
  Coins
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Sale, SaleItem } from "@/types";
import { formatETB } from "@/lib/formatters";
import ThermalReceipt, { ReceiptData } from "@/components/pos/ThermalReceipt";
import ZReportThermalSlip, { ZReportData, DenominationCounts } from "@/components/pos/ZReportThermalSlip";
import { Modal } from "@/components/ui/Modal";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";

export interface POSProduct {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  hasSerials?: boolean;
}

export interface POSCartItem extends POSProduct {
  qty: number;
  discount: number;
  serialNumbers?: string[];
}

export type POSPaymentMethod = "telebirr" | "cbe" | "cash" | "bank" | "credit";

interface ParkedTicket {
  id: string;
  timestamp: string;
  customerName: string;
  cart: POSCartItem[];
  globalDiscount: number;
  paymentMethod: POSPaymentMethod;
  total: number;
}

const DEFAULT_CATALOG: POSProduct[] = [
  { id: "p1", sku: "CBL-OTG-3IN1", barcode: "693210984712", name: "Joyroom 3-in-1 Fast Cable", category: "Cables & Interconnects", price: 900, costPrice: 600, stock: 45 },
  { id: "p2", sku: "ADP-SAM-45W", barcode: "880609128391", name: "Samsung 45W Super Fast Adapter", category: "Chargers & Power Adapters", price: 6000, costPrice: 4200, stock: 18 },
  { id: "p3", sku: "PB-ANK-20K", barcode: "194644021092", name: "Anker 325 PowerCore 20000mAh", category: "Power Banks & Batteries", price: 8000, costPrice: 5600, stock: 11 },
  { id: "p4", sku: "CBL-BAS-100W", barcode: "695315620182", name: "Baseus Cafule 100W Type-C 2M", category: "Cables & Interconnects", price: 2500, costPrice: 1700, stock: 42 },
  { id: "p5", sku: "SP-JOY-15PRO", barcode: "693210984999", name: "iPhone 15 Pro 9H Tempered Glass", category: "Screen Protectors & Cases", price: 2000, costPrice: 1200, stock: 65 },
  { id: "p6", sku: "ADP-ANK-20W", barcode: "194644018891", name: "Anker Nano III 20W USB-C", category: "Chargers & Power Adapters", price: 3000, costPrice: 2000, stock: 4 },
  { id: "p7", sku: "AUD-AIR-PRO2", barcode: "195949052210", name: "Apple AirPods Pro 2 (Type-C)", category: "Audio & Wireless Earbuds", price: 34000, costPrice: 28000, stock: 6, hasSerials: true },
  { id: "p8", sku: "SPK-JBL-GO3", barcode: "050036373812", name: "JBL GO 3 Waterproof Speaker", category: "Bluetooth Speakers", price: 6500, costPrice: 4500, stock: 9, hasSerials: true },
];

export default function POSTerminalView() {
  const { products: appProducts, categories: appCategories, recordSale, settings, addToast } = useApp();
  const { user: authUser, roles } = useAuth();
  const { toggleTheme, isDark } = useTheme();

  // Combine live app products with default catalog so POS always has products
  const catalog: POSProduct[] = useMemo(() => {
    if (appProducts && appProducts.length > 0) {
      return appProducts.map((p) => ({
        id: p.id,
        sku: p.sku,
        barcode: p.barcode || p.sku,
        name: p.name,
        category: p.category || "General",
        price: p.sellingPrice,
        costPrice: p.costPrice || Math.round(p.sellingPrice * 0.7),
        stock: p.stockQuantity,
        hasSerials: p.hasSerials,
      }));
    }
    return DEFAULT_CATALOG;
  }, [appProducts]);

  // Derived unique categories
  const categories = useMemo(() => {
    const set = new Set<string>(["All Accessories"]);
    if (appCategories && appCategories.length > 0) {
      appCategories.forEach((c) => set.add(c.name));
    }
    catalog.forEach((p) => set.add(p.category));
    return Array.from(set);
  }, [catalog, appCategories]);

  const [selectedCategory, setSelectedCategory] = useState("All Accessories");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<POSPaymentMethod>("telebirr");
  const [amountTendered, setAmountTendered] = useState<string>("");
  const [customerName, setCustomerName] = useState("Walk-in Customer");
  const [paymentReference, setPaymentReference] = useState("");
  
  // Shift Management State
  const [activeSession, setActiveSession] = useState<{ id: string; sessionNumber: string; openingFloat: number } | null>(null);

  useEffect(() => {
    fetch('/api/v1/pos/shifts/current')
      .then((r) => r.json())
      .then((d) => {
        if (d?.data?.session) {
          setActiveSession({
            id: d.data.session.id,
            sessionNumber: d.data.session.sessionNumber,
            openingFloat: Number(d.data.session.openingFloat),
          });
        }
      })
      .catch(() => {});
  }, []);

  // Four-Eyes Manager PIN Authorization Modal
  const [showFourEyesModal, setShowFourEyesModal] = useState<boolean>(false);
  const [managerPinInput, setManagerPinInput] = useState<string>("");
  const [fourEyesError, setFourEyesError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState<boolean>(false);

  // Serial Number / IMEI Capture Modal
  const [showSerialModal, setShowSerialModal] = useState<boolean>(false);
  const [serialTargetProduct, setSerialTargetProduct] = useState<POSProduct | null>(null);
  const [availableDbSerials, setAvailableDbSerials] = useState<string[]>([]);
  const [tempSerials, setTempSerials] = useState<string[]>([]);
  const [tempSerialScan, setTempSerialScan] = useState<string>("");
  const [isLoadingSerials, setIsLoadingSerials] = useState<boolean>(false);

  // Blind Cash Register Drop Modal & Handover State
  const [showBlindDropModal, setShowBlindDropModal] = useState<boolean>(false);
  const [denominations, setDenominations] = useState<DenominationCounts>({
    note200: 0,
    note100: 0,
    note50: 0,
    note10: 0,
    note5: 0,
    coins: 0,
  });
  const [baselineFloatRetained, setBaselineFloatRetained] = useState<number>(5000);
  const [blindDropNotes, setBlindDropNotes] = useState<string>("");
  const [isSubmittingBlindDrop, setIsSubmittingBlindDrop] = useState<boolean>(false);
  const [blindDropResult, setBlindDropResult] = useState<ZReportData | null>(null);

  const computedCountedCash = useMemo(() => {
    return (
      (Number(denominations.note200) || 0) * 200 +
      (Number(denominations.note100) || 0) * 100 +
      (Number(denominations.note50) || 0) * 50 +
      (Number(denominations.note10) || 0) * 10 +
      (Number(denominations.note5) || 0) * 5 +
      (Number(denominations.coins) || 0)
    );
  }, [denominations]);

  const [safeDropRecordCode, setSafeDropRecordCode] = useState<string>('');

  useEffect(() => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    setSafeDropRecordCode(`SAFE-DROP-${dateStr}`);
  }, []);

  const netSafeDropAmount = useMemo(() => {
    return Math.max(0, computedCountedCash - (baselineFloatRetained || 0));
  }, [computedCountedCash, baselineFloatRetained]);

  // Parked Carts (Hold tickets)
  const [parkedTickets, setParkedTickets] = useState<ParkedTicket[]>([]);
  const [showParkedModal, setShowParkedModal] = useState(false);

  // Completed sale state & receipt
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isCheckoutSuccess, setIsCheckoutSuccess] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch available serials whenever serialTargetProduct changes
  useEffect(() => {
    if (serialTargetProduct && showSerialModal) {
      setIsLoadingSerials(true);
      fetch(`/api/inventory/serials?productId=${serialTargetProduct.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d?.data?.serials) {
            setAvailableDbSerials(d.data.serials.map((s: any) => s.serialNumber));
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingSerials(false));
    }
  }, [serialTargetProduct, showSerialModal]);

  const addToCart = useCallback((product: POSProduct, customSerial?: string) => {
    // If product is serialized and no serial was provided, trigger serial capture modal
    if (product.hasSerials && !customSerial) {
      setSerialTargetProduct(product);
      setTempSerials([]);
      setTempSerialScan('');
      setShowSerialModal(true);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          addToast({
            title: "Stock Boundary Reached",
            message: `Only ${product.stock} units available in Dire Dawa registry.`,
            type: "warning",
          });
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                qty: item.qty + 1,
                serialNumbers: customSerial
                  ? [...(item.serialNumbers || []), customSerial]
                  : item.serialNumbers,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          ...product,
          qty: 1,
          discount: 0,
          serialNumbers: customSerial ? [customSerial] : undefined,
        },
      ];
    });
  }, [addToast]);

  const handleConfirmSerials = () => {
    if (!serialTargetProduct) return;

    if (tempSerials.length === 0) {
      addToast({
        title: "Serial Number Mandatory",
        message: "High-value serialized products require at least one IMEI/Serial tag.",
        type: "warning",
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === serialTargetProduct.id);
      if (existing) {
        return prev.map((item) =>
          item.id === serialTargetProduct.id
            ? {
                ...item,
                qty: tempSerials.length,
                serialNumbers: tempSerials,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          ...serialTargetProduct,
          qty: tempSerials.length,
          discount: 0,
          serialNumbers: tempSerials,
        },
      ];
    });

    setShowSerialModal(false);
    setSerialTargetProduct(null);
    setTempSerials([]);
  };

  // Enterprise Hardware HID Barcode Scanner Integration
  useBarcodeScanner({
    onScan: (scannedCode) => {
      const cleanCode = scannedCode.trim().toLowerCase();
      const matched = catalog.find(
        (p) =>
          p.barcode.toLowerCase() === cleanCode ||
          p.sku.toLowerCase() === cleanCode
      );
      if (matched) {
        addToCart(matched);
        addToast({
          title: "Barcode Scanned",
          message: `Added ${matched.name} (${matched.sku}) to cart`,
          type: "success",
        });
      } else {
        addToast({
          title: "Item Not Recognized",
          message: `No active SKU matches scanned barcode: "${scannedCode}"`,
          type: "warning",
        });
      }
    },
  });

  // Hotkeys Listener: [F2] Search, [F8] Park Cart, [F9] Settle & Print
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // [F2] Focus Search / Scanner
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // [F8] Park Cart
      if (e.key === "F8") {
        e.preventDefault();
        handleParkCart();
        return;
      }

      // [F9] Tender / Complete
      if (e.key === "F9") {
        e.preventDefault();
        handleCompleteSale();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, globalDiscount, paymentMethod, amountTendered, customerName]);

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.qty + delta;
            if (nextQty <= 0) return null;
            if (nextQty > item.stock) {
              addToast({
                title: "Maximum Stock Exceeded",
                message: `Cannot ring up more than ${item.stock} units.`,
                type: "warning",
              });
              return item;
            }

            if (item.hasSerials && delta > 0) {
              setSerialTargetProduct(item);
              setTempSerials(item.serialNumbers || []);
              setShowSerialModal(true);
              return item;
            }

            return {
              ...item,
              qty: nextQty,
              serialNumbers: item.serialNumbers ? item.serialNumbers.slice(0, nextQty) : undefined,
            };
          }
          return item;
        })
        .filter(Boolean) as POSCartItem[]
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const totalItemDiscounts = cart.reduce((acc, item) => acc + (item.discount || 0), 0);
  const grandTotal = Math.max(0, subtotal - totalItemDiscounts - (Number(globalDiscount) || 0));
  const tenderedNum = Number(amountTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - grandTotal);

  const filteredProducts = useMemo(() => {
    return catalog.filter((p) => {
      const matchesCat = selectedCategory === "All Accessories" || p.category === selectedCategory;
      const matchesQuery =
        searchQuery === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery);
      return matchesCat && matchesQuery;
    });
  }, [catalog, selectedCategory, searchQuery]);

  // Park Cart Feature (Hold Ticket)
  const handleParkCart = () => {
    if (cart.length === 0) {
      addToast({
        title: "Empty Ticket",
        message: "Add items before parking this sale.",
        type: "info",
      });
      return;
    }

    const newTicket: ParkedTicket = {
      id: `park-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerName,
      cart,
      globalDiscount,
      paymentMethod,
      total: grandTotal,
    };

    setParkedTickets((prev) => [newTicket, ...prev]);
    resetTerminal();
    addToast({
      title: "Ticket Parked [F8]",
      message: `Held sale for ${newTicket.customerName} (${formatETB(newTicket.total)})`,
      type: "info",
    });
  };

  const handleResumeParkedTicket = (ticket: ParkedTicket) => {
    setCart(ticket.cart);
    setCustomerName(ticket.customerName);
    setGlobalDiscount(ticket.globalDiscount);
    setPaymentMethod(ticket.paymentMethod);
    setParkedTickets((prev) => prev.filter((t) => t.id !== ticket.id));
    setShowParkedModal(false);
    addToast({
      title: "Cart Resumed",
      message: `Restored cart for ${ticket.customerName}`,
      type: "success",
    });
  };

  // Execution after validation and potential Four-Eyes verification
  const executeFinalCheckout = (approvedManagerPin?: string) => {
    // Map to AppContext SaleItem
    const saleItems = cart.map((item) => ({
      productId: item.id,
      name: item.name,
      sku: item.sku,
      costPrice: item.costPrice || Math.round(item.price * 0.7),
      quantity: item.qty,
      unitPrice: item.price,
      discount: item.discount || 0,
      total: item.price * item.qty - (item.discount || 0),
      serialNumbers: item.serialNumbers,
    }));

    // Method mapping
    const methodMapping: Record<POSPaymentMethod, Sale["paymentMethod"]> = {
      telebirr: "telebirr",
      cbe: "cbe_birr",
      cash: "cash",
      bank: "bank_transfer",
      credit: "credit",
    };

    const createdSale = recordSale({
      customerName,
      customerType: "retail",
      items: saleItems,
      subtotal,
      discount: totalItemDiscounts + (Number(globalDiscount) || 0),
      tax: settings.isTaxEnabled ? Math.round(grandTotal * (settings.taxRate / 100)) : 0,
      grandTotal,
      paymentMethod: methodMapping[paymentMethod] || "telebirr",
      paymentReference: paymentReference || undefined,
      amountTendered: paymentMethod === "cash" && tenderedNum > 0 ? tenderedNum : undefined,
      changeGiven: paymentMethod === "cash" && tenderedNum > 0 ? changeDue : undefined,
      cashierId: authUser?.id || "usr-01",
      cashierName: authUser?.fullName || "Nasir Amme",
      notes: "POS Live Terminal Checkout (Anti-Theft Audited)",
      managerPin: approvedManagerPin,
    });

    setCompletedSale(createdSale);
    setIsCheckoutSuccess(true);
    addToast({
      title: "Sale Finalized & Recorded",
      message: `Receipt ${createdSale.receiptNumber} issued. Inventory decremented.`,
      type: "success",
    });
  };

  // Tender / Complete Sale Entrypoint
  const handleCompleteSale = () => {
    if (cart.length === 0) {
      addToast({
        title: "Empty Register Cart",
        message: "Please scan or click items to add them to the ticket.",
        type: "warning",
      });
      return;
    }

    if (paymentMethod === "cash" && tenderedNum > 0 && tenderedNum < grandTotal) {
      addToast({
        title: "Insufficient Cash Tendered",
        message: `Amount tendered (${formatETB(tenderedNum)}) is less than total (${formatETB(grandTotal)}).`,
        type: "warning",
      });
      return;
    }

    // Check Serialized Items Custody
    for (const item of cart) {
      if (item.hasSerials) {
        const attached = item.serialNumbers || [];
        if (attached.length < item.qty) {
          addToast({
            title: "Serialized Custody Required",
            message: `Item "${item.name}" requires ${item.qty} serial number(s). Currently attached: ${attached.length}.`,
            type: "warning",
          });
          setSerialTargetProduct(item);
          setTempSerials(attached);
          setShowSerialModal(true);
          return;
        }
      }
    }

    // Four-Eyes Check: If discounts applied and cashier is not manager/admin
    const totalDiscount = totalItemDiscounts + (Number(globalDiscount) || 0);
    const isManagerOrAdmin = roles.includes('admin') || roles.includes('manager');

    if (totalDiscount > 0 && !isManagerOrAdmin) {
      setFourEyesError(null);
      setManagerPinInput("");
      setShowFourEyesModal(true);
      return;
    }

    executeFinalCheckout();
  };

  const handleVerifyAndApproveFourEyes = async () => {
    if (!managerPinInput.trim()) {
      setFourEyesError("Please enter manager PIN");
      return;
    }
    setIsVerifyingPin(true);
    setFourEyesError(null);
    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: managerPinInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFourEyesError(data.error?.message || "Invalid Manager PIN. Authorization rejected.");
        return;
      }
      setShowFourEyesModal(false);
      executeFinalCheckout(managerPinInput.trim());
    } catch (err) {
      setFourEyesError("Failed to verify manager PIN");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleBlindDropSubmit = async () => {
    const counted = computedCountedCash;
    if (counted <= 0) {
      addToast({
        title: "Zero Counted Cash",
        message: "Please enter your physical banknote counts across the denominations.",
        type: "warning",
      });
      return;
    }

    if (!activeSession) {
      addToast({
        title: "No Active Session",
        message: "No open cash session was found to close.",
        type: "warning",
      });
      return;
    }

    setIsSubmittingBlindDrop(true);
    try {
      const breakdownNotes = `[Denominations: 200x${denominations.note200}, 100x${denominations.note100}, 50x${denominations.note50}, 10x${denominations.note10}, 5x${denominations.note5}, coins:${denominations.coins} ETB] [Safe Drop: ${safeDropRecordCode}, Retained: ${baselineFloatRetained} ETB, Safe Drop Amount: ${netSafeDropAmount} ETB] ${blindDropNotes}`.trim();

      const res = await fetch('/api/v1/pos/shifts/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          closingCashCounted: counted,
          notes: breakdownNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        addToast({
          title: "Shift Close Failed",
          message: data.error?.message || "Error closing shift",
          type: "error",
        });
        return;
      }

      const session = data.data.session;
      const diff = Number(session.cashDifference || 0);
      const expected = Number(session.expectedCash || 0);

      const zReportPayload: ZReportData = {
        storeName: settings.shopName || "Nasir Amme Electronics",
        branchName: "DD-MAIN-01",
        storeAddress: settings.city ? `Kebele 02, Commercial District, ${settings.city}` : "Kebele 02, Commercial District, Dire Dawa",
        tin: settings.tinNumber || "DEMO-TIN-0049281734",
        tel: settings.phonePrimary || "+251 915 00 11 22",
        sessionNumber: session.sessionNumber,
        terminalId: "Till #01 (Terminal 01)",
        cashierName: session.cashier?.fullName || authUser?.fullName || "Tigist Alem",
        supervisorName: authUser?.roles?.includes('admin') ? "Nasir Amme (Admin)" : "Yonas Bekele (Store Manager)",
        openedAt: new Date(session.openedAt).toLocaleString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        closedAt: new Date(session.closedAt || new Date()).toLocaleString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        openingFloat: Number(session.openingFloat || 0),
        netCashSales: Number(session.totalSalesCash || 0) - Number(session.totalRefundsCash || 0),
        cashRefunds: Number(session.totalRefundsCash || 0),
        expectedDrawerCash: expected,
        physicalCountedCash: counted,
        discrepancy: diff,
        denominations,
        safeDropRecordCode,
        baselineFloatRetained,
        netSafeDropAmount,
        telebirrTotal: Number(session.totalTelebirr || 0),
        cbeBirrTotal: Number(session.totalCbeBirr || 0),
        otherTotal: Number(session.totalOther || 0),
        notes: blindDropNotes,
      };

      setBlindDropResult(zReportPayload);
      setActiveSession(null);
      addToast({
        title: "Shift Closed & Z-Report Generated",
        message: Math.abs(diff) < 0.01
          ? "Cleared in full: 0.00 ETB zero variance recorded."
          : `Shift closed with variance ${formatETB(diff)}.`,
        type: diff < 0 ? "warning" : "success",
      });
    } catch (err: any) {
      addToast({
        title: "Network Error",
        message: err.message || "Failed to submit blind drop",
        type: "error",
      });
    } finally {
      setIsSubmittingBlindDrop(false);
    }
  };

  const resetTerminal = () => {
    setCart([]);
    setGlobalDiscount(0);
    setAmountTendered("");
    setPaymentReference("");
    setCustomerName("Walk-in Customer");
    setIsCheckoutSuccess(false);
    setCompletedSale(null);
  };

  // Active cashier metadata
  const activeCashierName = authUser?.fullName || "Nasir Amme";

  // ReceiptData mapped from completed sale
  const receiptData: ReceiptData | null = useMemo(() => {
    if (!completedSale) return null;
    return {
      storeName: settings.shopName || "Nasir Amme Electronics",
      storeCity: settings.city || "Dire Dawa",
      storeCountry: "Ethiopia",
      tin: settings.tinNumber || "DEMO-TIN-0049281734",
      tel: settings.phonePrimary || "+251 915 00 11 22",
      receiptNo: completedSale.receiptNumber,
      dateTime: new Date(completedSale.date).toLocaleString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      cashierName: completedSale.cashierName,
      customerName: completedSale.customerName,
      items: completedSale.items.map((i) => ({
        name: i.name,
        sku: i.sku,
        qty: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
      })),
      subtotal: completedSale.subtotal,
      vatRate: settings.isTaxEnabled ? settings.taxRate : 0,
      vatAmount: completedSale.tax,
      total: completedSale.grandTotal,
      paymentMode: completedSale.paymentMethod,
      returnPolicyDays: 3,
      softwareCredit: "Powered by Nasir Amme Electronics Retail System",
    };
  }, [completedSale, settings]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans select-none overflow-hidden transition-colors duration-200">
      
      {/* Terminal Context Bar */}
      <div className="h-11 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between text-xs shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-900 dark:text-slate-200">Terminal 01</span>
          </div>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="text-slate-600 dark:text-slate-400">
            Shift: <strong className="font-mono text-slate-900 dark:text-slate-200">{activeSession?.sessionNumber || "No Active Shift"}</strong> • Cashier: <strong className="text-slate-900 dark:text-slate-200">{activeCashierName}</strong>
          </span>
          <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-600 dark:text-slate-400 hidden sm:inline">
            Branch: <span className="font-mono text-slate-900 dark:text-slate-200">DD-MAIN-01 (Dire Dawa)</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Blind Shift Drop Trigger */}
          {activeSession && (
            <button
              onClick={() => {
                setBlindDropResult(null);
                setDenominations({
                  note200: 0,
                  note100: 0,
                  note50: 0,
                  note10: 0,
                  note5: 0,
                  coins: 0,
                });
                setBlindDropNotes("");
                setShowBlindDropModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 rounded-md text-[11px] font-semibold hover:bg-rose-500/20 transition-colors cursor-pointer"
              title="Close shift with blind cash count"
            >
              <Lock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Close Shift (Z-Report)</span>
            </button>
          )}

          {/* Parked Carts indicator */}
          {parkedTickets.length > 0 && (
            <button
              onClick={() => setShowParkedModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-md text-[11px] font-medium hover:bg-amber-500/20 transition-colors cursor-pointer"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>{parkedTickets.length} Parked</span>
            </button>
          )}

          {/* Quick Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            )}
          </button>

          {/* Hotkeys Legend */}
          <div className="hidden lg:flex items-center gap-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
            <span>[F2] Search</span>
            <span>[F8] Park</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">[F9] Tender</span>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Catalog Browser (Left 60%) & Live Cart Ticket (Right 40%) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Product Browser & Fast Barcode Search (60%) */}
        <div className="w-[60%] flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
          
          {/* Search & Barcode Scan Input */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 flex items-center gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Scan hardware barcode or type SKU / title... [F2]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-sans shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => searchInputRef.current?.focus()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0 transition-colors"
              title="Scanner is hardware HID listening on any screen keypress"
            >
              <Barcode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Scanner Active</span>
            </button>
          </div>

          {/* Category Chips Bar */}
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white shadow-xs font-semibold"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 content-start">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 text-center">
                <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2 stroke-1" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-400">No matching products found</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-600 mt-0.5">Try searching with a different SKU or barcode</p>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const inCart = cart.find((item) => item.id === p.id);
                const isStockout = p.stock <= 0;

                return (
                  <button
                    key={p.id}
                    disabled={isStockout}
                    onClick={() => addToCart(p)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all relative cursor-pointer shadow-xs ${
                      isStockout
                        ? "opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                        : "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-slate-50/80 dark:hover:bg-slate-800/70 active:scale-[0.98]"
                    }`}
                  >
                    {inCart && (
                      <span className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-mono font-bold h-5 w-5 rounded-full flex items-center justify-center shadow-xs">
                        {inCart.qty}
                      </span>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block truncate">{p.sku}</span>
                        {p.hasSerials && (
                          <span className="px-1 py-0.2 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] font-semibold rounded border border-purple-500/20">
                            IMEI
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 leading-snug line-clamp-2 mt-0.5">
                        {p.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-baseline justify-between">
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {p.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                        <span className="text-[9px] font-sans text-slate-500 dark:text-slate-400">ETB</span>
                      </span>
                      <span
                        className={`text-[10px] font-mono ${
                          p.stock <= 5 ? "text-amber-600 dark:text-amber-400 font-bold" : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {p.stock} left
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Cart & Settlement Panel (40%) */}
        <div className="w-[40%] flex flex-col bg-white dark:bg-slate-900">
          
          {/* Customer Selection Bar */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 flex-1 mr-2">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer Name..."
                className="bg-transparent text-xs font-semibold text-slate-900 dark:text-slate-200 border-b border-dashed border-slate-300 dark:border-slate-700 focus:outline-none focus:border-indigo-500 w-full"
              />
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={resetTerminal}
                  title="Clear Cart"
                  className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleParkCart}
                disabled={cart.length === 0}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                title="Park Cart [F8]"
              >
                <PauseCircle className="w-3 h-3 text-amber-500" />
                <span>Park</span>
              </button>
            </div>
          </div>

          {/* Cart Items Scroll Table */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs p-6 text-center">
                <Barcode className="w-10 h-10 stroke-1 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-400">Register Ticket Empty</p>
                <p className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-500">Scan product barcode [F2] or click items from catalog</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span>{item.price.toFixed(2)} ETB</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {(item.price * item.qty).toFixed(2)} ETB
                      </span>
                    </div>

                    {/* Serial Number Tags if Serialized */}
                    {item.hasSerials && (
                      <div className="mt-1 flex flex-wrap gap-1 items-center">
                        {item.serialNumbers && item.serialNumbers.length > 0 ? (
                          item.serialNumbers.map((s, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 text-[10px] font-mono text-purple-700 dark:text-purple-300 rounded"
                            >
                              IMEI: {s}
                            </span>
                          ))
                        ) : (
                          <button
                            onClick={() => {
                              setSerialTargetProduct(item);
                              setTempSerials([]);
                              setShowSerialModal(true);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 underline font-semibold"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>Assign {item.qty} IMEI(s)</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity Adjustment Stepper */}
                  <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-0.5">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-mono text-xs font-bold text-slate-900 dark:text-slate-200">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                      title="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded cursor-pointer transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Payment & Ledger Controls */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 space-y-3 shrink-0">
            
            {/* Tender Method Selector */}
            <div className="grid grid-cols-5 gap-1">
              {[
                { id: "telebirr", label: "telebirr", icon: Smartphone },
                { id: "cbe", label: "CBE Birr", icon: CreditCard },
                { id: "cash", label: "Cash Till", icon: Banknote },
                { id: "bank", label: "Bank Inv", icon: Landmark },
                { id: "credit", label: "Credit", icon: Receipt },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setPaymentMethod(id as POSPaymentMethod)}
                  className={`p-2 rounded-lg border flex flex-col items-center gap-1 text-[11px] transition-colors cursor-pointer shadow-2xs ${
                    paymentMethod === id
                      ? "bg-indigo-50 dark:bg-indigo-600/15 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>

            {/* Subtotal & Adjustment Fields */}
            <div className="space-y-1.5 text-xs font-mono pt-1">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal ({cart.reduce((a, b) => a + b.qty, 0)} units):</span>
                <span>{subtotal.toFixed(2)} ETB</span>
              </div>

              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1 font-sans">
                  <Percent className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> Register Discount:
                </span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={globalDiscount || ""}
                  onChange={(e) => setGlobalDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-24 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2 py-0.5 text-right text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
                />
              </div>

              {/* Reference number for electronic transfers or bank invoices */}
              {(paymentMethod === "telebirr" || paymentMethod === "cbe" || paymentMethod === "bank") && (
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 pt-1">
                  <span className="font-sans text-[11px]">{paymentMethod === "bank" ? "Wire / Inv Ref:" : "Tx / SMS Ref:"}</span>
                  <input
                    type="text"
                    placeholder={paymentMethod === "bank" ? "e.g. CBE-TX-9012" : "e.g. CI947120"}
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-32 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2 py-0.5 text-right text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
                  />
                </div>
              )}

              {/* Cash tendered & change calculation */}
              {paymentMethod === "cash" && (
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800/80">
                  <span className="font-sans">Cash Tendered:</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    className="w-28 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2 py-0.5 text-right text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
                  />
                </div>
              )}

              {paymentMethod === "cash" && tenderedNum > 0 && (
                <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400 font-bold">
                  <span className="font-sans">Change Due:</span>
                  <span>{changeDue.toFixed(2)} ETB</span>
                </div>
              )}

              <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="font-sans">Grand Total:</span>
                <span className="text-emerald-600 dark:text-emerald-400">{grandTotal.toFixed(2)} ETB</span>
              </div>
            </div>

            {/* Complete Sale Action Button */}
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleCompleteSale}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-[0.99]"
            >
              <span>Tender & Issue Receipt [F9]</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Four-Eyes Principle Manager PIN Override Modal */}
      {showFourEyesModal && (
        <Modal
          isOpen={showFourEyesModal}
          onClose={() => setShowFourEyesModal(false)}
          size="sm"
          title={
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-5 h-5" />
              <span>Four-Eyes Manager Authorization</span>
            </div>
          }
          footer={
            <div className="flex justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowFourEyesModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded font-medium"
              >
                Cancel Sale
              </button>
              <button
                type="button"
                disabled={isVerifyingPin || !managerPinInput}
                onClick={handleVerifyAndApproveFourEyes}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded flex items-center gap-1.5"
              >
                {isVerifyingPin ? "Verifying..." : "Approve Discount"}
              </button>
            </div>
          }
        >
          <div className="space-y-3 py-1">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300">
              <p className="font-semibold">Anti-Theft Protocol Enforcement:</p>
              <p className="mt-0.5">
                Discounts or price overrides require supervisor credentials. Enter an active Store Manager or Admin PIN (e.g. 1234).
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Manager / Admin Security PIN:
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  maxLength={8}
                  placeholder="Enter 4-digit PIN"
                  value={managerPinInput}
                  onChange={(e) => setManagerPinInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVerifyAndApproveFourEyes();
                  }}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-center font-mono tracking-widest text-base text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {fourEyesError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                {fourEyesError}
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* Serial Number / IMEI Capture Modal */}
      {showSerialModal && serialTargetProduct && (
        <Modal
          isOpen={showSerialModal}
          onClose={() => setShowSerialModal(false)}
          size="md"
          title={
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Barcode className="w-5 h-5" />
              <span>Serialized Custody: Assign IMEI</span>
            </div>
          }
          footer={
            <div className="flex justify-between items-center w-full">
              <span className="text-xs text-slate-500 font-mono">
                {tempSerials.length} IMEI(s) selected
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSerialModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSerials}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded"
                >
                  Attach to Ticket
                </button>
              </div>
            </div>
          }
        >
          <div className="space-y-3 py-1">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs">
              <p className="font-semibold text-slate-900 dark:text-white">{serialTargetProduct.name}</p>
              <p className="font-mono text-slate-500 dark:text-slate-400 mt-0.5">SKU: {serialTargetProduct.sku}</p>
            </div>

            {/* Quick manual scan or type */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Scan IMEI Barcode or Type Serial:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. SN-AIRPOD-001"
                  value={tempSerialScan}
                  onChange={(e) => setTempSerialScan(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tempSerialScan.trim()) {
                      const clean = tempSerialScan.trim();
                      if (!tempSerials.includes(clean)) {
                        setTempSerials([...tempSerials, clean]);
                      }
                      setTempSerialScan('');
                    }
                  }}
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (tempSerialScan.trim()) {
                      const clean = tempSerialScan.trim();
                      if (!tempSerials.includes(clean)) {
                        setTempSerials([...tempSerials, clean]);
                      }
                      setTempSerialScan('');
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700"
                >
                  Add
                </button>
              </div>
            </div>

            {/* In-Stock Available Serials Picker */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Available In-Stock Units in Dire Dawa Vault:
              </label>
              {isLoadingSerials ? (
                <p className="text-xs text-slate-400 py-2">Loading serial numbers...</p>
              ) : availableDbSerials.length === 0 ? (
                <p className="text-xs text-slate-400 py-1">No pre-registered serials found in database. Enter manually above.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800">
                  {availableDbSerials.map((s) => {
                    const isSelected = tempSerials.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setTempSerials(tempSerials.filter((x) => x !== s));
                          } else {
                            setTempSerials([...tempSerials, s]);
                          }
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-mono cursor-pointer border transition-colors ${
                          isSelected
                            ? "bg-purple-600 text-white border-purple-600 font-bold"
                            : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-400"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Currently Selected Serials */}
            {tempSerials.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Attached to this line item:</span>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {tempSerials.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-mono rounded"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => setTempSerials(tempSerials.filter((x) => x !== s))}
                        className="text-emerald-600 hover:text-rose-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Blind Cash Register Drop Modal with Denominations & Dual-Signature Z-Report */}
      {showBlindDropModal && (
        <Modal
          isOpen={showBlindDropModal}
          onClose={() => setShowBlindDropModal(false)}
          size={blindDropResult ? "lg" : "md"}
          title={
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Lock className="w-5 h-5" />
              <span>{blindDropResult ? "Official End-of-Shift Z-Report" : "Blind Cash Reconciliation & Shift Close"}</span>
            </div>
          }
          footer={
            <div className="flex justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowBlindDropModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded font-medium cursor-pointer"
              >
                Close
              </button>
              {!blindDropResult && (
                <button
                  type="button"
                  disabled={isSubmittingBlindDrop || computedCountedCash <= 0}
                  onClick={handleBlindDropSubmit}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSubmittingBlindDrop ? "Reconciling..." : "Submit Blind Count & Generate Z-Report"}
                </button>
              )}
            </div>
          }
        >
          <div className="space-y-4 py-1">
            {!blindDropResult ? (
              <>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-800 dark:text-rose-300">
                  <p className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    Dire Dawa Zero-Theft Handover Protocol:
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed">
                    Count physical banknotes by denomination in the drawer independently. System calculated expected totals remain strictly hidden to ensure zero bias. A 0.00 ETB variance completely clears the cashier.
                  </p>
                </div>

                {/* Denomination Breakdown Table */}
                <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>ETB Denomination</span>
                    <span>Note Count</span>
                    <span className="w-24 text-right">Subtotal</span>
                  </div>

                  {[
                    { key: "note200", label: "200 ETB Note", val: 200, badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
                    { key: "note100", label: "100 ETB Note", val: 100, badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30" },
                    { key: "note50",  label: "50 ETB Note",  val: 50,  badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30" },
                    { key: "note10",  label: "10 ETB Note",  val: 10,  badge: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30" },
                    { key: "note5",   label: "5 ETB Note",   val: 5,   badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30" },
                  ].map(({ key, label, val, badge }) => {
                    const count = denominations[key as keyof DenominationCounts];
                    return (
                      <div key={key} className="flex items-center justify-between gap-2 text-xs">
                        <span className={`px-2 py-0.5 rounded border text-[11px] font-mono font-semibold ${badge}`}>
                          {label}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDenominations((prev) => ({
                              ...prev,
                              [key]: Math.max(0, (Number(prev[key as keyof DenominationCounts]) || 0) - 1),
                            }))}
                            className="w-6 h-6 flex items-center justify-center rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={count || ""}
                            onChange={(e) => {
                              const valNum = Math.max(0, parseInt(e.target.value) || 0);
                              setDenominations((prev) => ({ ...prev, [key]: valNum }));
                            }}
                            className="w-16 px-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center font-mono text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setDenominations((prev) => ({
                              ...prev,
                              [key]: (Number(prev[key as keyof DenominationCounts]) || 0) + 1,
                            }))}
                            className="w-6 h-6 flex items-center justify-center rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        <span className="w-24 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {formatETB(count * val)}
                        </span>
                      </div>
                    );
                  })}

                  {/* Loose coins / 1 ETB */}
                  <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span className="px-2 py-0.5 rounded border text-[11px] font-mono text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700">
                      Coins / 1 ETB Notes
                    </span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="0.00"
                      value={denominations.coins || ""}
                      onChange={(e) => {
                        const valNum = Math.max(0, parseFloat(e.target.value) || 0);
                        setDenominations((prev) => ({ ...prev, coins: valNum }));
                      }}
                      className="w-24 px-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-right font-mono text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                    />
                    <span className="w-24 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {formatETB(denominations.coins)}
                    </span>
                  </div>

                  {/* Total Physical Count Sum */}
                  <div className="pt-2 border-t-2 border-slate-300 dark:border-slate-700 flex justify-between items-baseline font-bold text-sm">
                    <span className="text-slate-900 dark:text-white">Physical Counted Cash:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 text-base">
                      {formatETB(computedCountedCash)}
                    </span>
                  </div>
                </div>

                {/* Safe Drop Handover Settings */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <Vault className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      Safe Drop Record Code:
                    </span>
                    <span className="font-mono font-bold text-amber-900 dark:text-amber-200 bg-amber-500/20 px-2 py-0.5 rounded">
                      {safeDropRecordCode}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">
                        Float to Retain in Till #01:
                      </label>
                      <input
                        type="number"
                        placeholder="5000.00"
                        value={baselineFloatRetained}
                        onChange={(e) => setBaselineFloatRetained(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-0.5">
                        Net Cash to Safe:
                      </label>
                      <div className="px-2 py-1 bg-white/70 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 truncate">
                        {formatETB(netSafeDropAmount)}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Handover Notes & Explanations:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. End of shift cash count complete. Handed over to Manager Yonas Bekele."
                    value={blindDropNotes}
                    onChange={(e) => setBlindDropNotes(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </>
            ) : (
              <div className="overflow-y-auto max-h-[75vh] flex justify-center py-1">
                <ZReportThermalSlip data={blindDropResult} showToolbar={true} />
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Checkout Success Modal with Instant Thermal Receipt Action */}
      {isCheckoutSuccess && completedSale && (
        <Modal
          isOpen={isCheckoutSuccess}
          onClose={resetTerminal}
          size="md"
          title={
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span>Checkout Successful</span>
            </div>
          }
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => setShowReceiptModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>View / Print Receipt</span>
              </button>

              <button
                type="button"
                onClick={resetTerminal}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
              >
                <span>New Register Sale</span>
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-center py-2">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {formatETB(completedSale.grandTotal)} Received
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Receipt <strong className="font-mono text-slate-800 dark:text-slate-200">{completedSale.receiptNumber}</strong> recorded in Dire Dawa ledger.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-left font-mono text-xs space-y-1 text-slate-700 dark:text-slate-300">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Customer:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">{completedSale.customerName}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Method:</span>
                <span className="uppercase text-slate-900 dark:text-slate-200 font-semibold">{completedSale.paymentMethod}</span>
              </div>
              {completedSale.amountTendered !== undefined && (
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Tendered:</span>
                  <span>{formatETB(completedSale.amountTendered)}</span>
                </div>
              )}
              {completedSale.changeGiven !== undefined && completedSale.changeGiven > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold">
                  <span>Change Given:</span>
                  <span>{formatETB(completedSale.changeGiven)}</span>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Thermal Receipt Preview Modal */}
      {showReceiptModal && receiptData && (
        <Modal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          size="lg"
          title="ESC/POS Thermal Receipt"
        >
          <div className="overflow-y-auto max-h-[75vh] flex justify-center py-2">
            <ThermalReceipt data={receiptData} showToolbar={true} />
          </div>
        </Modal>
      )}

      {/* Parked Carts Modal */}
      {showParkedModal && (
        <Modal
          isOpen={showParkedModal}
          onClose={() => setShowParkedModal(false)}
          size="md"
          title={
            <div className="flex items-center gap-2">
              <PauseCircle className="w-4 h-4 text-amber-500" />
              <span>Held / Parked Tickets</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {parkedTickets.length}
              </span>
            </div>
          }
        >
          <div className="space-y-2">
            {parkedTickets.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No held tickets at this time.</p>
            ) : (
              parkedTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-200">{ticket.customerName}</span>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{ticket.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      {ticket.cart.length} line items • <strong className="text-emerald-600 dark:text-emerald-400">{formatETB(ticket.total)}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleResumeParkedTicket(ticket)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      onClick={() => setParkedTickets((prev) => prev.filter((t) => t.id !== ticket.id))}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Modal>
      )}

    </div>
  );
}
