/**
 * MCQ Ventures — GitHub Secret Scanning Partner Program Webhook
 *
 * Endpoint: POST /api/webhooks/github-secret-scan
 *
 * GitHub POSTs here when it detects an MCQ key pattern in any public repo.
 * This handler:
 *   1. Verifies ECDSA-NIST-P256V1-SHA256 signature using GitHub's rotating public keys
 *   2. Parses the alert payload
 *   3. Revokes each matched key via RevocationService
 *   4. Returns HTTP 200 to acknowledge (GitHub retries on non-2xx)
 *
 * Reference: https://docs.github.com/en/code-security/secret-scanning/secret-scanning-partner-program
 */

import { Router, Request, Response } from 'express';
import { createVerify } from 'crypto';
import { revokeByRawKey } from '../credentials/revocation.service';

const router = Router();

// GitHub public keys endpoint — cache TTL 1hr in production
const GITHUB_KEYS_URL = 'https://api.github.com/meta/public_keys/secret_scanning';

interface GitHubPublicKey {
  key_identifier: string;
  key: string;
  is_current: boolean;
}

interface SecretScanAlert {
  token: string;
  type: string;
  url: string;
  source: string;
}

let cachedKeys: GitHubPublicKey[] = [];
let keysCachedAt = 0;
const KEY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getGitHubPublicKeys(): Promise<GitHubPublicKey[]> {
  const now = Date.now();
  if (cachedKeys.length && now - keysCachedAt < KEY_CACHE_TTL_MS) {
    return cachedKeys;
  }
  const res = await fetch(GITHUB_KEYS_URL, {
    headers: { 'User-Agent': 'mcq-ventures-secret-scan-service' },
  });
  if (!res.ok) throw new Error(`GitHub keys fetch failed: ${res.status}`);
  const data = await res.json() as { public_keys: GitHubPublicKey[] };
  cachedKeys = data.public_keys;
  keysCachedAt = now;
  return cachedKeys;
}

function verifySignature(
  payload: string,
  signature: string,
  keyPem: string
): boolean {
  try {
    const verify = createVerify('SHA256');
    verify.update(payload);
    return verify.verify(
      { key: keyPem, format: 'pem', type: 'spki' },
      signature,
      'base64'
    );
  } catch {
    return false;
  }
}

router.post('/github-secret-scan', async (req: Request, res: Response): Promise<void> => {
  const sigHeader = req.headers['github-public-key-signature'] as string | undefined;
  const keyIdHeader = req.headers['github-public-key-identifier'] as string | undefined;

  if (!sigHeader || !keyIdHeader) {
    res.status(400).json({ error: 'MISSING_SIGNATURE_HEADERS' });
    return;
  }

  const rawBody = JSON.stringify(req.body);

  // Fetch and find the matching GitHub public key
  let publicKeys: GitHubPublicKey[];
  try {
    publicKeys = await getGitHubPublicKeys();
  } catch (err) {
    console.error('[GitHubScanner] Failed to fetch public keys:', err);
    res.status(503).json({ error: 'PUBLIC_KEY_FETCH_FAILED' });
    return;
  }

  const matchingKey = publicKeys.find((k) => k.key_identifier === keyIdHeader);
  if (!matchingKey) {
    res.status(401).json({ error: 'UNKNOWN_KEY_IDENTIFIER' });
    return;
  }

  const valid = verifySignature(rawBody, sigHeader, matchingKey.key);
  if (!valid) {
    res.status(401).json({ error: 'INVALID_SIGNATURE' });
    return;
  }

  // Process alerts
  const alerts: SecretScanAlert[] = Array.isArray(req.body) ? req.body : [req.body];

  const results = await Promise.allSettled(
    alerts.map((alert) =>
      revokeByRawKey(
        alert.token,
        'github-scanner',
        `Detected in public repo: ${alert.url ?? 'unknown'}`
      )
    )
  );

  const summary = results.map((r, i) => ({
    token_type: alerts[i]?.type,
    source_url: alerts[i]?.url,
    result: r.status === 'fulfilled' ? r.value : { success: false, error: String(r.reason) },
  }));

  console.info('[GitHubScanner] Processed alerts:', JSON.stringify(summary));

  // Always return 200 — GitHub retries on non-2xx
  res.status(200).json({ processed: alerts.length, summary });
});

export default router;
