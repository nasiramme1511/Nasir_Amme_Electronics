import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/permissions/guards';
import { jsonSuccess, jsonError, DEFAULT_SHOP_ID } from '@/lib/apiHelper';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
    const action = searchParams.get('action');

    const logs = await prisma.auditLog.findMany({
      where: {
        shopId: DEFAULT_SHOP_ID,
        ...(action ? { action } : {}),
      },
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        occurredAt: 'desc',
      },
      take: limit,
    });

    return jsonSuccess(logs);
  } catch (error) {
    return jsonError(error);
  }
}
