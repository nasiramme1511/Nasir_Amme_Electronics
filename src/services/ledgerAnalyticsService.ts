import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type AnalyticsPeriod = "daily" | "monthly" | "quarterly" | "yearly";

export interface LedgerFinancialRollup {
  period: AnalyticsPeriod;
  range: {
    from: string;
    to: string;
  };
  stockFlow: {
    totalUnitsIn: number;
    totalUnitsOut: number;
    netStockChange: number;
  };
  financials: {
    grossRevenueETB: number;
    cogsETB: number;
    grossProfitETB: number;
    marginPercent: number;
    vatCollectedETB: number;
    orderCount: number;
  };
  tenderBreakdown: {
    rail: string;
    collectedETB: number;
  }[];
}

export class LedgerAnalyticsService {
  /**
   * Computes authoritative periodic rollup of double-entry stock movements,
   * locked COGS profitability, and multi-rail payment intake.
   */
  public static async getInventoryFinancialRollup(
    shopId: string,
    period: AnalyticsPeriod,
    targetDate: Date = new Date()
  ): Promise<LedgerFinancialRollup> {
    const { startDate, endDate } = this.computePeriodRange(period, targetDate);

    // 1. Inbound Inventory Movements (Stock In / PO Receipts / Surplus)
    const inboundLedger = await prisma.stockMovement.aggregate({
      where: {
        shopId,
        occurredAt: { gte: startDate, lte: endDate },
        quantityDelta: { gt: 0 },
      },
      _sum: { quantityDelta: true },
      _count: { id: true },
    });

    // 2. Outbound Inventory Movements (Stock Out / Sales / Deficit / RMA)
    const outboundLedger = await prisma.stockMovement.aggregate({
      where: {
        shopId,
        occurredAt: { gte: startDate, lte: endDate },
        quantityDelta: { lt: 0 },
      },
      _sum: { quantityDelta: true },
      _count: { id: true },
    });

    // 3. Sales & Margin Performance (Using locked-in historical COGS)
    const sales = await prisma.sale.findMany({
      where: {
        shopId,
        soldAt: { gte: startDate, lte: endDate },
        status: { not: "voided" },
      },
      include: {
        items: true,
      },
    });

    let grossRevenue = new Prisma.Decimal(0);
    let vatCollected = new Prisma.Decimal(0);
    let totalCogs = new Prisma.Decimal(0);

    for (const sale of sales) {
      grossRevenue = grossRevenue.add(sale.grandTotal);
      vatCollected = vatCollected.add(sale.taxTotal);

      for (const item of sale.items) {
        totalCogs = totalCogs.add(item.lineCogs);
      }
    }

    // 4. Multi-Rail Tender Breakdown
    const paymentsByRail = await prisma.payment.groupBy({
      by: ["method"],
      where: {
        shopId,
        receivedAt: { gte: startDate, lte: endDate },
        status: "succeeded",
      },
      _sum: {
        amount: true,
      },
    });

    const revenueNum = Number(grossRevenue);
    const cogsNum = Number(totalCogs);
    const grossProfitNum = revenueNum - cogsNum;
    const marginRate = revenueNum > 0 ? (grossProfitNum / revenueNum) * 100 : 0;

    const totalIn = Math.abs(inboundLedger._sum.quantityDelta || 0);
    const totalOut = Math.abs(outboundLedger._sum.quantityDelta || 0);

    return {
      period,
      range: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
      stockFlow: {
        totalUnitsIn: totalIn,
        totalUnitsOut: totalOut,
        netStockChange: totalIn - totalOut,
      },
      financials: {
        grossRevenueETB: revenueNum,
        cogsETB: cogsNum,
        grossProfitETB: grossProfitNum,
        marginPercent: Number(marginRate.toFixed(2)),
        vatCollectedETB: Number(vatCollected),
        orderCount: sales.length,
      },
      tenderBreakdown: paymentsByRail.map((p) => ({
        rail: p.method,
        collectedETB: Number(p._sum.amount || 0),
      })),
    };
  }

  public static computePeriodRange(period: AnalyticsPeriod, date: Date) {
    const d = new Date(date);
    let startDate: Date;
    let endDate: Date;

    if (period === "daily") {
      startDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      endDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    } else if (period === "monthly") {
      startDate = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === "quarterly") {
      const currentQuarter = Math.floor(d.getMonth() / 3);
      startDate = new Date(d.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0);
      endDate = new Date(d.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999);
    } else {
      // Yearly
      startDate = new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    return { startDate, endDate };
  }
}
