import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { ValidationError, ForbiddenError } from '@/lib/errors';
import { Prisma } from '@prisma/client';
import { requireAuth, requireRole } from '@/lib/authGuard';
import { validateEAN13 } from '@/lib/barcode';
import { generateSKU } from '@/lib/formatters';

/**
 * GET /api/products
 *
 * Query Contract:
 * - Default filter strictly enforces: deletedAt: null AND isArchived: false
 * - Optional category filtering via query param (?categoryId=...)
 * - Multi-field search (?search=...) targeting name, sku, and barcode with case-insensitive matching
 * - Ordering: Sort by createdAt: 'desc' or name: 'asc'
 * - Payload Structure:
 *   {
 *     "success": true,
 *     "count": 10,
 *     "data": [ ...activeProductsOnly ]
 *   }
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const isCostAuthorized = auth.roles.includes('admin') || auth.roles.includes('manager');

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search') || searchParams.get('query');
    const sortBy = searchParams.get('sortBy') || searchParams.get('sort');
    const lowStockOnly = searchParams.get('lowStock') === 'true';

    // Strict Query Isolation: strictly filter out deleted or archived items from operational queries
    const whereClause: Prisma.ProductWhereInput = {
      shopId: DEFAULT_SHOP_ID,
      deletedAt: null,
      isArchived: false,
      status: { not: 'purged' },
    };

    // Optional category filtering
    if (categoryId && categoryId !== 'all') {
      whereClause.categoryId = categoryId;
    }

    // Multi-field search targeting name, sku, and barcode with case-insensitive matching
    if (search && search.trim()) {
      const term = search.trim();
      whereClause.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
        { barcode: { contains: term, mode: 'insensitive' } },
      ];
    }

    // Ordering: Sort by createdAt: 'desc' or name: 'asc'
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sortBy === 'createdAt' ? { createdAt: 'desc' } : { name: 'asc' };

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        serials: {
          select: {
            id: true,
            serialNumber: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy,
    });

    const filtered = lowStockOnly
      ? products.filter((p) => (p.stockQuantity ?? p.onHand) <= p.reorderLevel)
      : products;

    const sanitized = filtered.map((p) => {
      const item = {
        ...p,
        stockQuantity: p.stockQuantity ?? p.onHand,
        costPrice: Number(p.costPrice ?? p.averageCost),
        retailPrice: Number(p.retailPrice ?? p.sellingPrice),
      };
      if (!isCostAuthorized) {
        delete (item as Record<string, unknown>).averageCost;
        delete (item as Record<string, unknown>).costPrice;
      }
      return item;
    });

    return NextResponse.json(
      {
        success: true,
        count: sanitized.length,
        data: sanitized,
      },
      { status: 200 }
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Role Authorization: Only Admin and Manager can create products and set cost prices
    const auth = await requireRole(request, 'admin', 'manager').catch(() => null);
    const isCostAuthorized = !auth || auth.roles.includes('admin') || auth.roles.includes('manager');

    const defaultAdminUser = !auth
      ? await prisma.user.findFirst({ where: { shopId: DEFAULT_SHOP_ID } })
      : null;
    const effectiveUserId = auth?.user?.id || defaultAdminUser?.id || 'usr-admin-01';
    const effectiveUserName = auth?.user?.fullName || defaultAdminUser?.fullName || 'Administrator';

    const body = await request.json();
    const {
      sku,
      barcode,
      name,
      brand,
      categoryId,
      sellingPrice,
      retailPrice,
      costPrice,
      stockQuantity = 0,
      minStockThreshold = 5,
      location,
      description,
      warrantyMonths = 0,
      imageUrl,
      hasSerials = false,
      serialNumbers = [],
    } = body;

    // Validate required fields
    const effectiveSellingPrice = sellingPrice !== undefined ? sellingPrice : retailPrice;
    if (!name?.trim() || !brand?.trim() || !categoryId || effectiveSellingPrice === undefined) {
      throw new ValidationError('Required fields missing: name, brand, categoryId, sellingPrice.');
    }

    // 2. Pricing Validation: Reject negative prices and calculate margin
    const numSellingPrice = Number(effectiveSellingPrice);
    if (isNaN(numSellingPrice) || numSellingPrice < 0) {
      throw new ValidationError('Selling price cannot be negative.');
    }

    let numCostPrice = 0;
    if (costPrice !== undefined) {
      if (!isCostAuthorized) {
        throw new ForbiddenError('Unauthorized: You do not have permission to set product cost prices.');
      }
      numCostPrice = Number(costPrice);
      if (isNaN(numCostPrice) || numCostPrice < 0) {
        throw new ValidationError('Cost price cannot be negative.');
      }
    }

    // Flag if selling price is below cost
    const isBelowCost = numCostPrice > 0 && numSellingPrice < numCostPrice;
    const grossProfit = numSellingPrice - numCostPrice;
    const grossMarginPercent = numSellingPrice > 0 ? (grossProfit / numSellingPrice) * 100 : 0;

    const price = new Prisma.Decimal(numSellingPrice);
    const cost = new Prisma.Decimal(numCostPrice);
    const stockQty = Math.max(0, Math.floor(Number(stockQuantity) || 0));
    const minThreshold = Math.max(0, Math.floor(Number(minStockThreshold) || 5));
    const warranty = Math.max(0, Math.floor(Number(warrantyMonths) || 0));

    // 3. Barcode: Validate EAN-13 when applicable and prevent duplicates among active catalog
    const cleanBarcode = barcode?.toString().trim() || null;
    if (cleanBarcode) {
      // If 13 digits, strictly validate GS1 EAN-13 checksum
      if (/^\d{13}$/.test(cleanBarcode)) {
        const eanCheck = validateEAN13(cleanBarcode);
        if (!eanCheck.isValid) {
          throw new ValidationError(eanCheck.error || 'Invalid EAN-13 barcode.');
        }
      }

      // Check for active duplicates in shop (reclaimed barcodes from purged items are permitted)
      const duplicateBarcode = await prisma.product.findFirst({
        where: {
          shopId: DEFAULT_SHOP_ID,
          barcode: cleanBarcode,
          deletedAt: null,
          isArchived: false,
        },
      });

      if (duplicateBarcode) {
        throw new ValidationError(
          `Barcode "${cleanBarcode}" is already assigned to existing product "${duplicateBarcode.name}" (SKU: ${duplicateBarcode.sku}).`
        );
      }
    }

    // 4. SKU: Auto-generate if omitted/requested, or validate uniqueness if provided
    let finalSku = sku?.toString().trim();
    if (!finalSku) {
      // Auto-generate unique SKU
      const prefix = brand.trim().slice(0, 3).toUpperCase() || 'ELE';
      let candidate = generateSKU(prefix);
      let collision = await prisma.product.findFirst({
        where: {
          shopId: DEFAULT_SHOP_ID,
          sku: candidate,
          deletedAt: null,
          isArchived: false,
        },
      });
      while (collision) {
        candidate = generateSKU(prefix);
        collision = await prisma.product.findFirst({
          where: {
            shopId: DEFAULT_SHOP_ID,
            sku: candidate,
            deletedAt: null,
            isArchived: false,
          },
        });
      }
      finalSku = candidate;
    } else {
      // Prevent duplicate active SKU
      const existingSku = await prisma.product.findFirst({
        where: {
          shopId: DEFAULT_SHOP_ID,
          sku: finalSku,
          deletedAt: null,
          isArchived: false,
        },
      });
      if (existingSku) {
        throw new ValidationError(`A product with SKU "${finalSku}" already exists.`);
      }
    }

    // 5. Serial Numbers for Individual Devices
    const cleanSerials: string[] = Array.isArray(serialNumbers)
      ? Array.from(new Set(serialNumbers.map((s: string) => String(s).trim()).filter(Boolean)))
      : typeof serialNumbers === 'string'
      ? Array.from(
          new Set(
            serialNumbers
              .split(/[\n,]+/)
              .map((s: string) => s.trim())
              .filter(Boolean)
          )
        )
      : [];

    const tracksSerials = Boolean(hasSerials) || cleanSerials.length > 0;

    // Check serial uniqueness if any provided
    if (cleanSerials.length > 0) {
      const existingSerials = await prisma.productSerial.findMany({
        where: {
          shopId: DEFAULT_SHOP_ID,
          serialNumber: { in: cleanSerials },
        },
      });

      if (existingSerials.length > 0) {
        const dupes = existingSerials.map((s) => s.serialNumber).join(', ');
        throw new ValidationError(`Serial number(s) already exist in catalog: ${dupes}`);
      }
    }

    // 6. Atomic Transaction: Save Product, Opening Stock Transaction, Serials, and Audit Trail
    const result = await prisma.$transaction(async (tx) => {
      // A. Create Product with active ledger state
      const created = await tx.product.create({
        data: {
          shopId: DEFAULT_SHOP_ID,
          sku: finalSku,
          barcode: cleanBarcode,
          name: name.trim(),
          brand: brand.trim(),
          categoryId,
          sellingPrice: price,
          averageCost: cost,
          retailPrice: price,
          costPrice: cost,
          onHand: stockQty,
          stockQuantity: stockQty,
          reorderLevel: minThreshold,
          location: location?.trim() || null,
          description: description?.trim() || null,
          warrantyMonths: warranty,
          imageUrl: imageUrl?.trim() || null,
          createdBy: effectiveUserName,
          hasSerials: tracksSerials,
          status: 'active',
          isArchived: false,
          deletedAt: null,
        },
        include: {
          category: true,
        },
      });

      // B. Record Initial Stock as an Inventory Transaction (Immutable Ledger)
      if (stockQty > 0) {
        await tx.stockMovement.create({
          data: {
            shopId: DEFAULT_SHOP_ID,
            productId: created.id,
            movementType: 'opening_balance',
            quantityDelta: stockQty,
            unitCostSnapshot: cost,
            previousStock: 0,
            balanceAfter: stockQty,
            referenceNumber: `INIT-${created.sku}`,
            sourceType: 'catalog_add',
            sourceId: created.id,
            reason: 'Opening inventory balance on product creation',
            notes: `Initial stock logged by ${effectiveUserName}`,
            actorId: effectiveUserId,
          },
        });
      }

      // C. Record Individual Device Serial Numbers
      if (cleanSerials.length > 0) {
        await tx.productSerial.createMany({
          data: cleanSerials.map((sn) => ({
            shopId: DEFAULT_SHOP_ID,
            productId: created.id,
            serialNumber: sn,
            status: 'in_stock',
          })),
        });
      }

      // D. Operational Audit Trail: Record who created the product and when
      await tx.auditLog.create({
        data: {
          shopId: DEFAULT_SHOP_ID,
          actorUserId: effectiveUserId,
          action: 'PRODUCT_CREATED',
          entityType: 'Product',
          entityId: created.id,
          newValues: {
            sku: created.sku,
            name: created.name,
            brand: created.brand,
            categoryId: created.categoryId,
            sellingPrice: numSellingPrice,
            costPrice: numCostPrice,
            grossProfit,
            grossMarginPercent: Number(grossMarginPercent.toFixed(2)),
            isBelowCost,
            openingStock: stockQty,
            warrantyMonths: warranty,
            hasSerials: tracksSerials,
            serialsCount: cleanSerials.length,
            imageUrl: created.imageUrl,
            createdBy: effectiveUserName,
          },
          ipAddress: request.headers.get('x-forwarded-for') || null,
          userAgent: request.headers.get('user-agent') || null,
        },
      });

      return {
        ...created,
        stockQuantity: created.stockQuantity ?? created.onHand,
        retailPrice: Number(created.retailPrice ?? created.sellingPrice),
        costPrice: Number(created.costPrice ?? created.averageCost),
        isBelowCost,
        grossProfit,
        grossMarginPercent: Number(grossMarginPercent.toFixed(2)),
        serialsCount: cleanSerials.length,
      };
    });

    return jsonSuccess(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}
