import { Order, Payment } from '../models';
import { ORDER_STATUS, PAYMENT_STATUS } from '../constants';
import { releaseStock } from '../services/order.service';
import { logger } from '../config/logger';

const RESERVATION_TTL_MS = 15 * 60 * 1000;

/**
 * Releases stock reservations for orders stuck in PAYMENT_PENDING for too long.
 * Runs on an interval. Guarded so two instances don't double-release
 * (the release itself is idempotent via atomic $gte update).
 */
export async function expireStaleReservations(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - RESERVATION_TTL_MS);
  const staleOrders = await Order.find({
    status: ORDER_STATUS.PAYMENT_PENDING,
    createdAt: { $lt: cutoff },
  });

  let released = 0;
  for (const order of staleOrders) {
    await releaseStock(order);
    order.status = ORDER_STATUS.CANCELLED;
    order.cancelledAt = new Date();
    await order.save();
    await Payment.updateMany({ orderId: order._id, status: PAYMENT_STATUS.PENDING }, { $set: { status: PAYMENT_STATUS.EXPIRED } });
    logger.info('Expired stale order', { orderNumber: order.orderNumber });
    released += 1;
  }
  return released;
}

export function startJobs(): void {
  const run = async () => {
    try {
      await expireStaleReservations();
    } catch (err) {
      logger.error('Reservation expiry job failed', { error: (err as Error).message });
    }
  };
  setInterval(run, 60_000).unref();
  run();
}
