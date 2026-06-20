/**
 * Entry point — starts the HTTP server.
 * Run: npx ts-node src/api/server.ts
 */

import { app } from './app';

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  console.log(`MCQ Hedge Fund API listening on port ${PORT}`);
});
