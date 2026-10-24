import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/authGuard';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import {
  DateRangePreset,
  getBusinessDateRange,
  getEATParts,
  formatStoreDate,
  formatStoreTime,
  STORE_TIMEZONE,
} from '@/lib/dateUtils';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // 1. Authorize: Admin or Store Manager clearance required
    const auth = await requireAuth(request);
    if (!auth.roles.includes('admin') && !auth.roles.includes('manager')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Unauthorized. Admin or Store Manager clearance required to inspect executive operations.',
            code: 'FORBIDDEN',
          },
        },
        { status: 403 }
      );
    }

    const shopId = auth.user.shopId || DEFAULT_SHOP_ID;

    // 2. Perform Real Database Health Check & Latency Timing
    const healthStart = performance.now();
    let isDbHealthy = true;
    let dbErrorMessage: string | null = null;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbErr: any) {
      isDbHealthy = false;
      dbErrorMessage = dbErr?.message || 'Database connection error';
    }
    const dbLatencyMs = Math.round(performance.now() - healthStart);

    // 3. Parse and Validate Date Range Query Parameters
    const searchParams = request.nextUrl.searchParams;
    const rangePreset = (searchParams.get('range') || 'today') as DateRangePreset;
    const customStart = searchParams.get('startDate') || undefined;
    const customEnd = searchParams.get('endDate') || undefined;

    const refDateParam = searchParams.get('referenceDate');
    const referenceDate = refDateParam ? new Date(refDateParam) : undefined;

    const period = getBusinessDateRange(rangePreset, customStart, customEnd, referenceDate);

    // Ledger query parameters
    const ledgerScope = searchParams.get('ledgerScope') || 'period'; // 'period' | 'all'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const search = searchParams.get('search')?.trim() || '';
    const paymentMethodFilter = searchParams.get('paymentMethod') || 'all';
    const statusFilter = searchParams.get('status') || 'all';

    // 4. Fetch Shop Configuration
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        id: true,
        name: true,
        legalName: true,
        city: true,
        currencyCode: true,
        timeZone: true,
        lowStockGlobalThreshold: true,
      },
    });

    const lowStockThreshold = shop?.lowStockGlobalThreshold || 8;

    // 5. Query Current Period Sales & Previous Period Sales
    const [currentSales, previousSales, currentReturns, previousReturns] = await Promise.all([
      prisma.sale.findMany({
        where: {
          shopId,
          status: { not: 'voided' },
          soldAt: { gte: period.startDate, lte: period.endDate },
        },
        include: {
          items: true,
          payments: true,
        },
      }),
      prisma.sale.findMany({
        where: {
          shopId,
          status: { not: 'voided' },
          soldAt: { gte: period.previousPeriod.startDate, lte: period.previousPeriod.endDate },
        },
        include: {
          items: true,
          payments: true,
        },
      }),
      prisma.saleReturn.findMany({
        where: {
          shopId,
          status: 'posted',
          createdAt: { gte: period.startDate, lte: period.endDate },
        },
        include: {
          items: {
            include: {
              saleItem: { select: { unitCostSnapshot: true } },
            },
          },
        },
      }),
      prisma.saleReturn.findMany({
        where: {
          shopId,
          status: 'posted',
          createdAt: { gte: period.previousPeriod.startDate, lte: period.previousPeriod.endDate },
        },
        include: {
          items: {
            include: {
              saleItem: { select: { unitCostSnapshot: true } },
            },
          },
        },
      }),
    ]);

    // Financial KPI aggregation helper
    const aggregateFinancials = (
      salesList: typeof currentSales,
      returnsList: typeof currentReturns
    ) => {
      let grossSales = 0;
      let discountsTotal = 0;
      let taxesTotal = 0;
      let grossCOGS = 0;

      for (const s of salesList) {
        grossSales += Number(s.subtotal || 0);
        discountsTotal += Number(s.discountTotal || 0);
        taxesTotal += Number(s.taxTotal || 0);
        for (const item of s.items) {
          grossCOGS += Number(item.lineCogs || 0);
        }
      }

      let returnsRefunded = 0;
      let restockedCOGS = 0;
      for (const r of returnsList) {
        returnsRefunded += Number(r.totalRefundETB || 0);
        for (const it of r.items) {
          if (it.disposition === 'restock' && it.saleItem) {
            restockedCOGS += Number(it.saleItem.unitCostSnapshot) * it.quantity;
          }
        }
      }

      const netSales = grossSales - discountsTotal;
      const netRevenue = netSales - returnsRefunded;
      const adjustedCOGS = Math.max(0, grossCOGS - restockedCOGS);
      const grossProfit = netRevenue - adjustedCOGS;
      const grossMarginPercent = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : null;
      const avgTxValue = salesList.length > 0 ? netSales / salesList.length : 0;

      return {
        grossSales,
        discountsTotal,
        taxesTotal,
        netSales,
        returnsRefunded,
        netRevenue,
        cogs: adjustedCOGS,
        grossProfit,
        grossMarginPercent,
        transactionCount: salesList.length,
        avgTxValue,
      };
    };

    const currentFin = aggregateFinancials(currentSales, currentReturns);
    const previousFin = aggregateFinancials(previousSales, previousReturns);

    // Percentage change calculator with safe zero-denominator handling
    const computeChange = (curr: number, prev: number) => {
      const diff = curr - prev;
      if (prev === 0) {
        return {
          diff,
          pct: curr === 0 ? 0 : null, // null indicates undefined (N/A) rather than 0%
        };
      }
      return {
        diff,
        pct: Math.round(((curr - prev) / prev) * 1000) / 10,
      };
    };

    const grossChange = computeChange(currentFin.grossSales, previousFin.grossSales);
    const netChange = computeChange(currentFin.netRevenue, previousFin.netRevenue);
    const profitChange = computeChange(currentFin.grossProfit, previousFin.grossProfit);
    const cogsChange = computeChange(currentFin.cogs, previousFin.cogs);
    const countChange = computeChange(currentFin.transactionCount, previousFin.transactionCount);
    const atvChange = computeChange(currentFin.avgTxValue, previousFin.avgTxValue);

    // 6. Current Inventory Valuation & Alerts (Active products)
    const activeProducts = await prisma.product.findMany({
      where: {
        shopId,
        deletedAt: null,
        isArchived: false,
        status: 'active',
      },
      select: {
        id: true,
        sku: true,
        name: true,
        brand: true,
        onHand: true,
        reorderLevel: true,
        averageCost: true,
        sellingPrice: true,
      },
      orderBy: { onHand: 'asc' },
    });

    let inventoryAssetCost = 0;
    let retailPotential = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalUnitsOnHand = 0;
    const criticalStockItems: Array<{
      id: string;
      sku: string;
      name: string;
      brand: string;
      onHand: number;
      reorderLevel: number;
      deficitUnits: number;
      sellingPrice: number;
      averageCost: number;
    }> = [];

    for (const p of activeProducts) {
      const onHand = p.onHand || 0;
      const cost = Number(p.averageCost || 0);
      const price = Number(p.sellingPrice || 0);
      const threshold = p.reorderLevel ?? lowStockThreshold;

      totalUnitsOnHand += onHand;
      inventoryAssetCost += cost * onHand;
      retailPotential += price * onHand;

      if (onHand === 0) {
        outOfStockCount++;
        criticalStockItems.push({
          id: p.id,
          sku: p.sku,
          name: p.name,
          brand: p.brand || 'Electronics',
          onHand,
          reorderLevel: threshold,
          deficitUnits: threshold,
          sellingPrice: price,
          averageCost: cost,
        });
      } else if (onHand <= threshold) {
        lowStockCount++;
        criticalStockItems.push({
          id: p.id,
          sku: p.sku,
          name: p.name,
          brand: p.brand || 'Electronics',
          onHand,
          reorderLevel: threshold,
          deficitUnits: threshold - onHand,
          sellingPrice: price,
          averageCost: cost,
        });
      }
    }

    // 7. Rolling / Periodic Performance Chart (Aggregated in a single time-window query)
    // Determine chart date range: default to last 7 days if preset is 'today' or 'yesterday'
    // so operators always see contextual trend trajectory, while respecting larger selected ranges.
    let chartStart = period.startDate;
    let chartEnd = period.endDate;
    if (rangePreset === 'today' || rangePreset === 'yesterday') {
      const chartPeriod = getBusinessDateRange('last_7_days');
      chartStart = chartPeriod.startDate;
      chartEnd = chartPeriod.endDate;
    }

    const [chartSales, chartReturns] = await Promise.all([
      prisma.sale.findMany({
        where: {
          shopId,
          status: { not: 'voided' },
          soldAt: { gte: chartStart, lte: chartEnd },
        },
        include: {
          items: {
            select: {
              lineSubtotal: true,
              lineTotal: true,
              lineCogs: true,
            },
          },
        },
      }),
      prisma.saleReturn.findMany({
        where: {
          shopId,
          status: 'posted',
          createdAt: { gte: chartStart, lte: chartEnd },
        },
        select: {
          totalRefundETB: true,
          createdAt: true,
        },
      }),
    ]);

    // Generate consecutive calendar days in Africa/Addis_Ababa
    const chartSeries: Array<{
      date: string;
      label: string;
      grossRevenue: number;
      netRevenue: number;
      grossProfit: number;
      cogs: number;
      orderCount: number;
      isCurrentDay: boolean;
    }> = [];

    const nowParts = getEATParts(new Date());
    const todayDateKey = `${nowParts.year}-${String(nowParts.month).padStart(2, '0')}-${String(nowParts.day).padStart(2, '0')}`;

    const cursorDate = new Date(chartStart.getTime());
    while (cursorDate <= chartEnd) {
      const p = getEATParts(cursorDate);
      const dateKey = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
      const isCurrentDay = dateKey === todayDateKey;
      const label = formatStoreDate(cursorDate);

      chartSeries.push({
        date: dateKey,
        label,
        grossRevenue: 0,
        netRevenue: 0,
        grossProfit: 0,
        cogs: 0,
        orderCount: 0,
        isCurrentDay,
      });

      cursorDate.setDate(cursorDate.getDate() + 1);
    }

    for (const s of chartSales) {
      const sp = getEATParts(s.soldAt);
      const key = `${sp.year}-${String(sp.month).padStart(2, '0')}-${String(sp.day).padStart(2, '0')}`;
      const bucket = chartSeries.find((b) => b.date === key);
      if (bucket) {
        const sub = Number(s.subtotal || 0);
        const disc = Number(s.discountTotal || 0);
        let cogs = 0;
        for (const item of s.items) {
          cogs += Number(item.lineCogs || 0);
        }
        bucket.grossRevenue += sub;
        bucket.netRevenue += sub - disc;
        bucket.cogs += cogs;
        bucket.grossProfit += sub - disc - cogs;
        bucket.orderCount += 1;
      }
    }

    for (const r of chartReturns) {
      const rp = getEATParts(r.createdAt);
      const key = `${rp.year}-${String(rp.month).padStart(2, '0')}-${String(rp.day).padStart(2, '0')}`;
      const bucket = chartSeries.find((b) => b.date === key);
      if (bucket) {
        const ref = Number(r.totalRefundETB || 0);
        bucket.netRevenue -= ref;
        bucket.grossProfit -= ref;
      }
    }

    // 8. Audited Receipt Ledger (Server-side Paginated & Filtered)
    const ledgerWhere: Prisma.SaleWhereInput = {
      shopId,
      ...(ledgerScope === 'period'
        ? {
            soldAt: { gte: period.startDate, lte: period.endDate },
          }
        : {}),
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(paymentMethodFilter !== 'all'
        ? {
            payments: {
              some: {
                method: { equals: paymentMethodFilter, mode: 'insensitive' },
              },
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { receiptNumber: { contains: search, mode: 'insensitive' } },
              { customer: { displayName: { contains: search, mode: 'insensitive' } } },
              { customer: { phone: { contains: search, mode: 'insensitive' } } },
              { cashier: { fullName: { contains: search, mode: 'insensitive' } } },
              { notes: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [totalLedgerCount, ledgerSales] = await Promise.all([
      prisma.sale.count({ where: ledgerWhere }),
      prisma.sale.findMany({
        where: ledgerWhere,
        orderBy: { soldAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          customer: { select: { displayName: true, phone: true } },
          cashier: { select: { fullName: true, email: true } },
          items: {
            select: {
              quantity: true,
              unitPrice: true,
              lineTotal: true,
              nameSnapshot: true,
            },
          },
          payments: {
            select: {
              method: true,
              status: true,
              amount: true,
              providerReference: true,
            },
          },
        },
      }),
    ]);

    const receiptItems = ledgerSales.map((s) => {
      const lineCount = s.items.length;
      const totalUnits = s.items.reduce((sum, it) => sum + it.quantity, 0);
      const primaryPayment = s.payments[0];
      const settledAmount = s.payments
        .filter((p) => p.status === 'succeeded')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      let methodDisplay = 'Cash';
      const m = (primaryPayment?.method || 'cash').toLowerCase();
      if (m.includes('telebirr')) methodDisplay = 'Telebirr';
      else if (m.includes('cbe')) methodDisplay = 'CBE Birr';
      else if (m.includes('bank')) methodDisplay = 'Bank Invoice';
      else if (m.includes('credit')) methodDisplay = 'Store Credit';

      return {
        id: s.id,
        receiptNumber: s.receiptNumber,
        soldAt: s.soldAt.toISOString(),
        formattedDate: formatStoreDate(s.soldAt),
        formattedTime: formatStoreTime(s.soldAt),
        customerName: s.customer?.displayName || s.notes || 'Walk-in Counter',
        customerPhone: s.customer?.phone || null,
        cashierName: s.cashier?.fullName || 'Cashier',
        lineItemCount: lineCount,
        totalQuantity: totalUnits,
        paymentMethod: methodDisplay,
        providerReference: primaryPayment?.providerReference || null,
        paymentStatus: primaryPayment?.status || 'succeeded',
        saleStatus: s.status,
        subtotal: Number(s.subtotal),
        discountTotal: Number(s.discountTotal),
        taxTotal: Number(s.taxTotal),
        grandTotal: Number(s.grandTotal),
        settledAmount,
      };
    });

    // 9. SKU Velocity: Top-selling products over selected period
    // If the selected period has no sales (e.g. fresh shift today), also fetch
    // the last 30-day velocity to present useful insights with clear period metadata.
    let velocitySalesWhere: Prisma.SaleItemWhereInput = {
      sale: {
        shopId,
        status: { not: 'voided' },
        soldAt: { gte: period.startDate, lte: period.endDate },
      },
    };

    let velocityItems = await prisma.saleItem.findMany({
      where: velocitySalesWhere,
      select: {
        productId: true,
        nameSnapshot: true,
        quantity: true,
        lineTotal: true,
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            brand: true,
            onHand: true,
            reorderLevel: true,
            averageCost: true,
            sellingPrice: true,
          },
        },
      },
    });

    let isVelocityFallback = false;
    if (velocityItems.length === 0) {
      // Query recent 30-day sales so the velocity table provides intelligence rather than empty void
      isVelocityFallback = true;
      const recent30Days = getBusinessDateRange('last_30_days');
      velocityItems = await prisma.saleItem.findMany({
        where: {
          sale: {
            shopId,
            status: { not: 'voided' },
            soldAt: { gte: recent30Days.startDate, lte: recent30Days.endDate },
          },
        },
        select: {
          productId: true,
          nameSnapshot: true,
          quantity: true,
          lineTotal: true,
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              brand: true,
              onHand: true,
              reorderLevel: true,
              averageCost: true,
              sellingPrice: true,
            },
          },
        },
      });
    }

    const velocityMap: Record<
      string,
      {
        id: string;
        sku: string;
        name: string;
        brand: string;
        unitsSold: number;
        grossSalesRevenue: number;
        currentStock: number;
        reorderLevel: number;
        sellingPrice: number;
        averageCost: number;
        inventoryValueCost: number;
        stockStatus: 'out_of_stock' | 'low_stock' | 'optimal';
      }
    > = {};

    for (const it of velocityItems) {
      const pid = it.productId;
      if (!velocityMap[pid]) {
        const onHand = it.product?.onHand ?? 0;
        const reorder = it.product?.reorderLevel ?? lowStockThreshold;
        const cost = Number(it.product?.averageCost || 0);
        const price = Number(it.product?.sellingPrice || 0);

        let stockStatus: 'out_of_stock' | 'low_stock' | 'optimal' = 'optimal';
        if (onHand === 0) stockStatus = 'out_of_stock';
        else if (onHand <= reorder) stockStatus = 'low_stock';

        velocityMap[pid] = {
          id: pid,
          sku: it.product?.sku || 'SKU',
          name: it.nameSnapshot || it.product?.name || 'Item',
          brand: it.product?.brand || 'Electronics',
          unitsSold: 0,
          grossSalesRevenue: 0,
          currentStock: onHand,
          reorderLevel: reorder,
          sellingPrice: price,
          averageCost: cost,
          inventoryValueCost: onHand * cost,
          stockStatus,
        };
      }

      velocityMap[pid].unitsSold += it.quantity;
      velocityMap[pid].grossSalesRevenue += Number(it.lineTotal || 0);
    }

    const skuVelocity = Object.values(velocityMap)
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 6);

    // 10. Multi-Rail Tender Breakdown (Tied to Payments in Period)
    const periodPayments = await prisma.payment.findMany({
      where: {
        shopId,
        receivedAt: { gte: period.startDate, lte: period.endDate },
      },
      select: {
        method: true,
        status: true,
        amount: true,
      },
    });

    const railTotals: Record<string, { collected: number; count: number; name: string }> = {
      cash: { collected: 0, count: 0, name: 'Cash (Drawer)' },
      telebirr: { collected: 0, count: 0, name: 'Telebirr Merchant' },
      cbe_birr: { collected: 0, count: 0, name: 'CBE Birr (Commercial Bank)' },
      bank_transfer: { collected: 0, count: 0, name: 'Bank Invoice / Transfer' },
      other: { collected: 0, count: 0, name: 'Other Channels' },
    };

    let totalSettled = 0;
    let totalTransactions = 0;

    for (const p of periodPayments) {
      if (p.status === 'succeeded') {
        const amt = Number(p.amount || 0);
        const m = (p.method || 'cash').toLowerCase();
        let targetKey = 'other';
        if (m.includes('telebirr')) targetKey = 'telebirr';
        else if (m.includes('cbe')) targetKey = 'cbe_birr';
        else if (m.includes('cash')) targetKey = 'cash';
        else if (m.includes('bank') || m.includes('invoice')) targetKey = 'bank_transfer';

        railTotals[targetKey].collected += amt;
        railTotals[targetKey].count += 1;
        totalSettled += amt;
        totalTransactions += 1;
      }
    }

    const tenderChannels = Object.entries(railTotals).map(([rail, data]) => ({
      rail,
      displayName: data.name,
      collectedETB: data.collected,
      formatted: data.collected.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      transactionCount: data.count,
      percentageOfTotal: totalSettled > 0 ? Math.round((data.collected / totalSettled) * 1000) / 10 : 0,
    }));

    // 11. Authoritative POS Shift Status & Cash Session Telemetry
    const activeSession = await prisma.cashSession.findFirst({
      where: { shopId, status: 'open' },
      orderBy: { openedAt: 'desc' },
      include: {
        cashier: {
          select: { id: true, fullName: true, email: true },
        },
        payments: true,
      },
    });

    let shiftPayload: any = {
      isOpen: false,
      session: null,
      lastClosedSession: null,
    };

    if (activeSession) {
      let cashSales = 0;
      let cashRefunds = 0;
      let telebirr = 0;
      let cbeBirr = 0;
      let otherTenders = 0;

      for (const p of activeSession.payments) {
        const amt = Number(p.amount || 0);
        const m = p.method.toLowerCase();
        if (m.includes('cash')) {
          if (amt >= 0) cashSales += amt;
          else cashRefunds += Math.abs(amt);
        } else if (m.includes('telebirr')) telebirr += amt;
        else if (m.includes('cbe')) cbeBirr += amt;
        else otherTenders += amt;
      }

      const openingFloat = Number(activeSession.openingFloat || 0);
      const expectedDrawerCash = openingFloat + cashSales - cashRefunds;

      shiftPayload = {
        isOpen: true,
        session: {
          id: activeSession.id,
          sessionNumber: activeSession.sessionNumber,
          cashierId: activeSession.cashierId,
          cashierName: activeSession.cashier.fullName,
          cashierEmail: activeSession.cashier.email,
          openedAt: activeSession.openedAt.toISOString(),
          formattedOpenedAt: formatStoreTime(activeSession.openedAt),
          openingFloat,
          expectedDrawerCash,
          cashSales,
          cashRefunds,
          digitalTenders: {
            telebirr,
            cbeBirr,
            other: otherTenders,
          },
        },
        lastClosedSession: null,
      };
    } else {
      const lastClosed = await prisma.cashSession.findFirst({
        where: { shopId, status: 'closed' },
        orderBy: { closedAt: 'desc' },
        include: {
          cashier: { select: { fullName: true } },
        },
      });

      if (lastClosed) {
        shiftPayload.lastClosedSession = {
          sessionNumber: lastClosed.sessionNumber,
          closedAt: lastClosed.closedAt?.toISOString() || null,
          formattedClosedAt: lastClosed.closedAt ? formatStoreDate(lastClosed.closedAt) : null,
          closingCashCounted: Number(lastClosed.closingCashCounted || 0),
          cashDifference: Number(lastClosed.cashDifference || 0),
          cashierName: lastClosed.cashier.fullName,
        };
      }
    }

    // 12. Pending Purchase Orders for Procurement Fast-Track
    const pendingPurchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        shopId,
        status: { in: ['draft', 'ordered', 'partially_received'] },
      },
      include: {
        supplier: { select: { name: true } },
        items: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const formattedPendingPOs = pendingPurchaseOrders.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      supplierName: po.supplier.name,
      status: po.status,
      orderedAt: po.orderedAt ? formatStoreDate(po.orderedAt) : formatStoreDate(po.createdAt),
      grandTotal: Number(po.grandTotal),
      formattedTotal: Number(po.grandTotal).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      itemCount: po.items.length,
    }));

    // 13. Construct Complete Enterprise Response Payload
    return jsonSuccess({
      store: {
        id: shop?.id || DEFAULT_SHOP_ID,
        storeId: 'DD-MAIN-01',
        name: shop?.name || 'Nasir Amme Electronics',
        legalName: shop?.legalName || 'Nasir Amme Consumer Electronics Retail & Spares',
        city: shop?.city || 'Dire Dawa',
        currencyCode: shop?.currencyCode || 'ETB',
        timeZone: shop?.timeZone || STORE_TIMEZONE,
      },
      databaseHealth: {
        status: isDbHealthy ? 'healthy' : 'degraded',
        latencyMs: dbLatencyMs,
        checkedAt: new Date().toISOString(),
        engine: 'PostgreSQL 16 (Neon / Relational)',
        connected: isDbHealthy,
        errorMessage: dbErrorMessage,
      },
      period: {
        preset: rangePreset,
        label: period.label,
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        previousPeriod: {
          label: period.previousPeriod.label,
          startDate: period.previousPeriod.startDate.toISOString(),
          endDate: period.previousPeriod.endDate.toISOString(),
        },
      },
      kpis: {
        grossSalesRevenue: {
          current: currentFin.grossSales,
          formatted: currentFin.grossSales.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          previous: previousFin.grossSales,
          formattedPrevious: previousFin.grossSales.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          difference: grossChange.diff,
          changePercent: grossChange.pct,
        },
        netSalesRevenue: {
          current: currentFin.netRevenue,
          formatted: currentFin.netRevenue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          previous: previousFin.netRevenue,
          formattedPrevious: previousFin.netRevenue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          difference: netChange.diff,
          changePercent: netChange.pct,
        },
        grossProfit: {
          current: currentFin.grossProfit,
          formatted: currentFin.grossProfit.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          previous: previousFin.grossProfit,
          formattedPrevious: previousFin.grossProfit.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          difference: profitChange.diff,
          changePercent: profitChange.pct,
          grossMarginPercent: currentFin.grossMarginPercent,
        },
        cogs: {
          current: currentFin.cogs,
          formatted: currentFin.cogs.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          previous: previousFin.cogs,
          formattedPrevious: previousFin.cogs.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          difference: cogsChange.diff,
          changePercent: cogsChange.pct,
        },
        salesTransactionCount: {
          current: currentFin.transactionCount,
          previous: previousFin.transactionCount,
          difference: countChange.diff,
          changePercent: countChange.pct,
        },
        averageTransactionValue: {
          current: currentFin.avgTxValue,
          formatted: currentFin.avgTxValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          previous: previousFin.avgTxValue,
          formattedPrevious: previousFin.avgTxValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          difference: atvChange.diff,
          changePercent: atvChange.pct,
        },
        inventoryAssetCost: {
          value: inventoryAssetCost,
          formatted: inventoryAssetCost.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          activeSkuCount: activeProducts.length,
          totalUnitsOnHand,
        },
        retailPotential: {
          value: retailPotential,
          formatted: retailPotential.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          potentialProfit: retailPotential - inventoryAssetCost,
          formattedPotentialProfit: (retailPotential - inventoryAssetCost).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        },
        lowStockCount: {
          count: lowStockCount,
          threshold: lowStockThreshold,
        },
        outOfStockCount: {
          count: outOfStockCount,
        },
      },
      performanceChart: {
        periodLabel:
          rangePreset === 'today' || rangePreset === 'yesterday'
            ? 'Rolling 7 Days Trajectory'
            : period.label,
        series: chartSeries,
        summary: {
          totalGross: chartSeries.reduce((s, b) => s + b.grossRevenue, 0),
          totalNet: chartSeries.reduce((s, b) => s + b.netRevenue, 0),
          totalProfit: chartSeries.reduce((s, b) => s + b.grossProfit, 0),
        },
      },
      receiptLedger: {
        items: receiptItems,
        pagination: {
          page,
          limit,
          totalCount: totalLedgerCount,
          totalPages: Math.max(1, Math.ceil(totalLedgerCount / limit)),
        },
        scope: ledgerScope,
      },
      skuVelocity: {
        items: skuVelocity,
        isFallback: isVelocityFallback,
        fallbackPeriodLabel: 'Last 30 Days (Due to zero sales in current selection)',
      },
      tenderBreakdown: {
        channels: tenderChannels,
        totalSettledETB: totalSettled,
        formattedTotalSettled: totalSettled.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        totalTransactions,
        totalRefundsETB: currentFin.returnsRefunded,
        formattedTotalRefunds: currentFin.returnsRefunded.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        physicalDrawerCashETB: railTotals.cash.collected,
      },
      posShift: shiftPayload,
      operationalAlerts: {
        criticalStockItems: criticalStockItems.slice(0, 6),
        pendingPurchaseOrders: formattedPendingPOs,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
