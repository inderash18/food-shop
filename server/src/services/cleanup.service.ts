import { cleanupStalePendingOrders } from './order.service';
import { logger } from '../config/logger';

let cleanupTimer: NodeJS.Timeout | null = null;

export function startCleanupJobs(intervalMs = 5 * 60 * 1000): void {
  if (cleanupTimer) return;

  logger.info('Starting background cleanup jobs (5-min cycle)');
  cleanupTimer = setInterval(async () => {
    try {
      const count = await cleanupStalePendingOrders(15);
      if (count > 0) {
        logger.info(`Cleanup cycle completed: ${count} stale order(s) expired and stock released.`);
      }
    } catch (err: any) {
      logger.error('Error during cleanup cycle', { error: err?.message });
    }
  }, intervalMs);
}

export function stopCleanupJobs(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    logger.info('Stopped background cleanup jobs');
  }
}
