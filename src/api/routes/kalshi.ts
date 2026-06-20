import { Router } from 'express';
import {
  getMarkets,
  getMarket,
  getOrderbook,
  getBalance,
  getPositions,
  createOrder,
  cancelOrder,
} from '../controllers/kalshi-controller';

const router = Router();

/** Markets */
router.get('/markets', getMarkets);
router.get('/markets/:ticker', getMarket);
router.get('/markets/:ticker/orderbook', getOrderbook);

/** Portfolio */
router.get('/portfolio/balance', getBalance);
router.get('/portfolio/positions', getPositions);

/** Orders */
router.post('/orders', createOrder);
router.delete('/orders/:orderId', cancelOrder);

export default router;
