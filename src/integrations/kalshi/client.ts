/**
 * Kalshi HTTP client — wraps fetch with signed auth headers.
 * Base URLs:
 *   Demo: https://external-api.demo.kalshi.co
 *   Prod: https://trading-api.kalshi.com
 */

import { buildKalshiAuthHeaders, loadPrivateKeyPem } from './auth';

export interface KalshiClientConfig {
  baseUrl: string;    // from KALSHI_BASE_URL
  keyId: string;      // from KALSHI_API_KEY_ID
  privateKeyPem?: string; // loaded via loadPrivateKeyPem() if omitted
}

export class KalshiClient {
  private readonly baseUrl: string;
  private readonly keyId: string;
  private readonly privateKeyPem: string;

  constructor(config: KalshiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.keyId = config.keyId;
    this.privateKeyPem = config.privateKeyPem ?? loadPrivateKeyPem();
  }

  private authHeaders(method: string, path: string) {
    return buildKalshiAuthHeaders({
      keyId: this.keyId,
      privateKeyPem: this.privateKeyPem,
      method,
      path,
    });
  }

  private urlFor(path: string, query?: Record<string, string | number | boolean>): string {
    const base = `${this.baseUrl}${path}`;
    if (!query || !Object.keys(query).length) return base;
    // Cast entries to [string, string][] so URLSearchParams constructor is satisfied
    const params = new URLSearchParams(
      Object.entries(query).map(([k, v]) => [k, String(v)] as [string, string])
    );
    return `${base}?${params.toString()}`;
  }

  async get<T>(path: string, query?: Record<string, string | number | boolean>): Promise<T> {
    const url = this.urlFor(path, query);
    const headers = { ...this.authHeaders('GET', path), 'Content-Type': 'application/json' };
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) throw new Error(`Kalshi GET ${path} failed: ${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const url = this.urlFor(path);
    const headers = { ...this.authHeaders('POST', path), 'Content-Type': 'application/json' };
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Kalshi POST ${path} failed: ${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async delete<T>(path: string): Promise<T> {
    const url = this.urlFor(path);
    const headers = { ...this.authHeaders('DELETE', path), 'Content-Type': 'application/json' };
    const res = await fetch(url, { method: 'DELETE', headers });
    if (!res.ok) throw new Error(`Kalshi DELETE ${path} failed: ${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
  }
}

/** Singleton factory — reads config from env at startup. */
export function createKalshiClient(): KalshiClient {
  const baseUrl = process.env.KALSHI_BASE_URL;
  const keyId = process.env.KALSHI_API_KEY_ID;
  if (!baseUrl) throw new Error('KALSHI_BASE_URL not set');
  if (!keyId) throw new Error('KALSHI_API_KEY_ID not set');
  return new KalshiClient({ baseUrl, keyId });
}
