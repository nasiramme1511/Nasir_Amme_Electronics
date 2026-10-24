import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { NotFoundError, ValidationError, ForbiddenError, AppError } from '@/lib/errors';
import { InventoryService } from '@/services/inventoryService';
import { Prisma } from '@prisma/client';
import { requireAuth, requireRole } from '@/lib/authGuard';
import { requireAdmin } from '@/lib/permissions/guards';
import { validateEAN13 } from '@/lib/barcode';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    const isCostAuthorized = auth.roles.includes('admin') || auth.roles.includes('manager');
    const { id } = await params;

    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new ValidationError('Product ID parameter is required.');
    }

    const product = await prisma.product.findUnique({
      where: { id: id.trim() },
      include: {
        category: true,
        serials: {
          orderBy: { createdAt: 'desc' },
        },
        stockMovements: {
          orderBy: { occurredAt: 'desc' },
          take: 20,
        },
      },
    });

    if (
      !product ||
      product.shopId !== DEFAULT_SHOP_ID ||
      product.deletedAt !== null ||
      product.isArchived
    ) {
      throw new NotFoundError('Product', id);
    }

    const sanitized = {
      ...product,
      stockQuantity: product.stockQuantity ?? product.onHand,
      retailPrice: Number(product.retailPrice ?? product.sellingPrice),
      costPrice: Number(product.costPrice ?? product.averageCost),
    };

    if (!isCostAuthorized) {
      delete (sanitized as Record<string, unknown>).averageCost;
      delete (sanitized as Record<string, unknown>).costPrice;
    }

    return jsonSuccess(sanitized);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, 'admin', 'manager');
    const isCostAuthorized = auth.roles.includes('admin') || auth.roles.includes('manager');
    const { id } = await params;

    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new ValidationError('Product ID parameter is required.');
    }

    const body = await request.json();

    const product = await prisma.product.findUnique({
      where: { id: id.trim() },
      include: { serials: true },
    });

    if (
      !product ||
      product.shopId !== DEFAULT_SHOP_ID ||
      product.deletedAt !== null ||
      product.isArchived
    ) {
      throw new NotFoundError('Product', id);
    }

    const {
      sku,
      barcode,
      name,
      brand,
      categoryId,
      sellingPrice,
      costPrice,
      retailPrice,
      minStockThreshold,
      location,
      description,
      warrantyMonths,
      imageUrl,
      hasSerials,
      status,
      stockQuantity,
      adjustmentReason = 'Manual inventory correction from product management',
    } = body;

    // 1. SKU uniqueness check if edited
    let cleanSku: string | undefined = undefined;
    if (sku !== undefined && sku.trim() !== product.sku) {
      cleanSku = sku.trim();
      if (!cleanSku) {
        throw new ValidationError('SKU cannot be empty.');
      }
      const existingSku = await prisma.product.findFirst({
        where: {
          shopId: DEFAULT_SHOP_ID,
          sku: cleanSku,
          deletedAt: null,
          isArchived: false,
        },
      });
      if (existingSku && existingSku.id !== id) {
        throw new ValidationError(`A product with SKU "${cleanSku}" already exists.`);
      }
    }

    // 2. Barcode EAN-13 validation and duplicate prevention if edited
    let cleanBarcode: string | null | undefined = undefined;
    if (barcode !== undefined) {
      const rawBarcode = barcode ? barcode.toString().trim() : null;
      if (rawBarcode !== product.barcode) {
        if (rawBarcode) {
          if (/^\d{13}$/.test(rawBarcode)) {
            const eanCheck = validateEAN13(rawBarcode);
            if (!eanCheck.isValid) {
              throw new ValidationError(eanCheck.error || 'Invalid EAN-13 barcode.');
            }
          }
          const existingBarcode = await prisma.product.findFirst({
            where: {
              shopId: DEFAULT_SHOP_ID,
              barcode: rawBarcode,
              id: { not: id },
              deletedAt: null,
              isArchived: false,
            },
          });
          if (existingBarcode) {
            throw new ValidationError(
              `Barcode "${rawBarcode}" is already assigned to "${existingBarcode.name}".`
            );
          }
        }
        cleanBarcode = rawBarcode;
      }
    }

    // 3. Pricing validations
    const effectiveSellingPrice = sellingPrice !== undefined ? sellingPrice : retailPrice;
    let newPrice: Prisma.Decimal | undefined = undefined;
    if (effectiveSellingPrice !== undefined) {
      const numPrice = Number(effectiveSellingPrice);
      if (isNaN(numPrice) || numPrice < 0) {
        throw new ValidationError('Selling price cannot be negative.');
      }
      newPrice = new Prisma.Decimal(numPrice);
    }

    let newCost: Prisma.Decimal | undefined = undefined;
    if (costPrice !== undefined) {
      if (!isCostAuthorized) {
        throw new ForbiddenError('Unauthorized: You do not have permission to modify product cost price.');
      }
      const numCost = Number(costPrice);
      if (isNaN(numCost) || numCost < 0) {
        throw new ValidationError('Cost price cannot be negative.');
      }
      newCost = new Prisma.Decimal(numCost);
    }

    // 4. If stockQuantity is explicitly passed and different from current onHand, perform audited correction
    if (stockQuantity !== undefined && stockQuantity !== product.onHand) {
      await InventoryService.performManualCorrection({
        shopId: DEFAULT_SHOP_ID,
        productId: product.id,
        newStockQuantity: Number(stockQuantity),
        reason: adjustmentReason,
        actorId: auth.user.id,
      });
    }

    // 5. Update product record
    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(cleanSku ? { sku: cleanSku } : {}),
        ...(cleanBarcode !== undefined ? { barcode: cleanBarcode } : {}),
        ...(name ? { name: name.trim() } : {}),
        ...(brand ? { brand: brand.trim() } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(newPrice !== undefined ? { sellingPrice: newPrice, retailPrice: newPrice } : {}),
        ...(newCost !== undefined ? { averageCost: newCost, costPrice: newCost } : {}),
        ...(stockQuantity !== undefined ? { stockQuantity: Number(stockQuantity), onHand: Number(stockQuantity) } : {}),
        ...(minStockThreshold !== undefined ? { reorderLevel: Number(minStockThreshold) } : {}),
        ...(location !== undefined ? { location: location?.trim() || null } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(warrantyMonths !== undefined ? { warrantyMonths: Number(warrantyMonths) } : {}),
        ...(imageUrl !== undefined ? { imageUrl: imageUrl?.trim() || null } : {}),
        ...(hasSerials !== undefined ? { hasSerials: Boolean(hasSerials) } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        category: true,
        serials: true,
      },
    });

    // 6. Audit Trail for Product Update
    await prisma.auditLog.create({
      data: {
        shopId: DEFAULT_SHOP_ID,
        actorUserId: auth.user.id,
        action: 'PRODUCT_UPDATED',
        entityType: 'Product',
        entityId: id,
        oldValues: {
          sku: product.sku,
          barcode: product.barcode,
          name: product.name,
          brand: product.brand,
          sellingPrice: Number(product.sellingPrice),
          averageCost: Number(product.averageCost),
          location: product.location,
          warrantyMonths: product.warrantyMonths,
          imageUrl: product.imageUrl,
          hasSerials: product.hasSerials,
          status: product.status,
        },
        newValues: {
          sku: updated.sku,
          barcode: updated.barcode,
          name: updated.name,
          brand: updated.brand,
          sellingPrice: Number(updated.sellingPrice),
          averageCost: Number(updated.averageCost),
          location: updated.location,
          warrantyMonths: updated.warrantyMonths,
          imageUrl: updated.imageUrl,
          hasSerials: updated.hasSerials,
          status: updated.status,
          updatedBy: auth.user.fullName,
        },
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return jsonSuccess({
      ...updated,
      stockQuantity: updated.stockQuantity ?? updated.onHand,
      retailPrice: Number(updated.retailPrice ?? updated.sellingPrice),
      costPrice: Number(updated.costPrice ?? updated.averageCost),
    });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * Deterministic Dual-Path Permanent Product Purge Engine
 *
 * PATH A: Zero Historical Ledger (salesCount === 0 && stockMovementsCount === 0)
 *         -> Hard Purge (physical removal via prisma.product.delete)
 *
 * PATH B: Ledger-Preserved Permanent Purge (salesCount > 0 || stockMovementsCount > 0)
 *         -> Sets deletedAt = now(), isArchived = true, stockQuantity = 0, onHand = 0
 *         -> Decouples unique identifiers: Suffixes barcode & sku with _PURGED_${Date.now()}
 *         -> Preserves sales lines, warranty audits, and financial ledgers without FK constraint violations.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Enforce Tier 1 Store Owner / Administrator Clearance (RBAC)
    const auth = await requireAdmin(request);

    // 2. Validate id parameter
    let id: string;
    try {
      const resolvedParams = await params;
      id = resolvedParams.id;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Product ID parameter is required.',
            code: 'BAD_REQUEST',
          },
        },
        { status: 400 }
      );
    }

    if (!id || typeof id !== 'string' || !id.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Product ID parameter is required.',
            code: 'BAD_REQUEST',
          },
        },
        { status: 400 }
      );
    }

    const cleanId = id.trim();

    // 3. Fetch Product with Dependency Counts: sales and stockMovements
    const product = await prisma.product.findUnique({
      where: { id: cleanId },
      include: {
        _count: {
          select: {
            sales: true,
            stockMovements: true,
          },
        },
      },
    });

    // 4. Return 404 Not Found if product record does not exist or was already purged
    if (
      !product ||
      product.shopId !== DEFAULT_SHOP_ID ||
      product.deletedAt !== null ||
      product.isArchived
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Product with identifier "${cleanId}" was not found.`,
            code: 'NOT_FOUND',
          },
        },
        { status: 404 }
      );
    }

    const salesCount = product._count?.sales ?? 0;
    const stockMovementsCount = product._count?.stockMovements ?? 0;

    // -------------------------------------------------------------------------
    // PATH A: Zero Historical Ledger (Clean Hard Delete)
    // -------------------------------------------------------------------------
    if (salesCount === 0 && stockMovementsCount === 0) {
      // Execute physical database deletion
      await prisma.product.delete({
        where: { id: product.id },
      });

      // Audit Trail for Hard Purge
      await prisma.auditLog.create({
        data: {
          shopId: product.shopId,
          actorUserId: auth.user.id,
          action: 'PRODUCT_HARD_PURGED',
          entityType: 'Product',
          entityId: product.id,
          oldValues: {
            sku: product.sku,
            barcode: product.barcode,
            name: product.name,
            brand: product.brand,
          },
          newValues: {
            purgeType: 'HARD_DELETE',
            purgedBy: auth.user.fullName,
            purgedAt: new Date().toISOString(),
          },
          ipAddress: request.headers.get('x-forwarded-for') || null,
          userAgent: request.headers.get('user-agent') || null,
        },
      });

      return NextResponse.json(
        {
          success: true,
          type: 'HARD_DELETE',
          message: `Product "${product.name}" was permanently purged from the database.`,
        },
        { status: 200 }
      );
    }

    // -------------------------------------------------------------------------
    // PATH B: Ledger-Preserved Permanent Purge
    // -------------------------------------------------------------------------
    const timestamp = Date.now();
    const purgedSku = `${product.sku}_PURGED_${timestamp}`;
    const purgedBarcode = product.barcode ? `${product.barcode}_PURGED_${timestamp}` : null;
    const purgedAt = new Date();

    const updated = await prisma.product.update({
      where: { id: product.id },
      data: {
        deletedAt: purgedAt,
        isArchived: true,
        stockQuantity: 0,
        onHand: 0,
        sku: purgedSku,
        barcode: purgedBarcode,
        status: 'purged',
      },
    });

    // Audit Trail for Ledger-Preserved Purge
    await prisma.auditLog.create({
      data: {
        shopId: product.shopId,
        actorUserId: auth.user.id,
        action: 'PRODUCT_PERMANENT_CATALOG_PURGE',
        entityType: 'Product',
        entityId: product.id,
        oldValues: {
          sku: product.sku,
          barcode: product.barcode,
          stockQuantity: product.stockQuantity ?? product.onHand,
          salesCount,
          stockMovementsCount,
        },
        newValues: {
          purgeType: 'PERMANENT_CATALOG_PURGE',
          purgedSku,
          purgedBarcode,
          stockQuantity: 0,
          isArchived: true,
          deletedAt: updated.deletedAt?.toISOString(),
          purgedBy: auth.user.fullName,
        },
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        type: 'PERMANENT_CATALOG_PURGE',
        message: `Product "${product.name}" has been permanently removed from the active catalog and POS terminals.`,
        data: { id: product.id },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error.message,
            code: error.code,
            details: error.details,
          },
        },
        { status: error.statusCode }
      );
    }

    console.error('DELETE /api/products/[id] database error:', error);
    const message = error instanceof Error ? error.message : 'An unexpected database error occurred during product purge.';
    return NextResponse.json(
      {
        success: false,
        error: {
          message,
          code: 'INTERNAL_SERVER_ERROR',
        },
      },
      { status: 500 }
    );
  }
}
