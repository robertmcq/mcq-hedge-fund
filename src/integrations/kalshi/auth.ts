/**
 * Kalshi API authentication — RSA-PSS signed request headers.
 *
 * Signing spec (from Kalshi docs):
 *   message  = timestamp_ms + METHOD + path   (path excludes query string)
 *   key type = RSA
 *   padding  = PSS
 *   hash     = SHA-256
 *   output   = base64url
 *
 * Required headers on every authenticated request:
 *   KALSHI-ACCESS-KEY        — your API key ID
 *   KALSHI-ACCESS-TIMESTAMP  — ms since Unix epoch as string
 *   KALSHI-ACCESS-SIGNATURE  — base64url(sign(message))
 *
 * NEVER hard-code keys. Load from env or secret manager only.
 */

import * as crypto from 'crypto';

export interface KalshiAuthHeaders {
  'KALSHI-ACCESS-KEY': string;
  'KALSHI-ACCESS-TIMESTAMP': string;
  'KALSHI-ACCESS-SIGNATURE': string;
}

export function buildKalshiAuthHeaders(params: {
  keyId: string;
  privateKeyPem: string;   // loaded from env/secret at runtime, never stored in repo
  method: string;          // e.g. 'GET', 'POST', 'DELETE'
  path: string;            // URL path ONLY — no query string, no host
}): KalshiAuthHeaders {
  const { keyId, privateKeyPem, method, path } = params;
  const timestampMs = Date.now().toString();
  const message = timestampMs + method.toUpperCase() + path;

  const signature = crypto.sign(
    'sha256',
    Buffer.from(message),
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    }
  );

  return {
    'KALSHI-ACCESS-KEY': keyId,
    'KALSHI-ACCESS-TIMESTAMP': timestampMs,
    'KALSHI-ACCESS-SIGNATURE': signature.toString('base64url'),
  };
}

/**
 * Load the private key PEM safely from environment.
 * Priority: KALSHI_PRIVATE_KEY_PEM (secret manager injection)
 *           KALSHI_PRIVATE_KEY_PATH (file path)
 * Throws clearly if neither is set, so misconfiguration fails fast.
 */
export function loadPrivateKeyPem(): string {
  if (process.env.KALSHI_PRIVATE_KEY_PEM) {
    return process.env.KALSHI_PRIVATE_KEY_PEM.replace(/\\n/g, '\n');
  }
  if (process.env.KALSHI_PRIVATE_KEY_PATH) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    return fs.readFileSync(process.env.KALSHI_PRIVATE_KEY_PATH, 'utf8');
  }
  throw new Error(
    'Kalshi private key not configured. Set KALSHI_PRIVATE_KEY_PEM or KALSHI_PRIVATE_KEY_PATH in env.'
  );
}
