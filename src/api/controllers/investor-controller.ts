/**
 * Investor Controller
 *
 * Aggregates data from portfolio state, governance scorer, and event ledger
 * into three read-optimised responses for the investor dashboard.
 *
 * Type notes:
 *   - cash / ytd_start_equity  → PortfolioStoreEntry (not Portfolio)
 *   - current_price            → PricePoint from portfolioStore.getPricesForPortfolio
 *   - Position has no current_price; we join against the price cache
 */

import { Request, Response, NextFunction } from 'express';
import { portfolioStore } from '../../state/portfolio-store';
import { runGovernanceScorer } from '../../governance/scorer';
import { readEvents } from '../../events/ledger/store';

const FRACTIONAL_KELLY = Number(process.env['FRACTIONAL_KELLY'] ?? 0.25);
const H0              = Number(process.env['H0']            ?? 0.01);
const BETA_G          = Number(process.env['BETA_G']        ?? 1.5);
const BETA_VELOCITY   = Number(process.env['BETA_VELOCITY'] ?? 0.8);
const BETA_VOLUME     = Number(process.env['BETA_VOLUME']   ?? 0.5);
const BETA_SHADOW     = Number(process.env['BETA_SHADOW']   ?? 1.2);

// ── GET /api/investor/summary ─────────────────────────────────────────────────
export async function getInvestorSummary(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const entries = portfolioStore.allPortfolios();
    const as_of   = new Date().toISOString();

    const summaries = entries.map((entry) => {
      // cash and ytd_start_equity are on PortfolioStoreEntry, not Portfolio
      const { portfolio, positions, cash, ytd_start_equity } = entry;

      // Join positions against price cache
      const prices   = portfolioStore.getPricesForPortfolio(portfolio.portfolio_id);
      const priceMap = new Map(prices.map((p) => [p.security_id, p.price]));

      const gross_market_value = positions.reduce((sum, p) => {
        const px = priceMap.get(p.security_id) ?? p.avg_cost;
        return sum + Math.abs(p.quantity * px);
      }, 0);

      const net_pnl = positions.reduce((sum, p) => {
        const px = priceMap.get(p.security_id) ?? p.avg_cost;
        return sum + (px - p.avg_cost) * p.quantity;
      }, 0);

      const equity = cash + gross_market_value;

      const position_rows = positions.map((p) => {
        const current_price = priceMap.get(p.security_id) ?? p.avg_cost;
        const pnl           = (current_price - p.avg_cost) * p.quantity;
        return {
          security_id:   p.security_id,
          side:          p.side,
          quantity:      p.quantity,
          avg_cost:      p.avg_cost,
          current_price,
          pnl:           Number(pnl.toFixed(2)),
          pnl_pct:       p.avg_cost > 0
            ? Number((((current_price - p.avg_cost) / p.avg_cost) * 100).toFixed(2))
            : 0,
          weight_pct:    gross_market_value > 0
            ? Number(((Math.abs(p.quantity * current_price) / gross_market_value) * 100).toFixed(2))
            : 0,
        };
      });

      return {
        portfolio_id:       portfolio.portfolio_id,
        name:               portfolio.name,
        base_currency:      portfolio.base_currency,
        cash,
        gross_market_value: Number(gross_market_value.toFixed(2)),
        equity:             Number(equity.toFixed(2)),
        net_pnl:            Number(net_pnl.toFixed(2)),
        net_pnl_pct:        ytd_start_equity > 0
          ? Number(((net_pnl / ytd_start_equity) * 100).toFixed(2))
          : 0,
        position_count: positions.length,
        positions:      position_rows,
      };
    });

    res.json({ as_of, portfolios: summaries });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/investor/governance ───────────────────────────────────────────────
export async function getInvestorGovernance(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const entries          = portfolioStore.allPortfolios();
    const as_of            = new Date().toISOString();
    const governance_rows: unknown[] = [];

    for (const entry of entries) {
      const { portfolio, positions, cash } = entry;
      const prices   = portfolioStore.getPricesForPortfolio(portfolio.portfolio_id);
      const priceMap = new Map(prices.map((p) => [p.security_id, p.price]));

      const gross_mv = positions.reduce((sum, p) => {
        const px = priceMap.get(p.security_id) ?? p.avg_cost;
        return sum + Math.abs(p.quantity * px);
      }, 0);
      const account_equity = cash + gross_mv;

      for (const pos of positions) {
        // governance_score not on Position — default neutral 0.75
        const g = 0.75;

        let decision;
        try {
          decision = runGovernanceScorer({
            governance: {
              entity_id:        pos.security_id,
              entity_type:      'issuer',
              governance_score: g,
              velocity:         0.1,
              volume:           0.3,
              shadow:           0.05,
            },
            horizon_days:            252,
            win_rate:                0.55,
            avg_win:                 1.8,
            avg_loss:                1.0,
            enforcement_loss:        0.5,
            account_equity,
            fractional_kelly_factor: FRACTIONAL_KELLY,
            hazard_params: {
              h0:            H0,
              beta_G:        BETA_G,
              beta_velocity: BETA_VELOCITY,
              beta_volume:   BETA_VOLUME,
              beta_shadow:   BETA_SHADOW,
            },
          });
        } catch {
          continue;
        }

        // 12-point monthly enforcement probability curve
        const curve = Array.from({ length: 12 }, (_, i) => {
          const t_days   = (i + 1) * 21;
          const survival = Math.exp(-decision.survival.hazard_rate * t_days);
          return {
            horizon_days:     t_days,
            survival_prob:    Number(survival.toFixed(4)),
            enforcement_prob: Number((1 - survival).toFixed(4)),
          };
        });

        governance_rows.push({
          portfolio_id:          portfolio.portfolio_id,
          security_id:           pos.security_id,
          governance_score:      g,
          risk_label:            decision.survival.risk_label,
          hazard_rate:           Number(decision.survival.hazard_rate.toFixed(6)),
          survival_prob_252d:    Number(decision.survival.survival_prob.toFixed(4)),
          enforcement_prob_252d: Number(decision.survival.enforcement_prob.toFixed(4)),
          kelly_fraction:        Number(decision.kelly.governance_kelly.toFixed(4)),
          risk_per_trade_usd:    Number(decision.kelly.risk_per_trade.toFixed(2)),
          kelly_signal:          decision.kelly.signal,
          alert: decision.alert ? {
            severity:           decision.alert.severity,
            threshold_breached: decision.alert.threshold_breached,
            recommended_action: decision.alert.recommended_action,
          } : null,
          enforcement_curve: curve,
        });
      }
    }

    res.json({ as_of, governance: governance_rows });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/investor/timeline ────────────────────────────────────────────────
export async function getInvestorTimeline(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const limit    = Math.min(Number(req.query['limit']   ?? 50), 200);
    const from_seq = Number(req.query['from_seq'] ?? 0);

    const events = await readEvents({ fromSeq: from_seq, limit });

    const timeline = events.map((e) => ({
      seq:          e.seq,
      event_type:   e.event_type,
      aggregate_id: e.aggregate_id,
      occurred_at:  e.occurred_at,
      source:       e.source,
      summary:      buildEventSummary(e.event_type, e.payload),
    }));

    res.json({ as_of: new Date().toISOString(), from_seq, count: timeline.length, events: timeline });
  } catch (err) {
    next(err);
  }
}

function buildEventSummary(event_type: string, payload: unknown): string {
  const p = payload as Record<string, unknown>;
  switch (event_type) {
    case 'PORTFOLIO_INITIALIZED':
      return `Portfolio "${p['name']}" initialised with $${Number(p['cash']).toLocaleString()} cash`;
    case 'POSITION_OPENED':
      return `${String(p['side']).toUpperCase()} ${p['quantity']} × ${p['security_id']} @ ${p['price']}`;
    case 'PRICE_UPDATED':
      return `${p['security_id']} price updated to ${p['price']}`;
    case 'GovernanceScoreUpdated':
      return `Governance score for ${p['entity_id']}: ${Number(p['governance_score']).toFixed(3)}`;
    case 'TradeExecuted':
      return `Trade: ${p['side']} ${p['quantity']} × ${p['security_id']} @ ${p['price']}`;
    case 'MarketDataUpdated':
      return `Market data: ${p['security_id']} @ ${p['price']}`;
    case 'ActionDecision':
      return `Action ${p['action_id']}: ${p['decision']} by ${p['user_id']}`;
    default:
      return event_type;
  }
}
