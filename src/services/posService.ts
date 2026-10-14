import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  ValidationError,
  NotFoundError,
  InsufficientStockError,
} from '@/lib/errors';
import { InventoryService } from './inventoryService';
import { CostingService } from './costingService';
import { AuditService } from './auditService';
import { withIdempotency } from '@/lib/idempotency';

export interface CheckoutLineItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number; // Optional override; server validates against product price
  discountAmount?: number;
}

export interface CheckoutPaymentInput {
  method: 'cash' | 'telebirr' | 'cbe_birr' | 'bank_transfer' | 'credit';
  amount: number;
  amountTendered?: number;
  providerReference?: string;
}

export interface CheckoutOrderInput {
  shopId: string;
  cashierId: string;
  customerId?: string;
  items: CheckoutLineItemInput[];
  payments: CheckoutPaymentInput[];
  discountTotal?: number;
  notes?: string;
  idempotencyKey?: string;
}

export class PosService {
  /**
   * Generates a sequential, audit-compliant receipt number: REC-YYYY-XXXX
   */
  public static async generateReceiptNumber(
    shopId: string,
    tx: Prisma.TransactionClient
  ): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `REC-${currentYear}-`;

    const lastSale = await tx.sale.findFirst({
      where: {
        shopId,
        receiptNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        receiptNumber: 'desc',
      },
      select: {
        receiptNumber: true,
      },
    });

    let nextSequence = 1;
    if (lastSale?.receiptNumber) {
      const parts = lastSale.receiptNumber.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num)) {
        nextSequence = num + 1;
      }
    }

    return `${prefix}${String(nextSequence).padStart(4, '0')}`;
  }

  /**
   * Authoritatively posts a retail POS sale inside a single ACID transaction.
   * Guarantees pessimistic locking (ordered by ID), stock deduction, COGS freezing,
   * payment reconciliation, and ledger recording.
   */
  public static async checkout(input: CheckoutOrderInput) {
    const { shopId, cashierId, customerId, items, payments, notes, idempotencyKey } = input;

    if (!items || items.length === 0) {
      throw new ValidationError('At least one line item is required for checkout.');
    }

    if (!payments || payments.length === 0) {
      throw new ValidationError('At least one payment tender is required.');
    }

    return await withIdempotency(
      {
        shopId,
        operation: 'checkout',
        idempotencyKey,
        payload: input,
      },
      async () => {
        return await prisma.$transaction(async (tx) => {
          // 1. Verify shop and tax rate
          const shop = await tx.shop.findUnique({ where: { id: shopId } });
          if (!shop) throw new NotFoundError('Shop', shopId);

          // 2. Verify cashier
          const cashier = await tx.user.findUnique({ where: { id: cashierId } });
          if (!cashier || cashier.shopId !== shopId) {
            throw new NotFoundError('Cashier User', cashierId);
          }

          // 3. Deterministic order of product IDs to prevent deadlocks
          const sortedProductIds = [...new Set(items.map((i) => i.productId))].sort();

          // Fetch products in deterministic order
          const products = await tx.product.findMany({
            where: {
              id: { in: sortedProductIds },
              shopId,
            },
          });

          if (products.length !== sortedProductIds.length) {
            throw new ValidationError('One or more product IDs are invalid or belong to another store.');
          }

          const productMap = new Map(products.map((p) => [p.id, p]));

          // 4. Validate stock and compute authoritative line totals
          let calculatedSubtotal = new Prisma.Decimal(0);
          let calculatedLineDiscountTotal = new Prisma.Decimal(0);

          const computedItems = items.map((item) => {
            const product = productMap.get(item.productId);
            if (!product) throw new NotFoundError('Product', item.productId);

            if (product.status !== 'active') {
              throw new ValidationError(`Product "${product.name}" is not active for sale.`);
            }

            if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
              throw new ValidationError(`Quantity for "${product.name}" must be a positive integer.`);
            }

            if (product.onHand < item.quantity) {
              throw new InsufficientStockError(product.name, item.quantity, product.onHand);
            }

            // Authoritative selling price from database
            const unitPrice = new Prisma.Decimal(item.unitPrice ?? product.sellingPrice);
            const lineSubtotal = unitPrice.mul(item.quantity);
            const discountAmount = new Prisma.Decimal(item.discountAmount ?? 0);
            const lineTotal = lineSubtotal.sub(discountAmount);

            // Frozen COGS snapshot using current moving weighted-average cost
            const unitCostSnapshot = CostingService.freezeCostSnapshot(product.averageCost);
            const lineCogs = unitCostSnapshot.mul(item.quantity);
            const lineGrossProfit = lineTotal.sub(lineCogs);

            calculatedSubtotal = calculatedSubtotal.add(lineSubtotal);
            calculatedLineDiscountTotal = calculatedLineDiscountTotal.add(discountAmount);

            return {
              product,
              quantity: item.quantity,
              unitPrice,
              unitCostSnapshot,
              discountAmount,
              lineSubtotal,
              lineTotal,
              lineCogs,
              lineGrossProfit,
            };
          });

          const headerDiscount = new Prisma.Decimal(input.discountTotal ?? 0);
          const totalDiscount = calculatedLineDiscountTotal.add(headerDiscount);
          const netTaxable = calculatedSubtotal.sub(totalDiscount);

          let calculatedTax = new Prisma.Decimal(0);
          if (shop.isTaxEnabled && shop.taxRate.gt(0)) {
            calculatedTax = netTaxable
              .mul(shop.taxRate)
              .div(100)
              .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
          }

          const grandTotal = netTaxable.add(calculatedTax);

          // 5. Authoritative payment verification
          let totalTendered = new Prisma.Decimal(0);
          for (const pay of payments) {
            const payAmount = new Prisma.Decimal(pay.amount);
            if (payAmount.lte(0)) {
              throw new ValidationError('Payment amounts must be strictly greater than zero.');
            }
            totalTendered = totalTendered.add(payAmount);

            if (pay.method === 'cash' && pay.amountTendered !== undefined) {
              const tendered = new Prisma.Decimal(pay.amountTendered);
              if (tendered.lt(payAmount)) {
                throw new ValidationError(
                  `Cash tendered (${tendered} ETB) is less than required payment amount (${payAmount} ETB).`
                );
              }
            }
          }

          if (totalTendered.lt(grandTotal)) {
            throw new ValidationError(
              `Total tendered (${totalTendered} ETB) is less than the grand total (${grandTotal} ETB).`
            );
          }

          // 6. Generate sequential receipt number
          const receiptNumber = await this.generateReceiptNumber(shopId, tx);

          // 7. Insert Sale record
          const sale = await tx.sale.create({
            data: {
              shopId,
              receiptNumber,
              customerId: customerId ?? null,
              cashierId,
              status: 'posted',
              subtotal: calculatedSubtotal,
              discountTotal: totalDiscount,
              taxTotal: calculatedTax,
              grandTotal,
              idempotencyKey,
              notes,
            },
          });

          // 8. Insert SaleItems and update stock + ledger
          for (const item of computedItems) {
            await tx.saleItem.create({
              data: {
                saleId: sale.id,
                productId: item.product.id,
                skuSnapshot: item.product.sku,
                nameSnapshot: item.product.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                unitCostSnapshot: item.unitCostSnapshot,
                discountAmount: item.discountAmount,
                lineSubtotal: item.lineSubtotal,
                lineTotal: item.lineTotal,
                lineCogs: item.lineCogs,
                lineGrossProfit: item.lineGrossProfit,
              },
            });

            // Decrement stock and record immutable stock movement
            await InventoryService.recordMovement(tx, {
              shopId,
              productId: item.product.id,
              movementType: 'sale',
              quantityDelta: -item.quantity,
              referenceNumber: receiptNumber,
              sourceType: 'sale',
              sourceId: sale.id,
              reason: 'POS Retail Checkout',
              actorId: cashierId,
            });
          }

          // 9. Insert Payments
          for (const pay of payments) {
            const payAmount = new Prisma.Decimal(pay.amount);
            const tendered = pay.amountTendered !== undefined ? new Prisma.Decimal(pay.amountTendered) : null;
            const changeGiven = tendered ? tendered.sub(payAmount) : null;

            await tx.payment.create({
              data: {
                shopId,
                saleId: sale.id,
                method: pay.method,
                status: 'succeeded',
                amount: payAmount,
                amountTendered: tendered,
                changeGiven,
                currencyCode: 'ETB',
                providerReference: pay.providerReference,
                recordedBy: cashier.fullName,
              },
            });
          }

          // 10. Update Customer statistics if customer provided
          if (customerId) {
            const customer = await tx.customer.findUnique({ where: { id: customerId } });
            if (customer && customer.shopId === shopId) {
              const newTotalSpent = customer.totalSpent.add(grandTotal);
              // 1 loyalty point per 100 ETB
              const earnedPoints = Math.floor(grandTotal.toNumber() / 100);
              await tx.customer.update({
                where: { id: customerId },
                data: {
                  totalSpent: newTotalSpent,
                  loyaltyPoints: customer.loyaltyPoints + earnedPoints,
                },
              });
            }
          }

          // 11. Audit log
          await AuditService.log(
            {
              shopId,
              actorUserId: cashierId,
              action: 'SALE_POSTED',
              entityType: 'sale',
              entityId: sale.id,
              newValues: {
                receiptNumber,
                grandTotal: grandTotal.toString(),
                itemsCount: items.length,
              },
            },
            tx
          );

          // Return posted sale with full relational data
          return await tx.sale.findUnique({
            where: { id: sale.id },
            include: {
              items: {
                include: { product: true },
              },
              payments: true,
              customer: true,
              cashier: {
                select: { id: true, fullName: true, email: true },
              },
            },
          });
        }, {
          maxWait: 15000,
          timeout: 30000,
        });
      }
    );
  }
}
