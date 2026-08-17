import { Payment } from '../models';
import { PAYMENT_STATUS } from '../constants';
import { paymentService } from '../services/payment.service';
import { logger } from '../config/logger';

export async function reconcilePayments() {
  logger.info('Starting payment reconciliation job...');
  
  // Find all pending payments older than 5 minutes but newer than 24 hours
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const pendingPayments = await Payment.find({
    status: PAYMENT_STATUS.PENDING,
    createdAt: { $gte: oneDayAgo, $lte: fiveMinsAgo }
  });

  if (pendingPayments.length === 0) {
    logger.info('No pending payments to reconcile.');
    return;
  }

  logger.info(`Found ${pendingPayments.length} pending payments to reconcile.`);

  for (const payment of pendingPayments) {
    try {
      // Pass 'SYSTEM' as the actor to bypass the user check for reconciliation
      await paymentService.verifyPayment(String(payment._id), String(payment.userId));
      logger.info(`Successfully reconciled payment ${payment._id}`);
    } catch (error) {
      logger.warn(`Failed to reconcile payment ${payment._id}: ${(error as Error).message}`);
    }
  }

  logger.info('Payment reconciliation job finished.');
}

// In a real app, this should be triggered via a robust job scheduler like BullMQ.
// For now, we will use setInterval
let reconciliationInterval: NodeJS.Timeout | null = null;

export function startPaymentReconciliationJob() {
  if (reconciliationInterval) return;
  // Run every 10 minutes
  reconciliationInterval = setInterval(() => {
    reconcilePayments().catch(err => logger.error('Reconciliation job failed', { error: err }));
  }, 10 * 60 * 1000);
  logger.info('Payment reconciliation job started (runs every 10m).');
}

export function stopPaymentReconciliationJob() {
  if (reconciliationInterval) {
    clearInterval(reconciliationInterval);
    reconciliationInterval = null;
    logger.info('Payment reconciliation job stopped.');
  }
}
