import { Prisma } from '@prisma/client';

/**
 * Moving Weighted-Average Costing (AVCO / MAC) Service.
 * Implements authoritative cost recalculation upon physical goods receipt.
 */
export class CostingService {
  /**
   * Computes the new Moving Weighted-Average Cost (AVCO) for a product upon receipt of goods.
   *
   * Formula:
   *   New Average Cost = ((Q_old * C_old) + (Q_received * C_received)) / (Q_old + Q_received)
   *
   * Edge Cases:
   * 1. If existing stock Q_old <= 0 (e.g. initial intake or zero shelf stock), the new cost is C_received.
   * 2. If Q_received <= 0, the cost remains unchanged (C_old).
   * 3. Result is rounded to 2 decimal places (cents in ETB).
   *
   * @param currentStock Existing physical stock quantity (Q_old)
   * @param currentCost Existing average unit cost (C_old)
   * @param receivedQty Quantity of incoming units received (Q_received)
   * @param receivedUnitCost Unit purchase cost of incoming units including freight (C_received)
   */
  public static calculateMovingAverageCost(
    currentStock: number,
    currentCost: Prisma.Decimal | number | string,
    receivedQty: number,
    receivedUnitCost: Prisma.Decimal | number | string
  ): Prisma.Decimal {
    const cOld = new Prisma.Decimal(currentCost);
    const cReceived = new Prisma.Decimal(receivedUnitCost);

    if (receivedQty <= 0) {
      return cOld.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    }

    if (currentStock <= 0) {
      return cReceived.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    }

    const currentInventoryValuation = cOld.mul(currentStock);
    const incomingGoodsValuation = cReceived.mul(receivedQty);
    const totalValuation = currentInventoryValuation.add(incomingGoodsValuation);
    const totalUnits = new Prisma.Decimal(currentStock + receivedQty);

    const newAvgCost = totalValuation.div(totalUnits);
    return newAvgCost.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }

  /**
   * Freezes the COGS unit cost snapshot for a sale line item.
   * Ensures historical gross profit calculations are immutable.
   */
  public static freezeCostSnapshot(productAverageCost: Prisma.Decimal | number | string): Prisma.Decimal {
    return new Prisma.Decimal(productAverageCost).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }
}
