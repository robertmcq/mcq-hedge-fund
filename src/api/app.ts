/**
 * Express application — mounts all route modules.
 * Event handlers are registered on import so the bus is live.
 */

import express from 'express';
import { requestId } from './middleware/request-id';
import { errorHandler } from './middleware/error-handler';

import panel1Router from './routes/panel1';
import governanceRouter from './routes/governance';
import panel3Router from './routes/panel3';
import panel5Router from './routes/panel5';
import kalshiRouter from './routes/kalshi';

// Register event handlers (side-effect imports)
import '../events/handlers/market-data-updated';
import '../events/handlers/governance-score-updated';
import '../events/handlers/trade-executed';
import '../events/handlers/action-decision';

const app = express();

app.use(express.json());
app.use(requestId);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// Panel routers
app.use('/api/panel1', panel1Router);
app.use('/api/governance', governanceRouter);
app.use('/api/panel3', panel3Router);
app.use('/api/panel5', panel5Router);
app.use('/api/kalshi', kalshiRouter);

// Must be last
app.use(errorHandler);

export { app };
