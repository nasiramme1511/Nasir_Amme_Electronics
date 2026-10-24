import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface FinancialSummaryReport {
  period: {
    startDate?: string;
    endDate?: string;
  };
  salesMetrics: {
    grossSalesETB: number;
    discountsTotalETB: number;
    taxesTotalETB: number;
    netSalesETB: number;
    returnsRefundedETB: number;
    netRevenueETB: number;
    totalSalesTransactions: number;
    totalReturnsProcessed: number;
  };
  profitabilityMetrics: {
    totalCogsETB: number;
    returnedCogsAdjustedETB?: number;
    grossProfitETB: number;
    grossMarginPercentage: number;
  };
  inventoryValuation: {
    totalInventoryCostETB: number;
    totalInventoryRetailETB: number;
    totalUnitsOnHand: number;
    activeProductCount: number;
    lowStockProductCount: number;
  };
}

export class ReportService {
  /**
   * Generates authoritative financial summary and profitability reports using frozen historical COGS.
   */
  public static async getFinancialSummary(
    shopId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<FinancialSummaryReport> {
    const saleDateFilter: Prisma.SaleWhereInput = {
      shopId,
      status: { not: 'voided' },
      ...(startDate || endDate
        ? {
            soldAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    };

    // 1. Fetch sales
    const sales = await prisma.sale.findMany({
      where: saleDateFilter,
      include: {
        items: true,
      },
    });

    let grossSales = new Prisma.Decimal(0);
    let discountsTotal = new Prisma.Decimal(0);
    let taxesTotal = new Prisma.Decimal(0);
    let totalCogs = new Prisma.Decimal(0);

    for (const sale of sales) {
      grossSales = grossSales.add(sale.subtotal);
      discountsTotal = discountsTotal.add(sale.discountTotal);
      taxesTotal = taxesTotal.add(sale.taxTotal);

      for (const item of sale.items) {
        // Authoritative COGS frozen at time of sale
        totalCogs = totalCogs.add(item.lineCogs);
      }
    }

    const netSales = grossSales.sub(discountsTotal);

    // 2. Fetch returns within period
    const returnsFilter: Prisma.SaleReturnWhereInput = {
      shopId,
      status: 'posted',
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    };

    const returns = await prisma.saleReturn.findMany({
      where: returnsFilter,
      include: {
        items: {
          include: {
            saleItem: true,
          },
        },
      },
    });

    let returnsRefunded = new Prisma.Decimal(0);
    let returnedRestockedCogs = new Prisma.Decimal(0);

    for (const ret of returns) {
      returnsRefunded = returnsRefunded.add(ret.totalRefundETB);
      for (const retItem of ret.items) {
        if (retItem.disposition === 'restock' && retItem.saleItem) {
          const itemCogs = retItem.saleItem.unitCostSnapshot.mul(retItem.quantity);
          returnedRestockedCogs = returnedRestockedCogs.add(itemCogs);
        }
      }
    }

    const netRevenue = netSales.sub(returnsRefunded);
    const adjustedCogs = totalCogs.sub(returnedRestockedCogs);
    const grossProfit = netRevenue.sub(adjustedCogs);
    const grossMarginPct = netRevenue.gt(0)
      ? grossProfit.div(netRevenue).mul(100).toNumber()
      : 0;

    // 3. Current Inventory Valuation (Live Active SKUs)
    const products = await prisma.product.findMany({
      where: {
        shopId,
        status: 'active',
        deletedAt: null,
        isArchived: false,
      },
    });

    let totalValuationCost = new Prisma.Decimal(0);
    let totalValuationRetail = new Prisma.Decimal(0);
    let totalUnits = 0;
    let lowStockCount = 0;

    for (const p of products) {
      const units = p.onHand;
      totalUnits += units;
      totalValuationCost = totalValuationCost.add(p.averageCost.mul(units));
      totalValuationRetail = totalValuationRetail.add(p.sellingPrice.mul(units));
      if (units <= p.reorderLevel) {
        lowStockCount++;
      }
    }

    return {
      period: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
      salesMetrics: {
        grossSalesETB: grossSales.toDecimalPlaces(2).toNumber(),
        discountsTotalETB: discountsTotal.toDecimalPlaces(2).toNumber(),
        taxesTotalETB: taxesTotal.toDecimalPlaces(2).toNumber(),
        netSalesETB: netSales.toDecimalPlaces(2).toNumber(),
        returnsRefundedETB: returnsRefunded.toDecimalPlaces(2).toNumber(),
        netRevenueETB: netRevenue.toDecimalPlaces(2).toNumber(),
        totalSalesTransactions: sales.length,
        totalReturnsProcessed: returns.length,
      },
      profitabilityMetrics: {
        totalCogsETB: adjustedCogs.toDecimalPlaces(2).toNumber(),
        returnedCogsAdjustedETB: returnedRestockedCogs.toDecimalPlaces(2).toNumber(),
        grossProfitETB: grossProfit.toDecimalPlaces(2).toNumber(),
        grossMarginPercentage: Math.round(grossMarginPct * 100) / 100,
      },
      inventoryValuation: {
        totalInventoryCostETB: totalValuationCost.toDecimalPlaces(2).toNumber(),
        totalInventoryRetailETB: totalValuationRetail.toDecimalPlaces(2).toNumber(),
        totalUnitsOnHand: totalUnits,
        activeProductCount: products.length,
        lowStockProductCount: lowStockCount,
      },
    };
  }
}
