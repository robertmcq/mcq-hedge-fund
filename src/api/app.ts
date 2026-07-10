/**
 * Express application — mounts all route modules.
 * Auth and rate limiting are applied globally before any route handler.
 */

import express from 'express';
import path from 'path';
import { requestId }       from './middleware/request-id';
import { errorHandler }    from './middleware/error-handler';
import { requireApiKey }   from './middleware/auth';
import { globalRateLimit } from './middleware/rate-limit';

import panel1Router     from './routes/panel1';
import panel2Router     from './routes/panel2';
import panel3Router     from './routes/panel3';
import panel5Router     from './routes/panel5';
import governanceRouter from './routes/governance';
import kalshiRouter     from './routes/kalshi';
import ledgerRouter     from './routes/ledger';
import investorRouter   from './routes/investor';

// Register event handlers (side-effect imports)
import '../events/handlers/market-data-updated';
import '../events/handlers/governance-score-updated';
import '../events/handlers/trade-executed';
import '../events/handlers/action-decision';

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(requestId);

// ── Security: rate limit first, then auth ────────────────────────────────────
// Order matters: rate limit runs before auth so brute-force key guessing
// is capped even before we check the key value.
app.use(globalRateLimit);
app.use(requireApiKey);

// ── Health check (exempt from auth — see middleware/auth.ts) ────────────────
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString(), uptime_s: process.uptime() });
});

app.use('/api/panel1',     panel1Router);
app.use('/api/panel2',     panel2Router);
app.use('/api/panel3',     panel3Router);
app.use('/api/panel5',     panel5Router);
app.use('/api/governance', governanceRouter);
app.use('/api/kalshi',     kalshiRouter);
app.use('/api/ledger',     ledgerRouter);
app.use('/api/investor',   investorRouter);

// Serve investor HTML dashboard
app.use('/investor', express.static(path.join(__dirname, '..', '..', 'public', 'investor')));
app.get('/investor', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'investor', 'index.html'));
});

app.use(errorHandler);

export { app };
