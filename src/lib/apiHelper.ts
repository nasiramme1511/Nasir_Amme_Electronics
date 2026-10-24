import { NextResponse } from 'next/server';
import { AppError } from './errors';
import { ZodError } from 'zod';

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function jsonError(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as { digest: unknown }).digest === 'string' &&
    (error as { digest: string }).digest.startsWith('NEXT_')
  ) {
    throw error;
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.issues.map((i) => i.message).join(', ') || 'Validation error.',
          code: 'VALIDATION_ERROR',
          details: error.issues,
        },
      },
      { status: 400 }
    );
  }

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

  console.error('Unhandled API Error:', error);
  const message = error instanceof Error ? error.message : 'An unexpected server error occurred.';
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

export const DEFAULT_SHOP_ID = 'shop-dire-dawa-01';
