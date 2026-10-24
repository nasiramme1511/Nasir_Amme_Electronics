"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DEFAULT_SHOP_ID } from "@/lib/apiHelper";
import { Prisma } from "@prisma/client";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Context-independent fallback for non-Next request runners (e.g., CLI/scripts)
  }
}

// -------------------------------------------------------------
// 1. SUPPLIERS
// -------------------------------------------------------------
export async function getSuppliersDirectory() {
  const suppliers = await prisma.supplier.findMany({
    where: { shopId: DEFAULT_SHOP_ID },
    include: {
      purchaseOrders: {
        select: {
          grandTotal: true,
          status: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return suppliers.map((s) => {
    const totalPurchased = s.purchaseOrders.reduce(
      (sum, po) => sum + Number(po.grandTotal),
      0
    );
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      contactPerson: s.contactName || "",
      phone: s.phone,
      email: s.email,
      cityHub: s.cityHub || s.city,
      address: s.addressText,
      paymentTerms: s.paymentTerms,
      notes: s.notes,
      totalPurchased,
      balanceDue: 0.0,
      isActive: s.status === "active",
    };
  });
}

// -------------------------------------------------------------
// 2. CUSTOMERS
// -------------------------------------------------------------
export async function getCustomersDirectory() {
  const customers = await prisma.customer.findMany({
    where: { shopId: DEFAULT_SHOP_ID },
    include: {
      sales: {
        select: {
          grandTotal: true,
        },
      },
    },
    orderBy: { displayName: "asc" },
  });

  return customers.map((c) => {
    const totalSpent = c.sales.reduce((sum, s) => sum + Number(s.grandTotal), 0);
    return {
      id: c.id,
      name: c.displayName,
      phone: c.phone,
      email: c.email,
      customerType: c.customerType.toUpperCase(),
      priceTier: c.priceTier.toUpperCase(),
      city: c.city,
      addressNotes: c.addressText,
      creditLimit: Number(c.creditLimit),
      creditBalance: Number(c.creditBalance),
      loyaltyPoints: c.loyaltyPoints,
      totalSpent,
    };
  });
}

export async function updateCustomerRecord(
  id: string,
  payload: {
    name: string;
    phone: string;
    email?: string;
    customerType: string;
    city: string;
    addressNotes?: string;
  }
) {
  const updated = await prisma.customer.update({
    where: { id },
    data: {
      displayName: payload.name,
      phone: payload.phone,
      email: payload.email || null,
      customerType: payload.customerType.toLowerCase(),
      city: payload.city,
      addressText: payload.addressNotes || null,
    },
  });
  safeRevalidatePath("/customers");
  return updated;
}

// -------------------------------------------------------------
// 3. PURCHASES & GOODS RECEIVING
// -------------------------------------------------------------
export async function getPurchaseOrders() {
  const pos = await prisma.purchaseOrder.findMany({
    where: { shopId: DEFAULT_SHOP_ID },
    include: {
      supplier: {
        select: { name: true },
      },
      items: {
        select: {
          orderedQuantity: true,
          receivedQuantity: true,
          unitCost: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return pos.map((po) => {
    const itemCount = po.items.length;
    const totalUnits = po.items.reduce((sum, i) => sum + i.orderedQuantity, 0);
    return {
      id: po.id,
      poNumber: po.poNumber,
      orderDate: (po.orderedAt || po.createdAt).toISOString(),
      deliveryDue: po.expectedAt ? po.expectedAt.toISOString() : null,
      supplierName: po.supplier.name,
      itemCount,
      totalUnits,
      totalCost: Number(po.grandTotal),
      status: po.status === "received" ? "RECEIVED_FULL" : "ORDERED",
    };
  });
}

export async function receivePurchaseOrder(
  poId: string,
  userId: string,
  serialNumbersByProduct?: Record<string, string[]>
) {
  return await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true },
    });

    if (!po) throw new Error("Purchase order not found");
    if (po.status === "received") {
      throw new Error("Purchase order already received into stock");
    }

    for (const item of po.items) {
      const receivingQty = item.orderedQuantity - item.receivedQuantity;
      if (receivingQty <= 0) continue;

      // Update purchase item received qty
      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { receivedQuantity: item.orderedQuantity },
      });

      // Get previous product balance
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      const prevStock = product ? product.onHand : 0;
      const newStock = prevStock + receivingQty;

      // Handle Serialized Custody (IMEIs / Serial Numbers)
      if (product?.hasSerials || (serialNumbersByProduct && serialNumbersByProduct[item.productId])) {
        const serials = serialNumbersByProduct?.[item.productId] || [];
        if (serials.length !== receivingQty) {
          throw new Error(
            `Product "${product?.name || item.productId}" requires exactly ${receivingQty} serialized IMEI entries. Received ${serials.length}.`
          );
        }
        for (const sn of serials) {
          const trimmed = sn.trim();
          if (!trimmed) throw new Error("Empty serial number detected during intake.");
          await tx.productSerial.upsert({
            where: {
              shopId_serialNumber: {
                shopId: po.shopId,
                serialNumber: trimmed,
              },
            },
            create: {
              shopId: po.shopId,
              productId: item.productId,
              serialNumber: trimmed,
              status: "in_stock",
            },
            update: {
              status: "in_stock",
              productId: item.productId,
            },
          });
        }
      }

      // Append immutable stock movement
      await tx.stockMovement.create({
        data: {
          shopId: po.shopId,
          productId: item.productId,
          movementType: "purchase_receive",
          quantityDelta: receivingQty,
          unitCostSnapshot: item.unitCost,
          previousStock: prevStock,
          balanceAfter: newStock,
          referenceNumber: po.poNumber,
          sourceType: "goods_receipt",
          sourceId: po.id,
          actorId: userId,
        },
      });

      // Update cached on-hand balance on product
      await tx.product.update({
        where: { id: item.productId },
        data: {
          onHand: { increment: receivingQty },
          averageCost: item.unitCost,
        },
      });
    }

    // Mark PO received
    await tx.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: "received",
        receivedAt: new Date(),
      },
    });

    safeRevalidatePath("/purchases");
    safeRevalidatePath("/products");
    safeRevalidatePath("/inventory");
    safeRevalidatePath("/inventory/intake");
    return { success: true };
  }, {
    maxWait: 10000,
    timeout: 25000,
  });
}

export async function receiveDirectIntake(
  payload: {
    shopId?: string;
    productId: string;
    quantity: number;
    unitCost: number;
    serialNumbers?: string[];
    referenceNumber?: string;
    notes?: string;
  },
  userId: string
) {
  const shopId = payload.shopId || DEFAULT_SHOP_ID;
  const { productId, quantity, unitCost, serialNumbers, referenceNumber, notes } = payload;

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive integer.");
  }
  if (unitCost < 0) {
    throw new Error("Unit cost cannot be negative.");
  }

  return await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
    });
    if (!product || product.shopId !== shopId) {
      throw new Error("Product not found in this shop.");
    }

    const prevStock = product.onHand || 0;
    const newStock = prevStock + quantity;

    // Moving average cost calculation:
    // (prevStock * prevCost + quantity * unitCost) / newStock
    const prevCost = Number(product.averageCost || 0);
    const newAverageCost = newStock > 0
      ? (prevStock * prevCost + quantity * unitCost) / newStock
      : unitCost;

    // Serialized item custody:
    if (product.hasSerials || (serialNumbers && serialNumbers.length > 0)) {
      if (!serialNumbers || serialNumbers.length !== quantity) {
        throw new Error(
          `Product "${product.name}" requires exactly ${quantity} serial / IMEI entries. Received ${serialNumbers?.length || 0}.`
        );
      }
      for (const sn of serialNumbers) {
        const trimmed = sn.trim();
        if (!trimmed) throw new Error("Empty serial number detected during direct intake.");
        await tx.productSerial.upsert({
          where: {
            shopId_serialNumber: {
              shopId,
              serialNumber: trimmed,
            },
          },
          create: {
            shopId,
            productId,
            serialNumber: trimmed,
            status: "in_stock",
          },
          update: {
            status: "in_stock",
            productId,
          },
        });
      }
    }

    const ref = referenceNumber || `INTAKE-${Date.now().toString().slice(-6)}`;

    // Append to immutable stock movement ledger
    const movement = await tx.stockMovement.create({
      data: {
        shopId,
        productId,
        movementType: "purchase_receive",
        quantityDelta: quantity,
        unitCostSnapshot: new Prisma.Decimal(unitCost),
        previousStock: prevStock,
        balanceAfter: newStock,
        referenceNumber: ref,
        sourceType: "goods_receipt",
        notes: notes || (serialNumbers?.length ? `Serials: ${serialNumbers.join(', ')}` : undefined),
        actorId: userId,
      },
    });

    // Update product on-hand and averageCost
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: {
        onHand: newStock,
        stockQuantity: newStock,
        averageCost: new Prisma.Decimal(Math.round(newAverageCost * 100) / 100),
      },
    });

    safeRevalidatePath("/inventory");
    safeRevalidatePath("/inventory/intake");
    safeRevalidatePath("/products");
    return { success: true, movementId: movement.id, product: updatedProduct };
  }, {
    maxWait: 10000,
    timeout: 25000,
  });
}

// -------------------------------------------------------------
// 4. CATEGORIES
// -------------------------------------------------------------
export async function getCategoriesWithValuation() {
  const categories = await prisma.category.findMany({
    where: { shopId: DEFAULT_SHOP_ID, status: "active" },
    include: {
      products: {
        where: {
          deletedAt: null,
          isArchived: false,
        },
        include: {
          stockMovements: {
            select: { quantityDelta: true },
          },
        },
      },
    },
    orderBy: { displayOrder: "asc" },
  });

  return categories.map((cat) => {
    let categoryValuation = 0;
    for (const p of cat.products) {
      const stock =
        p.stockMovements.length > 0
          ? p.stockMovements.reduce((sum, m) => sum + m.quantityDelta, 0)
          : p.onHand;
      categoryValuation += Number(p.sellingPrice) * stock;
    }

    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      iconName: cat.iconName,
      description: cat.description,
      posVisible: cat.posVisible,
      productCount: cat.products.length,
      inventoryValuationETB: categoryValuation,
    };
  });
}

export async function createCategory(payload: {
  name: string;
  slug: string;
  iconName?: string;
  description?: string;
  posVisible?: boolean;
}) {
  const category = await prisma.category.create({
    data: {
      shopId: DEFAULT_SHOP_ID,
      name: payload.name.trim(),
      slug: payload.slug.trim().toLowerCase(),
      iconName: payload.iconName || "FolderTree",
      description: payload.description || null,
      posVisible: payload.posVisible ?? true,
      status: "active",
    },
  });
  safeRevalidatePath("/categories");
  return category;
}

// -------------------------------------------------------------
// 5. PRODUCTS MASTER
// -------------------------------------------------------------
export async function createProductWithOpeningStock(
  payload: {
    name: string;
    sku: string;
    barcode: string;
    brand: string;
    categoryId: string;
    costPrice: number;
    retailPrice: number;
    openingStock: number;
    minThreshold: number;
    warrantyMonths: number;
    shelfLocation?: string;
    trackSerials?: boolean;
    description?: string;
  },
  userId: string
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Create product row
    const product = await tx.product.create({
      data: {
        shopId: DEFAULT_SHOP_ID,
        name: payload.name.trim(),
        sku: payload.sku.trim().toUpperCase(),
        barcode: payload.barcode.trim(),
        brand: payload.brand.trim(),
        categoryId: payload.categoryId,
        averageCost: new Prisma.Decimal(payload.costPrice),
        sellingPrice: new Prisma.Decimal(payload.retailPrice),
        onHand: payload.openingStock,
        reorderLevel: payload.minThreshold,
        warrantyMonths: payload.warrantyMonths,
        location: payload.shelfLocation || null,
        hasSerials: payload.trackSerials ?? false,
        description: payload.description || null,
        status: "active",
      },
    });

    // 2. If opening stock > 0, write initial stock ledger entry
    if (payload.openingStock > 0) {
      await tx.stockMovement.create({
        data: {
          shopId: DEFAULT_SHOP_ID,
          productId: product.id,
          movementType: "opening_balance",
          quantityDelta: payload.openingStock,
          unitCostSnapshot: new Prisma.Decimal(payload.costPrice),
          previousStock: 0,
          balanceAfter: payload.openingStock,
          referenceNumber: `OPEN-${product.sku}`,
          sourceType: "catalog_edit",
          actorId: userId,
        },
      });
    }

    safeRevalidatePath("/products");
    safeRevalidatePath("/categories");
    safeRevalidatePath("/inventory");
    return product;
  }, {
    maxWait: 10000,
    timeout: 25000,
  });
}
