import argon2 from 'argon2';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * OWASP-compliant Argon2id parameters
 * Memory: 64 MiB (65536 KiB), Iterations: 3, Parallelism: 4
 */
const ARGON2_OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

const BCRYPT_SALT_ROUNDS = 12;

function getHmacSecret(): string {
  return (
    process.env.OTP_HMAC_SECRET ||
    process.env.SESSION_SECRET ||
    'nasir-amme-default-secret-key-minimum-32-bytes-production'
  );
}

/**
 * Hashes a plaintext password using Argon2id.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return await argon2.hash(plaintext, { ...ARGON2_OPTIONS, raw: false });
}

/**
 * Verifies a plaintext password against a stored Argon2id or legacy bcrypt hash.
 * Returns false safely if the stored hash is invalid or missing.
 */
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  if (!hash || hash.includes('placeholder')) {
    return false;
  }

  // 1. Argon2id verification
  if (hash.startsWith('$argon2')) {
    try {
      return await argon2.verify(hash, plaintext);
    } catch {
      return false;
    }
  }

  // 2. Legacy bcrypt verification (for backward compatibility during migration)
  if (hash.startsWith('$2')) {
    try {
      return await bcrypt.compare(plaintext, hash);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Checks if a stored hash is already in Argon2id format.
 */
export function isArgon2Hash(hash: string): boolean {
  return typeof hash === 'string' && hash.startsWith('$argon2id');
}

/**
 * Generates a cryptographically secure random 6-digit OTP code (100000 - 999999).
 */
export function generateOtpCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Computes a keyed HMAC-SHA256 digest of an OTP code using a secret stored outside the database.
 */
export function hashOtp(otp: string): string {
  const secret = getHmacSecret();
  return crypto.createHmac('sha256', secret).update(otp.trim()).digest('hex');
}

/**
 * Generates a cryptographically secure random single-use reset authorization token (64 hex characters)
 * and its HMAC-SHA256 digest for database storage.
 */
export function generateResetToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Computes the HMAC-SHA256 digest of a reset authorization token.
 */
export function hashResetToken(rawToken: string): string {
  const secret = getHmacSecret();
  return crypto.createHmac('sha256', secret).update(rawToken.trim()).digest('hex');
}

/**
 * Generates a cryptographically secure random session token (64 hex characters)
 * and its SHA-256 hash for database storage.
 */
export function generateSessionToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Computes the SHA-256 hash of a raw session token.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

/**
 * Constant-time comparison of two strings to protect against timing attacks.
 */
export function timingSafeMatch(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validates a candidate OTP code against an expected keyed HMAC digest using constant-time comparison.
 */
export function verifyOtpHash(candidateOtp: string, expectedHash: string): boolean {
  const candidateHash = hashOtp(candidateOtp);
  return timingSafeMatch(candidateHash, expectedHash);
}

/**
 * Masks a phone number for safe display without disclosing full contact info.
 * E.g. "+251915001122" -> "+251 9*** ***122"
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return 'Phone not registered';
  const clean = phone.replace(/\s+/g, '');
  if (clean.length < 7) return '***-***';
  if (clean.startsWith('+251')) {
    const prefix = clean.slice(0, 4);
    const nextDigit = clean.charAt(4) || '';
    const end = clean.slice(-3);
    return `${prefix} ${nextDigit}*** ***${end}`;
  }
  const start = clean.slice(0, 4);
  const end = clean.slice(-3);
  return `${start} *** ***${end}`;
}
