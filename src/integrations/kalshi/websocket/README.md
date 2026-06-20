# Kalshi WebSocket Feed Handler

## Endpoints

| Environment | URL |
|-------------|-----|
| Demo | `wss://external-api-ws.demo.kalshi.co/trade-api/ws/v2` |
| Prod | `wss://external-api-ws.kalshi.com/trade-api/ws/v2` |

Set `KALSHI_WS_URL` in your environment to select the target.

## Auth

The WebSocket upgrade request carries the same three RSA-PSS signed headers as REST:
```
KALSHI-ACCESS-KEY, KALSHI-ACCESS-TIMESTAMP, KALSHI-ACCESS-SIGNATURE
```
The signed path is the WebSocket URL path (e.g. `/trade-api/ws/v2`).

## Supported channels

| Channel | Data |
|---------|------|
| `ticker` | Bid/ask, last price, volume per market |
| `orderbook_delta` | Incremental orderbook changes (snapshot sent first) |
| `trade` | Public trade prints |
| `fill` | Your fills |
| `market_positions` | Your position changes |
| `user_orders` | Your order state changes |
| `order_group` | Order group updates |
| `market_lifecycle` | Market open/close/settle events |
| `multivariate` | Multi-outcome market data |
| `multivariate_lifecycle` | Multi-outcome lifecycle events |
| `communications` | Platform announcements |

## Usage

```ts
import { createKalshiFeed, bridgeFeedToEventBus } from './websocket';
import { loadPrivateKeyPem } from '../auth';

const feed = createKalshiFeed(loadPrivateKeyPem());
bridgeFeedToEventBus(feed);  // wires ticker -> MarketDataUpdated domain event

feed.connect();

// Subscribe to ticker + orderbook for specific markets
feed.subscribe({
  channels: ['ticker', 'orderbook_delta'],
  tickers: ['KXBTC-26DEC31-B100000', 'KXINX-26DEC31-T5000'],
});

// Access live orderbook at any time
const levels = feed.orderbooks.toSortedLevels('KXBTC-26DEC31-B100000');
console.log(levels?.yes[0]);  // best YES bid [price_cents, size]
```

## Reconnection

The feed reconnects automatically after disconnect and re-subscribes all active channels. Set `reconnectMs` in config to tune the backoff.
