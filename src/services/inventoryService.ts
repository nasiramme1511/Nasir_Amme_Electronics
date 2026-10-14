import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, InsufficientStockError } from '@/lib/errors';
import { AuditService } from './auditService';

export interface RecordMovementParams {
  shopId: string;
  productId: string;
  movementType:
    | 'opening_balance'
    | 'purchase_receive'
    | 'sale'
    | 'return_restock'
    | 'damage_loss'
    | 'stock_count_adjustment'
    | 'manual_correction'
    | 'reversal';
  quantityDelta: number; // Signed: positive for intake/restock, negative for sale/reduction
  referenceNumber: string;
  sourceType?: string;
  sourceId?: string;
  sourceLineId?: string;
  reason?: string;
  notes?: string;
  actorId?: string;
  idempotencyKey?: string;
}

export interface ManualStockCorrectionParams {
  shopId: string;
  productId: string;
  newStockQuantity: number;
  reason: string;
  notes?: string;
  actorId?: string;
}

export class InventoryService {
  /**
   * Applies an atomic stock change and records an immutable StockMovement ledger row.
   * MUST be executed inside an active Prisma interactive transaction client.
   */
  public static async recordMovement(
    tx: Prisma.TransactionClient,
    params: RecordMovementParams
  ): Promise<{ previousStock: number; balanceAfter: number; movementId: string }> {
    const {
      shopId,
      productId,
      movementType,
      quantityDelta,
      referenceNumber,
      sourceType,
      sourceId,
      sourceLineId,
      reason,
      notes,
      actorId,
      idempotencyKey,
    } = params;

    // Fetch the product inside the transaction
    const product = await tx.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.shopId !== shopId) {
      throw new NotFoundError('Product', productId);
    }

    const previousStock = product.onHand;
    const balanceAfter = previousStock + quantityDelta;

    if (balanceAfter < 0) {
      throw new InsufficientStockError(product.name, Math.abs(quantityDelta), previousStock);
    }

    // Update product on-hand cache
    await tx.product.update({
      where: { id: productId },
      data: {
        onHand: balanceAfter,
      },
    });

    // Create append-only ledger entry
    const movement = await tx.stockMovement.create({
      data: {
        shopId,
        productId,
        movementType,
        quantityDelta,
        unitCostSnapshot: product.averageCost,
        previousStock,
        balanceAfter,
        referenceNumber,
        sourceType,
        sourceId,
        sourceLineId,
        reason,
        notes,
        actorId,
        idempotencyKey,
      },
    });

    return {
      previousStock,
      balanceAfter,
      movementId: movement.id,
    };
  }

  /**
   * Performs an audited manual stock correction for a product.
   * Calculates the exact delta and records a 'manual_correction' movement.
   */
  public static async performManualCorrection(
    params: ManualStockCorrectionParams
  ): Promise<{ productId: string; previousStock: number; newStock: number; movementId: string }> {
    const { shopId, productId, newStockQuantity, reason, notes, actorId } = params;

    if (!Number.isInteger(newStockQuantity) || newStockQuantity < 0) {
      throw new ValidationError('New stock quantity must be a non-negative integer.');
    }

    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('A reason must be provided for manual stock corrections.');
    }

    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product || product.shopId !== shopId) {
        throw new NotFoundError('Product', productId);
      }

      const previousStock = product.onHand;
      const quantityDelta = newStockQuantity - previousStock;

      if (quantityDelta === 0) {
        // No change needed
        return {
          productId,
          previousStock,
          newStock: newStockQuantity,
          movementId: 'no_change',
        };
      }

      const { balanceAfter, movementId } = await this.recordMovement(tx, {
        shopId,
        productId,
        movementType: 'manual_correction',
        quantityDelta,
        referenceNumber: 'CATALOG-EDIT',
        sourceType: 'catalog_edit',
        reason,
        notes,
        actorId,
      });

      await AuditService.log(
        {
          shopId,
          actorUserId: actorId,
          action: 'STOCK_MANUAL_CORRECTION',
          entityType: 'product',
          entityId: productId,
          oldValues: { onHand: previousStock },
          newValues: { onHand: balanceAfter, reason, notes },
        },
        tx
      );

      return {
        productId,
        previousStock,
        newStock: balanceAfter,
        movementId,
      };
    });
  }

  /**
   * Reconciles a product's cached onHand against the sum of all immutable stock movements.
   */
  public static async reconcileLedgerBalance(
    shopId: string,
    productId: string
  ): Promise<{ onHandCached: number; ledgerComputed: number; isBalanced: boolean }> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.shopId !== shopId) {
      throw new NotFoundError('Product', productId);
    }

    const aggregations = await prisma.stockMovement.aggregate({
      where: {
        shopId,
        productId,
      },
      _sum: {
        quantityDelta: true,
      },
    });

    const ledgerComputed = aggregations._sum.quantityDelta ?? 0;
    const onHandCached = product.onHand;

    return {
      onHandCached,
      ledgerComputed,
      isBalanced: onHandCached === ledgerComputed,
    };
  }
}
