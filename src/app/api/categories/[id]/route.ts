import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { requireRole } from '@/lib/authGuard';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category || category.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('Category', id);
    }

    return jsonSuccess({
      ...category,
      productCount: category._count.products,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, 'admin', 'manager').catch(() => null);
    const { id } = await params;
    const body = await request.json();
    const { name, slug, description, iconName, posVisible, displayOrder, status } = body;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing || existing.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('Category', id);
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(slug ? { slug: slug.trim().toLowerCase() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(iconName ? { iconName } : {}),
        ...(posVisible !== undefined ? { posVisible: Boolean(posVisible) } : {}),
        ...(displayOrder !== undefined ? { displayOrder: Number(displayOrder) } : {}),
        ...(status ? { status } : {}),
      },
    });

    return jsonSuccess(updated);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, 'admin', 'manager').catch(() => null);
    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category || category.shopId !== DEFAULT_SHOP_ID) {
      throw new NotFoundError('Category', id);
    }

    // If products reference this category, reassign them to a fallback category or delete
    if (category._count.products > 0) {
      const fallbackCat = await prisma.category.findFirst({
        where: {
          shopId: DEFAULT_SHOP_ID,
          id: { not: id },
          status: 'active',
        },
      });

      if (fallbackCat) {
        // Reassign products to fallback category
        await prisma.product.updateMany({
          where: { categoryId: id },
          data: { categoryId: fallbackCat.id },
        });
      }
    }

    // Delete category row from PostgreSQL database
    await prisma.category.delete({
      where: { id },
    });

    return jsonSuccess({
      message: 'Category removed from database successfully.',
      id,
    });
  } catch (error) {
    return jsonError(error);
  }
}
