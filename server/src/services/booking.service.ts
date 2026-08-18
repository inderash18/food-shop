import { Order, IOrder } from '../models';
import { markOrderCollected } from './order.service';

/**
 * Pre-Order express counter collection alias
 */
export async function checkInBooking(qrOrToken: string, staffId: string, staffEmail?: string) {
  const result = await markOrderCollected(qrOrToken, staffId, staffEmail);
  return {
    success: result.success,
    alreadyCheckedIn: result.alreadyCollected,
    booking: result.order,
    message: result.message,
  };
}

export async function getBookingById(orderId: string): Promise<IOrder | null> {
  return Order.findById(orderId).lean();
}
