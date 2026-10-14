import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';
import { ValidationError } from '@/lib/errors';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        shopId: DEFAULT_SHOP_ID,
        status: 'active',
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const formatted = categories.map((c) => ({
      ...c,
      productCount: c._count.products,
    }));

    return jsonSuccess(formatted);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, description, iconName = 'Shield' } = body;

    if (!name || name.trim().length === 0) {
      throw new ValidationError('Category name is required.');
    }

    const generatedSlug = slug
      ? slug.trim().toLowerCase()
      : name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const category = await prisma.category.create({
      data: {
        shopId: DEFAULT_SHOP_ID,
        name: name.trim(),
        slug: generatedSlug,
        description,
        iconName,
        status: 'active',
      },
    });

    return jsonSuccess(category, 201);
  } catch (error) {
    return jsonError(error);
  }
}
