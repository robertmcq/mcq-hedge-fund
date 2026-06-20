/**
 * Handler: MarketDataUpdated
 * Triggers Panel 1 DCF recalc and Panel 3 portfolio risk refresh.
 */

import { bus } from '../bus';
import { MarketDataUpdatedPayload } from '../types';
import { DomainEvent } from '../types';

bus.subscribe<MarketDataUpdatedPayload>(
  'MarketDataUpdated',
  async (event: DomainEvent<MarketDataUpdatedPayload>) => {
    const { security_id, price, date_time } = event.payload;
    console.log(
      `[MarketDataUpdated] security=${security_id} price=${price} at=${date_time}`
    );
    // TODO: trigger runReverseDCFEngine(security_id, price) -> write reverse_dcf_snapshot
    // TODO: trigger runPortfolioRiskEngine() for all portfolios holding security_id
  }
);
