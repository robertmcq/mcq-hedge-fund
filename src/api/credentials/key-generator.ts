/**
 * MCQ Ventures — API Key Generator
 * GitHub Secret Scanning Partner Program-ready credential architecture.
 *
 * Key format:
 *   MCQ_{TIER}_{TIMESTAMP_B62}_{ENTROPY_B62}_{CRC32_HEX}
 *
 * Example:
 *   MCQ_ENT_4mZqR1_xK9pL2mNvQwRtYuJhGfDs_a3f1b2c4
 *
 * Components:
 *   - MCQ_         : Static prefix — GitHub partner regex anchor
 *   - {TIER}       : 3-char tier code (ENT=Enterprise, PRO=Professional, OPS=Ops/Internal)
 *   - {TIMESTAMP}  : base62-encoded unix epoch seconds (issuance audit trail)
 *   - {ENTROPY}    : 20-byte cryptographically random base62 string (~119 bits entropy)
 *   - {CRC32}      : 8-char hex CRC-32 checksum over prefix+tier+timestamp+entropy
 *                    (enables fast validity rejection without DB lookup)
 */

import { createHash, randomBytes } from 'crypto';

export type KeyTier = 'ENT' | 'PRO' | 'OPS';

export interface GeneratedKey {
  raw: string;        // Full key — store only the hash, never this
  prefix: string;     // MCQ_{TIER} — safe to store and display
  tier: KeyTier;
  issuedAt: Date;
  checksum: string;   // CRC-32 hex — for fast pre-DB validation
}

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function toBase62(n: bigint): string {
  if (n === 0n) return '0';
  let result = '';
  while (n > 0n) {
    result = BASE62[Number(n % 62n)] + result;
    n /= 62n;
  }
  return result;
}

function entropyBase62(byteLength: number): string {
  const bytes = randomBytes(byteLength);
  let n = BigInt('0x' + bytes.toString('hex'));
  return toBase62(n);
}

/**
 * CRC-32 implemented via SHA-256 truncation.
 * Full CRC-32 polynomial implementation can be swapped in;
 * for partner program purposes the requirement is a fixed-length
 * checksum that fails fast on malformed keys.
 */
function checksum32(input: string): string {
  return createHash('sha256')
    .update(input)
    .digest('hex')
    .slice(0, 8);
}

export function generateApiKey(tier: KeyTier): GeneratedKey {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const timestampB62 = toBase62(now);
  const entropyB62 = entropyBase62(20); // ~119 bits

  const body = `MCQ_${tier}_${timestampB62}_${entropyB62}`;
  const crc = checksum32(body);
  const raw = `${body}_${crc}`;

  return {
    raw,
    prefix: `MCQ_${tier}`,
    tier,
    issuedAt: new Date(Number(now) * 1000),
    checksum: crc,
  };
}

/**
 * Returns only the SHA-256 hash of the raw key.
 * This is the value that should be persisted to the database.
 * The raw key is shown to the user exactly once at issuance.
 */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

/**
 * GitHub Secret Scanning Partner Program regex pattern.
 * Submit this to GitHub during partner enrollment.
 *
 * Pattern: MCQ_(ENT|PRO|OPS)_[0-9A-Za-z]+_[0-9A-Za-z]{20,}_[0-9a-f]{8}
 */
export const GITHUB_SCANNER_REGEX =
  /MCQ_(ENT|PRO|OPS)_[0-9A-Za-z]+_[0-9A-Za-z]{20,}_[0-9a-f]{8}/g;
