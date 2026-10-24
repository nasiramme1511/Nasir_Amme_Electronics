"use server";

import { prisma } from "@/lib/prisma";
import { DEFAULT_SHOP_ID } from "@/lib/apiHelper";

export interface ProductInventoryDTO {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  retailPrice: number;
  costPrice: number;
  stock: number;
  minThreshold: number;
}

export interface CatalogMetricsDTO {
  totalSkus: number;
  totalUnits: number;
  totalCostValuation: number;
  totalRetailValuation: number;
  lowStockCount: number;
}

/**
 * Queries PostgreSQL via Prisma, deriving live inventory dynamically
 * from the immutable stock movements ledger and product records.
 */
export async function fetchLiveCatalog(): Promise<ProductInventoryDTO[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        shopId: DEFAULT_SHOP_ID,
        deletedAt: null,
        isArchived: false,
      },
      include: {
        stockMovements: {
          select: {
            quantityDelta: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return products.map((p) => {
      // Calculate active stock from immutable movements sum, falling back to onHand
      const ledgerSum = p.stockMovements.reduce((acc, m) => acc + m.quantityDelta, 0);
      const currentStock = p.stockMovements.length > 0 ? ledgerSum : p.onHand;

      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode || "",
        retailPrice: Number(p.sellingPrice),
        costPrice: Number(p.averageCost),
        stock: currentStock,
        minThreshold: p.reorderLevel,
      };
    });
  } catch (error) {
    console.error("Failed to query catalog from PostgreSQL:", error);
    throw new Error("Database query failed");
  }
}

/**
 * Calculates financial inventory valuations directly from PostgreSQL.
 */
export async function fetchCatalogMetrics(): Promise<CatalogMetricsDTO> {
  const products = await fetchLiveCatalog();

  const totalCostValuation = products.reduce((acc, p) => acc + p.costPrice * p.stock, 0);
  const totalRetailValuation = products.reduce((acc, p) => acc + p.retailPrice * p.stock, 0);
  const lowStockCount = products.filter((p) => p.stock <= p.minThreshold).length;

  return {
    totalSkus: products.length,
    totalUnits: products.reduce((acc, p) => acc + p.stock, 0),
    totalCostValuation,
    totalRetailValuation,
    lowStockCount,
  };
}
