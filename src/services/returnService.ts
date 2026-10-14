import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  ValidationError,
  NotFoundError,
  CumulativeReturnLimitError,
} from '@/lib/errors';
import { InventoryService } from './inventoryService';
import { AuditService } from './auditService';
import { withIdempotency } from '@/lib/idempotency';

export interface ProcessReturnItemInput {
  saleItemId: string;
  quantity: number;
  reason: 'defective' | 'wrong_item' | 'customer_regret' | 'warranty_claim' | string;
  disposition: 'restock' | 'quarantine' | 'discard';
}

export interface ProcessReturnInput {
  shopId: string;
  saleId: string;
  postedBy: string;
  refundMethod: 'cash' | 'telebirr' | 'credit_note' | 'original_method';
  reason?: string;
  notes?: string;
  items: ProcessReturnItemInput[];
  idempotencyKey?: string;
}

export class ReturnService {
  /**
   * Generates a sequential, audit-compliant return number: RET-YYYY-XXXX
   */
  public static async generateReturnNumber(
    shopId: string,
    tx: Prisma.TransactionClient
  ): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `RET-${currentYear}-`;

    const lastReturn = await tx.saleReturn.findFirst({
      where: {
        shopId,
        returnNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        returnNumber: 'desc',
      },
      select: {
        returnNumber: true,
      },
    });

    let nextSequence = 1;
    if (lastReturn?.returnNumber) {
      const parts = lastReturn.returnNumber.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num)) {
        nextSequence = num + 1;
      }
    }

    return `${prefix}${String(nextSequence).padStart(4, '0')}`;
  }

  /**
   * Process a customer return and refund authoritatively.
   * Enforces strict cumulative return limits, restock vs quarantine disposition,
   * ledger movement recording, and sale status updates.
   */
  public static async processReturn(input: ProcessReturnInput) {
    const { shopId, saleId, postedBy, refundMethod, reason, notes, items, idempotencyKey } = input;

    if (!items || items.length === 0) {
      throw new ValidationError('At least one item must be specified for a return.');
    }

    return await withIdempotency(
      {
        shopId,
        operation: 'return',
        idempotencyKey,
        payload: input,
      },
      async () => {
        return await prisma.$transaction(async (tx) => {
          // 1. Fetch sale with line items and previous returns
          const sale = await tx.sale.findUnique({
            where: { id: saleId },
            include: {
              items: {
                include: { product: true },
              },
              returns: {
                where: { status: 'posted' },
                include: { items: true },
              },
            },
          });

          if (!sale || sale.shopId !== shopId) {
            throw new NotFoundError('Sale', saleId);
          }

          if (sale.status === 'returned') {
            throw new ValidationError('This sale has already been fully refunded and returned.');
          }

          // 2. Map existing prior returns per saleItemId
          const priorReturnsMap = new Map<string, number>();
          for (const ret of sale.returns) {
            for (const retItem of ret.items) {
              const current = priorReturnsMap.get(retItem.saleItemId) ?? 0;
              priorReturnsMap.set(retItem.saleItemId, current + retItem.quantity);
            }
          }

          const saleItemMap = new Map(sale.items.map((i) => [i.id, i]));
          const returnNumber = await this.generateReturnNumber(shopId, tx);

          let totalRefundETB = new Prisma.Decimal(0);
          const processedReturnItems = [];

          // 3. Validate each return line item against remaining returnable limit
          for (const reqItem of items) {
            const saleItem = saleItemMap.get(reqItem.saleItemId);
            if (!saleItem) {
              throw new NotFoundError('Sale Line Item', reqItem.saleItemId);
            }

            if (!Number.isInteger(reqItem.quantity) || reqItem.quantity <= 0) {
              throw new ValidationError(
                `Return quantity for "${saleItem.nameSnapshot}" must be a positive integer.`
              );
            }

            const priorReturned = priorReturnsMap.get(saleItem.id) ?? 0;
            const remainingReturnable = saleItem.quantity - priorReturned;

            if (reqItem.quantity > remainingReturnable) {
              throw new CumulativeReturnLimitError(
                saleItem.nameSnapshot,
                reqItem.quantity,
                remainingReturnable
              );
            }

            // Effective unit price (after line discount)
            const effectiveUnitPrice = saleItem.lineTotal.div(saleItem.quantity);
            const lineRefund = effectiveUnitPrice.mul(reqItem.quantity).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
            totalRefundETB = totalRefundETB.add(lineRefund);

            let stockMovementId: string | null = null;

            // 4. Disposition handling
            // If restock: item is in resalable condition -> return to shelf stock and record ledger
            // If quarantine/discard: item is defective -> DO NOT put back into active shelf inventory
            if (reqItem.disposition === 'restock') {
              const movement = await InventoryService.recordMovement(tx, {
                shopId,
                productId: saleItem.productId,
                movementType: 'return_restock',
                quantityDelta: reqItem.quantity,
                referenceNumber: returnNumber,
                sourceType: 'return',
                sourceId: sale.id,
                sourceLineId: saleItem.id,
                reason: `Customer Return Restock: ${reqItem.reason}`,
                actorId: postedBy,
              });
              stockMovementId = movement.movementId;
            }

            processedReturnItems.push({
              saleItemId: saleItem.id,
              productId: saleItem.productId,
              quantity: reqItem.quantity,
              unitPrice: saleItem.unitPrice,
              refundAmount: lineRefund,
              reason: reqItem.reason,
              disposition: reqItem.disposition,
              stockMovementId,
            });

            // Update local prior tracker
            priorReturnsMap.set(saleItem.id, priorReturned + reqItem.quantity);
          }

          // 5. Create SaleReturn record
          const saleReturn = await tx.saleReturn.create({
            data: {
              shopId,
              saleId: sale.id,
              returnNumber,
              originalReceiptNumber: sale.receiptNumber,
              status: 'posted',
              totalRefundETB,
              refundMethod,
              reason,
              postedBy,
              notes,
              idempotencyKey,
              items: {
                create: processedReturnItems,
              },
            },
            include: {
              items: {
                include: { product: true },
              },
            },
          });

          // 6. Evaluate if the original sale is now 100% returned or partially returned
          const allFullyReturned = sale.items.every((line) => {
            const totalReturnedForLine = priorReturnsMap.get(line.id) ?? 0;
            return totalReturnedForLine >= line.quantity;
          });

          const newSaleStatus = allFullyReturned ? 'returned' : 'partially_returned';

          await tx.sale.update({
            where: { id: sale.id },
            data: {
              status: newSaleStatus,
            },
          });

          // 7. Audit log
          await AuditService.log(
            {
              shopId,
              actorUserId: postedBy,
              action: 'RETURN_POSTED',
              entityType: 'sale_return',
              entityId: saleReturn.id,
              newValues: {
                returnNumber,
                receiptNumber: sale.receiptNumber,
                totalRefundETB: totalRefundETB.toString(),
                newSaleStatus,
                itemsCount: items.length,
              },
            },
            tx
          );

          return saleReturn;
        }, {
          maxWait: 15000,
          timeout: 30000,
        });
      }
    );
  }
}
