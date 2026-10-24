/**
 * Nasir Amme Electronics — Barcode & EAN-13 Validation Utilities
 * Location: Dire Dawa, Ethiopia
 */

export interface BarcodeValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Calculates the standard EAN-13 check digit for the first 12 digits of a barcode.
 * Uses the official GS1 modulo 10 algorithm with alternating weights 1 and 3.
 */
export function calculateEAN13CheckDigit(twelveDigits: string): number {
  if (!/^\d{12}$/.test(twelveDigits)) {
    throw new Error('Input must be exactly 12 numeric digits.');
  }

  const digits = twelveDigits.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    // Index 0 is 1st digit (weight 1), index 1 is 2nd digit (weight 3), etc.
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }

  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Validates whether a given barcode string is a valid EAN-13.
 * Checks format (13 numeric digits) and validates the 13th check digit.
 */
export function validateEAN13(barcode: string): BarcodeValidationResult {
  const clean = barcode.trim();

  if (!clean) {
    return { isValid: false, error: 'Barcode cannot be empty.' };
  }

  if (!/^\d+$/.test(clean)) {
    return { isValid: false, error: 'EAN-13 barcode must contain digits only.' };
  }

  if (clean.length !== 13) {
    return { isValid: false, error: `EAN-13 must be exactly 13 digits (current length: ${clean.length}).` };
  }

  const payload = clean.slice(0, 12);
  const actualCheckDigit = Number(clean.slice(12));
  const expectedCheckDigit = calculateEAN13CheckDigit(payload);

  if (actualCheckDigit !== expectedCheckDigit) {
    return {
      isValid: false,
      error: `Invalid EAN-13 checksum. Expected check digit '${expectedCheckDigit}', but found '${actualCheckDigit}'.`,
    };
  }

  return { isValid: true };
}

/**
 * Generates an authoritative, valid 13-digit EAN-13 barcode with a correct GS1 check digit.
 * Default prefix '600' (GS1 East/Southern Africa block) or custom prefix.
 */
export function generateValidEAN13(prefix: string = '600'): string {
  const cleanPrefix = prefix.replace(/\D/g, '').slice(0, 3).padEnd(3, '6');
  // 3-digit prefix + 9 random digits = 12 digits
  let twelveDigits = cleanPrefix;
  while (twelveDigits.length < 12) {
    twelveDigits += Math.floor(Math.random() * 10).toString();
  }
  const checkDigit = calculateEAN13CheckDigit(twelveDigits);
  return `${twelveDigits}${checkDigit}`;
}
