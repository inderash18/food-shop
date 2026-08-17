import { createServer } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase } from './config/db';
import { logger } from './config/logger';
import { initSocket } from './sockets';
import { startJobs } from './jobs/reservationExpiry';
import { startPaymentReconciliationJob } from './jobs/paymentReconciliation.job';

import { validatePaytmConfig } from './config/paytm';

async function main(): Promise<void> {
  validatePaytmConfig();
  await connectDatabase();

  const app = createApp();
  const httpServer = createServer(app);
  initSocket(httpServer);
  startJobs();
  startPaymentReconciliationJob();

  httpServer.listen(env.port, () => {
    logger.info(`API listening on http://localhost:${env.port}`);
    logger.info(`Client origin: ${env.clientUrl}`);
  });
}

main().catch((err) => {
  logger.error('Fatal startup error', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
