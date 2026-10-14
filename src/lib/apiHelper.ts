import { NextResponse } from 'next/server';
import { AppError } from './errors';

export function jsonSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function jsonError(error: unknown) {
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
