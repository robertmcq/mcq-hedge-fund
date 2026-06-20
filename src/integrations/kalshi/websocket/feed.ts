/**
 * Kalshi WebSocket feed handler.
 *
 * Endpoints:
 *   Demo: wss://external-api-ws.demo.kalshi.co/trade-api/ws/v2
 *   Prod: wss://external-api-ws.kalshi.com/trade-api/ws/v2
 *
 * Auth: RSA-PSS signed upgrade headers (same pattern as REST).
 * Messages: subscribe cmd -> subscribed ack -> stream of typed events.
 * Orderbook: snapshot on subscribe, then incremental deltas.
 *
 * On reconnect: re-subscribes all active channels automatically.
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { buildKalshiAuthHeaders } from '../auth';
import { OrderbookManager } from './orderbook-manager';
import type {
  KalshiWsChannel,
  KalshiWsCommand,
  KalshiWsEnvelope,
  KalshiTickerMsg,
  KalshiTradeMsg,
  KalshiFillMsg,
  LocalOrderbook,
} from './types';

export interface KalshiFeedConfig {
  wsUrl: string;          // from KALSHI_WS_URL env var
  keyId: string;          // from KALSHI_API_KEY_ID
  privateKeyPem: string;  // loaded from secret at runtime
  reconnectMs?: number;   // default 3000
  pingIntervalMs?: number; // default 20000
}

export interface FeedSubscription {
  channels: KalshiWsChannel[];
  tickers?: string[];
}

export class KalshiFeed extends EventEmitter {
  private ws: WebSocket | null = null;
  private cmdId = 1;
  private subscriptions: FeedSubscription[] = [];
  private reconnectMs: number;
  private pingIntervalMs: number;
  private pingTimer: NodeJS.Timeout | null = null;
  private closed = false;

  readonly orderbooks = new OrderbookManager();

  constructor(private config: KalshiFeedConfig) {
    super();
    this.reconnectMs   = config.reconnectMs   ?? 3000;
    this.pingIntervalMs = config.pingIntervalMs ?? 20000;
  }

  connect(): void {
    if (this.closed) return;
    // Auth headers signed with path = '/trade-api/ws/v2'
    const path = new URL(this.config.wsUrl).pathname;
    const authHeaders = buildKalshiAuthHeaders({
      keyId:         this.config.keyId,
      privateKeyPem: this.config.privateKeyPem,
      method:        'GET',
      path,
    });

    this.ws = new WebSocket(this.config.wsUrl, { headers: authHeaders });

    this.ws.on('open', () => {
      console.log('[KalshiFeed] Connected');
      this.emit('connected');
      this._startPing();
      // Re-subscribe all active subscriptions (handles reconnect)
      for (const sub of this.subscriptions) {
        this._sendSubscribe(sub);
      }
    });

    this.ws.on('message', (data: WebSocket.RawData) => {
      try {
        const envelope: KalshiWsEnvelope = JSON.parse(data.toString());
        this._handleMessage(envelope);
      } catch (err) {
        console.error('[KalshiFeed] Parse error:', err);
      }
    });

    this.ws.on('close', (code, reason) => {
      console.warn(`[KalshiFeed] Disconnected (${code}): ${reason}`);
      this._stopPing();
      this.emit('disconnected', code);
      if (!this.closed) {
        setTimeout(() => this.connect(), this.reconnectMs);
      }
    });

    this.ws.on('error', (err) => {
      console.error('[KalshiFeed] Error:', err.message);
      this.emit('error', err);
    });
  }

  subscribe(sub: FeedSubscription): void {
    this.subscriptions.push(sub);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this._sendSubscribe(sub);
    }
  }

  unsubscribe(channels: KalshiWsChannel[], tickers?: string[]): void {
    this.subscriptions = this.subscriptions.filter(
      (s) => !s.channels.some((c) => channels.includes(c))
    );
    if (this.ws?.readyState === WebSocket.OPEN) {
      const cmd: KalshiWsCommand = {
        id: this.cmdId++,
        cmd: 'unsubscribe',
        params: { channels, market_tickers: tickers },
      };
      this.ws.send(JSON.stringify(cmd));
    }
  }

  close(): void {
    this.closed = true;
    this._stopPing();
    this.ws?.close();
  }

  private _sendSubscribe(sub: FeedSubscription): void {
    const cmd: KalshiWsCommand = {
      id: this.cmdId++,
      cmd: 'subscribe',
      params: {
        channels: sub.channels,
        ...(sub.tickers ? { market_tickers: sub.tickers } : {}),
      },
    };
    this.ws?.send(JSON.stringify(cmd));
  }

  private _handleMessage(env: KalshiWsEnvelope): void {
    switch (env.type) {
      case 'subscribed':
        this.emit('subscribed', env.msg);
        break;

      case 'orderbook_snapshot': {
        const snap = env.msg as unknown as import('./types').KalshiOrderbookSnapshotMsg;
        const book = this.orderbooks.applySnapshot(snap);
        this.emit('orderbook_snapshot', book);
        this.emit('orderbook', book);
        break;
      }

      case 'orderbook_delta': {
        const delta = env.msg as unknown as import('./types').KalshiOrderbookDeltaMsg;
        const book = this.orderbooks.applyDelta(delta);
        if (book) {
          this.emit('orderbook_delta', { delta, book });
          this.emit('orderbook', book);
        }
        break;
      }

      case 'ticker': {
        const ticker = env.msg as unknown as KalshiTickerMsg;
        this.emit('ticker', ticker);
        break;
      }

      case 'trade': {
        const trade = env.msg as unknown as KalshiTradeMsg;
        this.emit('trade', trade);
        break;
      }

      case 'fill': {
        const fill = env.msg as unknown as KalshiFillMsg;
        this.emit('fill', fill);
        break;
      }

      default:
        this.emit('message', env);
    }
  }

  private _startPing(): void {
    this._stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, this.pingIntervalMs);
  }

  private _stopPing(): void {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }
}

/** Singleton factory — reads config from env at startup. */
export function createKalshiFeed(privateKeyPem: string): KalshiFeed {
  const wsUrl = process.env.KALSHI_WS_URL;
  const keyId = process.env.KALSHI_API_KEY_ID;
  if (!wsUrl) throw new Error('KALSHI_WS_URL not set');
  if (!keyId) throw new Error('KALSHI_API_KEY_ID not set');
  return new KalshiFeed({ wsUrl, keyId, privateKeyPem });
}
