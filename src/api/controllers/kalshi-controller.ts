import { Request, Response, NextFunction } from 'express';
import { createKalshiClient } from '../../integrations/kalshi/client';
import { KalshiMarketsAdapter } from '../../integrations/kalshi/markets';
import { KalshiOrdersAdapter } from '../../integrations/kalshi/orders';
import { KalshiPortfolioAdapter } from '../../integrations/kalshi/portfolio';
import type { CreateOrderRequest } from '../../integrations/kalshi/types';

function getAdapters() {
  const client = createKalshiClient();
  return {
    markets: new KalshiMarketsAdapter(client),
    orders: new KalshiOrdersAdapter(client),
    portfolio: new KalshiPortfolioAdapter(client),
  };
}

export async function getMarkets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { markets, portfolio: _p, orders: _o } = getAdapters();
    const data = await markets.getMarkets(req.query as Record<string, string>);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
}

export async function getMarket(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { markets } = getAdapters();
    const data = await markets.getMarket(req.params.ticker);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
}

export async function getOrderbook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { markets } = getAdapters();
    const depth = req.query.depth ? Number(req.query.depth) : undefined;
    const data = await markets.getOrderbook(req.params.ticker, depth);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
}

export async function getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { portfolio } = getAdapters();
    const data = await portfolio.getBalance();
    res.json({ ok: true, data });
  } catch (err) { next(err); }
}

export async function getPositions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { portfolio } = getAdapters();
    const data = await portfolio.getPositions(req.query as Record<string, string>);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
}

export async function createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orders } = getAdapters();
    const data = await orders.createOrder(req.body as CreateOrderRequest);
    res.status(201).json({ ok: true, data });
  } catch (err) { next(err); }
}

export async function cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { orders } = getAdapters();
    const data = await orders.cancelOrder(req.params.orderId);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
}
