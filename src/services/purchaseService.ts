import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ValidationError, NotFoundError } from '@/lib/errors';
import { CostingService } from './costingService';
import { InventoryService } from './inventoryService';
import { AuditService } from './auditService';
import { withIdempotency } from '@/lib/idempotency';

export interface CreatePOItemInput {
  productId: string;
  orderedQuantity: number;
  unitCost: number;
}

export interface CreatePOInput {
  shopId: string;
  supplierId: string;
  items: CreatePOItemInput[];
  notes?: string;
  expectedAt?: Date | string;
  createdBy?: string;
}

export interface ReceiveGoodsItemInput {
  purchaseOrderItemId: string;
  quantityReceived: number;
  unitCost?: number; // Override if actual delivery invoice differed from original quote
  discrepancyNote?: string;
}

export interface ReceiveGoodsInput {
  shopId: string;
  purchaseOrderId: string;
  receivedBy: string;
  items: ReceiveGoodsItemInput[];
  notes?: string;
  idempotencyKey?: string;
}

export class PurchaseService {
  /**
   * Generates a sequential, audit-compliant PO number: PO-YYYY-XXXX
   */
  public static async generatePoNumber(
    shopId: string,
    tx: Prisma.TransactionClient
  ): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `PO-${currentYear}-`;

    try {
      const [seq] = await tx.$queryRaw<{ nextval: bigint }[]>`
        SELECT nextval('po_number_seq') AS nextval
      `;
      return `${prefix}${String(seq.nextval).padStart(4, '0')}`;
    } catch {
      const lastPo = await tx.purchaseOrder.findFirst({
        where: {
          shopId,
          poNumber: {
            startsWith: prefix,
          },
        },
        orderBy: {
          poNumber: 'desc',
        },
        select: {
          poNumber: true,
        },
      });

      let nextSequence = 1;
      if (lastPo?.poNumber) {
        const parts = lastPo.poNumber.split('-');
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num)) {
          nextSequence = num + 1;
        }
      }

      return `${prefix}${String(nextSequence).padStart(4, '0')}`;
    }
  }

  /**
   * Generates a sequential Goods Receipt number: GR-YYYY-XXXX
   * Uses atomic PostgreSQL sequence generator.
   */
  public static async generateGrNumber(
    shopId: string,
    tx: Prisma.TransactionClient
  ): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `GR-${currentYear}-`;

    try {
      const [seq] = await tx.$queryRaw<{ nextval: bigint }[]>`
        SELECT nextval('gr_number_seq') AS nextval
      `;
      return `${prefix}${String(seq.nextval).padStart(4, '0')}`;
    } catch {
      const lastGr = await tx.goodsReceipt.findFirst({
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
      if (lastGr?.receiptNumber) {
        const parts = lastGr.receiptNumber.split('-');
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num)) {
          nextSequence = num + 1;
        }
      }

      return `${prefix}${String(nextSequence).padStart(4, '0')}`;
    }
  }

  /**
   * Creates a formal supplier Purchase Order.
   */
  public static async createPurchaseOrder(input: CreatePOInput) {
    const { shopId, supplierId, items, notes, expectedAt, createdBy } = input;

    if (!items || items.length === 0) {
      throw new ValidationError('At least one item must be ordered in the purchase order.');
    }

    return await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier || supplier.shopId !== shopId) {
        throw new NotFoundError('Supplier', supplierId);
      }

      let subtotal = new Prisma.Decimal(0);
      const poItemsData = [];

      for (const item of items) {
        if (!Number.isInteger(item.orderedQuantity) || item.orderedQuantity <= 0) {
          throw new ValidationError('Ordered quantity must be a positive integer.');
        }

        const unitCost = new Prisma.Decimal(item.unitCost);
        if (unitCost.lt(0)) {
          throw new ValidationError('Unit cost cannot be negative.');
        }

        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.shopId !== shopId) {
          throw new NotFoundError('Product', item.productId);
        }

        const totalCost = unitCost.mul(item.orderedQuantity);
        subtotal = subtotal.add(totalCost);

        poItemsData.push({
          productId: item.productId,
          orderedQuantity: item.orderedQuantity,
          unitCost,
          totalCost,
        });
      }

      const poNumber = await this.generatePoNumber(shopId, tx);

      const po = await tx.purchaseOrder.create({
        data: {
          shopId,
          supplierId,
          poNumber,
          status: 'ordered',
          orderedAt: new Date(),
          expectedAt: expectedAt ? new Date(expectedAt) : null,
          subtotal,
          grandTotal: subtotal,
          notes,
          createdBy,
          items: {
            create: poItemsData,
          },
        },
        include: {
          items: {
            include: { product: true },
          },
          supplier: true,
        },
      });

      await AuditService.log(
        {
          shopId,
          actorUserId: createdBy,
          action: 'PO_CREATED',
          entityType: 'purchase_order',
          entityId: po.id,
          newValues: { poNumber, supplierName: supplier.name, grandTotal: subtotal.toString() },
        },
        tx
      );

      return po;
    });
  }

  /**
   * Records a physical Goods Receipt against a PO.
   * Recalculates Moving Weighted-Average Cost (AVCO), updates stock,
   * writes ledger movements, and updates PO fulfillment status.
   */
  public static async receiveGoods(input: ReceiveGoodsInput) {
    const { shopId, purchaseOrderId, receivedBy, items, notes, idempotencyKey } = input;

    if (!items || items.length === 0) {
      throw new ValidationError('At least one goods receipt line item is required.');
    }

    return await withIdempotency(
      {
        shopId,
        operation: 'goods_receipt',
        idempotencyKey,
        payload: input,
      },
      async () => {
        return await prisma.$transaction(async (tx) => {
          const po = await tx.purchaseOrder.findUnique({
            where: { id: purchaseOrderId },
            include: { items: true },
          });

          if (!po || po.shopId !== shopId) {
            throw new NotFoundError('Purchase Order', purchaseOrderId);
          }

          if (po.status !== 'ordered' && po.status !== 'partially_received') {
            throw new ValidationError(
              `Cannot receive goods for a PO with status "${po.status}". Purchase orders must be approved and ordered prior to goods intake.`
            );
          }

          const poItemMap = new Map(po.items.map((i) => [i.id, i]));
          const grNumber = await this.generateGrNumber(shopId, tx);

          // Create GoodsReceipt header
          const goodsReceipt = await tx.goodsReceipt.create({
            data: {
              shopId,
              purchaseOrderId: po.id,
              receiptNumber: grNumber,
              status: 'posted',
              receivedBy,
              notes,
              idempotencyKey,
            },
          });

          for (const item of items) {
            const poItem = poItemMap.get(item.purchaseOrderItemId);
            if (!poItem) {
              throw new NotFoundError('Purchase Order Line Item', item.purchaseOrderItemId);
            }

            if (!Number.isInteger(item.quantityReceived) || item.quantityReceived <= 0) {
              throw new ValidationError('Received quantity must be a positive integer.');
            }

            const unreceivedQty = poItem.orderedQuantity - poItem.receivedQuantity;
            if (item.quantityReceived > unreceivedQty) {
              throw new ValidationError(
                `Received quantity (${item.quantityReceived}) exceeds remaining unreceived quantity (${unreceivedQty}) for product item.`
              );
            }

            const product = await tx.product.findUnique({ where: { id: poItem.productId } });
            if (!product) throw new NotFoundError('Product', poItem.productId);

            const effectiveUnitCost = item.unitCost ? new Prisma.Decimal(item.unitCost) : poItem.unitCost;

            // Proportional allocation of landed additional shipping/freight costs (FIN-05)
            let allocatedExtraCost = new Prisma.Decimal(0);
            if (po.additionalCostTotal.gt(0) && po.subtotal.gt(0)) {
              const lineWeight = poItem.totalCost.div(po.subtotal);
              const totalLineAdditional = po.additionalCostTotal.mul(lineWeight);
              allocatedExtraCost = totalLineAdditional
                .div(poItem.orderedQuantity)
                .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
            }

            const landedUnitCost = effectiveUnitCost.add(allocatedExtraCost);

            // 1. Recalculate Moving Weighted-Average Cost (AVCO) including landed freight
            const newAvgCost = CostingService.calculateMovingAverageCost(
              product.onHand,
              product.averageCost,
              item.quantityReceived,
              landedUnitCost
            );

            // 2. Update product average cost in database
            await tx.product.update({
              where: { id: product.id },
              data: {
                averageCost: newAvgCost,
              },
            });

            // 3. Increment stock on hand and write immutable ledger row
            await InventoryService.recordMovement(tx, {
              shopId,
              productId: product.id,
              movementType: 'purchase_receive',
              quantityDelta: item.quantityReceived,
              referenceNumber: grNumber,
              sourceType: 'goods_receipt',
              sourceId: goodsReceipt.id,
              sourceLineId: poItem.id,
              reason: `Fulfillment of PO ${po.poNumber}`,
              notes: item.discrepancyNote,
              actorId: receivedBy,
            });

            // 4. Record GoodsReceiptItem
            await tx.goodsReceiptItem.create({
              data: {
                goodsReceiptId: goodsReceipt.id,
                purchaseOrderItemId: poItem.id,
                productId: product.id,
                quantityReceived: item.quantityReceived,
                unitCost: effectiveUnitCost,
                allocatedExtraCost,
                discrepancyNote: item.discrepancyNote,
              },
            });

            // 5. Update PO Item received quantity
            await tx.purchaseOrderItem.update({
              where: { id: poItem.id },
              data: {
                receivedQuantity: poItem.receivedQuantity + item.quantityReceived,
              },
            });
          }

          // Check if PO is now fully received or partially received
          const updatedPoItems = await tx.purchaseOrderItem.findMany({
            where: { purchaseOrderId: po.id },
          });

          const allReceived = updatedPoItems.every((i) => i.receivedQuantity >= i.orderedQuantity);
          const anyReceived = updatedPoItems.some((i) => i.receivedQuantity > 0);

          const newPoStatus = allReceived ? 'received' : anyReceived ? 'partially_received' : po.status;

          await tx.purchaseOrder.update({
            where: { id: po.id },
            data: {
              status: newPoStatus,
              receivedAt: allReceived ? new Date() : po.receivedAt,
            },
          });

          // Audit log
          await AuditService.log(
            {
              shopId,
              actorUserId: receivedBy,
              action: 'GOODS_RECEIVED',
              entityType: 'goods_receipt',
              entityId: goodsReceipt.id,
              newValues: {
                grNumber,
                poNumber: po.poNumber,
                newPoStatus,
                itemsReceived: items.length,
              },
            },
            tx
          );

          return await tx.goodsReceipt.findUnique({
            where: { id: goodsReceipt.id },
            include: {
              items: {
                include: { product: true },
              },
              purchaseOrder: true,
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
