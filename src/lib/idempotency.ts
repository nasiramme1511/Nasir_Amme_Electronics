import { prisma } from '@/lib/prisma';
import { IdempotencyConflictError } from '@/lib/errors';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';

export interface IdempotencyOptions {
  shopId: string;
  operation: string;
  idempotencyKey?: string;
  payload: unknown;
  ttlHours?: number;
}

/**
 * Executes a transactional operation protected by an idempotency key.
 * If no key is provided, the operation executes normally.
 * If a completed record with the key exists, its cached response is returned immediately.
 * If a record is currently processing, a conflict error is thrown to prevent race conditions.
 */
export async function withIdempotency<T>(
  options: IdempotencyOptions,
  operationFn: () => Promise<T>
): Promise<T> {
  const { shopId, operation, idempotencyKey, payload, ttlHours = 24 } = options;

  if (!idempotencyKey || idempotencyKey.trim().length === 0) {
    return operationFn();
  }

  const normalizedKey = idempotencyKey.trim();
  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');

  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  // 1. Check if already completed and return immediately
  const existingRecord = await prisma.idempotencyRecord.findUnique({
    where: {
      shopId_operation_idempotencyKey: {
        shopId,
        operation,
        idempotencyKey: normalizedKey,
      },
    },
  });

  if (existingRecord) {
    if (existingRecord.status === 'completed' && existingRecord.responseJson !== null) {
      return existingRecord.responseJson as unknown as T;
    }
    if (existingRecord.status === 'processing') {
      throw new IdempotencyConflictError(normalizedKey);
    }
  }

  // 2. Claim the idempotency record atomically via insert
  try {
    await prisma.idempotencyRecord.create({
      data: {
        shopId,
        operation,
        idempotencyKey: normalizedKey,
        requestHash,
        status: 'processing',
        expiresAt,
      },
    });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      err.code === 'P2002'
    ) {
      // Caught race condition where another concurrent worker claimed the key first
      const concurrentRecord = await prisma.idempotencyRecord.findUnique({
        where: {
          shopId_operation_idempotencyKey: {
            shopId,
            operation,
            idempotencyKey: normalizedKey,
          },
        },
      });

      if (concurrentRecord?.status === 'completed' && concurrentRecord.responseJson !== null) {
        return concurrentRecord.responseJson as unknown as T;
      }
      throw new IdempotencyConflictError(normalizedKey);
    }
    throw err;
  }

  try {
    const result = await operationFn();

    // Mark completed with response
    await prisma.idempotencyRecord.update({
      where: {
        shopId_operation_idempotencyKey: {
          shopId,
          operation,
          idempotencyKey: normalizedKey,
        },
      },
      data: {
        status: 'completed',
        responseJson: result as unknown as Prisma.InputJsonValue,
      },
    });

    return result;
  } catch (error) {
    // On failure, mark status as failed so client can retry with same key if appropriate
    await prisma.idempotencyRecord.update({
      where: {
        shopId_operation_idempotencyKey: {
          shopId,
          operation,
          idempotencyKey: normalizedKey,
        },
      },
      data: {
        status: 'failed',
      },
    }).catch(() => {
      // Ignore cleanup error if record missing
    });

    throw error;
  }
}
