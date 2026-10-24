/**
 * Centralized formatting utilities for Nasir Amme Electronics.
 * Currency: Ethiopian Birr (ETB)
 */

export function formatETB(amount: number | undefined | null, options?: { prefix?: boolean }): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0.00 ETB';
  }
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  if (options?.prefix) {
    return `ETB ${formatted}`;
  }
  return `${formatted} ETB`;
}

export function formatNumber(num: number | undefined | null): string {
  if (num === undefined || num === null || isNaN(num)) {
    return '0';
  }
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateShort(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatTime(dateString: string | undefined | null): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return dateString;
  }
}

export function generateReceiptNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `REC-${year}-${randomPart}`;
}

export function generatePONumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const randomPart = Math.floor(100 + Math.random() * 900);
  return `PO-${year}-${randomPart}`;
}

export function generateReturnNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `RET-${year}-${randomPart}`;
}

export function generateSKU(prefix: string = 'ELE'): string {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix.toUpperCase()}-${random}`;
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
}

export function calculatePercentageChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export function formatPercentageChange(delta: number | null): string {
  if (delta === null || isNaN(delta)) return 'N/A';
  const prefix = delta > 0 ? '+' : '';
  return `${prefix}${delta.toFixed(1)}%`;
}

