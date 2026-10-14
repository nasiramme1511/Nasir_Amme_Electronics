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

  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  // Claim the idempotency record
  await prisma.idempotencyRecord.upsert({
    where: {
      shopId_operation_idempotencyKey: {
        shopId,
        operation,
        idempotencyKey: normalizedKey,
      },
    },
    update: {
      status: 'processing',
      requestHash,
      expiresAt,
    },
    create: {
      shopId,
      operation,
      idempotencyKey: normalizedKey,
      requestHash,
      status: 'processing',
      expiresAt,
    },
  });

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
