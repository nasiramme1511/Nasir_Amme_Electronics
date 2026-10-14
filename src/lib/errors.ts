/**
 * Domain-specific error classes for Nasir Amme Electronics Backend Services.
 * These ensure clear semantic errors across transaction boundaries and API responses.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    const msg = identifier ? `${resource} with identifier "${identifier}" was not found.` : `${resource} not found.`;
    super(msg, 404, 'NOT_FOUND');
  }
}

export class InsufficientStockError extends AppError {
  constructor(productName: string, requested: number, available: number) {
    super(
      `Insufficient stock for "${productName}". Requested: ${requested}, Available on shelf: ${available}.`,
      409,
      'INSUFFICIENT_STOCK',
      { productName, requested, available }
    );
  }
}

export class CumulativeReturnLimitError extends AppError {
  constructor(productName: string, requestedQty: number, remainingReturnable: number) {
    super(
      `Cannot return ${requestedQty} units of "${productName}". Maximum remaining returnable quantity is ${remainingReturnable}.`,
      400,
      'CUMULATIVE_RETURN_LIMIT_EXCEEDED',
      { productName, requestedQty, remainingReturnable }
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required to perform this action.') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have the required permissions to perform this action.') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class IdempotencyConflictError extends AppError {
  constructor(idempotencyKey: string) {
    super(
      `A request with idempotency key "${idempotencyKey}" has already been processed or is currently executing.`,
      409,
      'IDEMPOTENCY_CONFLICT',
      { idempotencyKey }
    );
  }
}
