import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface AuditLogParams {
  shopId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: unknown;
  newValues?: unknown;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  /**
   * Records an immutable audit log entry.
   * Can run standalone or inside an active Prisma interactive transaction.
   */
  public static async log(
    params: AuditLogParams,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx ?? prisma;

    await client.auditLog.create({
      data: {
        shopId: params.shopId,
        actorUserId: params.actorUserId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: params.oldValues ? (params.oldValues as Prisma.InputJsonValue) : Prisma.JsonNull,
        newValues: params.newValues ? (params.newValues as Prisma.InputJsonValue) : Prisma.JsonNull,
        requestId: params.requestId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }
}
