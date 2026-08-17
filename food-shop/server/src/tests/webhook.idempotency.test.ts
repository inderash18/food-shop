import { describe, it, expect, vi, beforeEach } from 'vitest';
import { confirmOrder } from '../services/order.service';
import { Order, Product } from '../models';
import { ORDER_STATUS, PAYMENT_STATUS } from '../constants';

describe('Payment Webhook Idempotency', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('handles duplicate payment webhook delivery without double-committing inventory', async () => {
    let orderState = {
      _id: 'order_123',
      orderNumber: 'COL-2026-0001',
      userId: 'user_456',
      status: ORDER_STATUS.PAYMENT_PENDING,
      paymentStatus: PAYMENT_STATUS.PENDING,
      items: [{ productId: 'prod_1', quantity: 2, priceSnapshot: 50, productNameSnapshot: 'Veg Rice', subtotal: 100 }],
      save: vi.fn().mockImplementation(async function () {
        orderState.status = ORDER_STATUS.ORDER_CONFIRMED;
        orderState.paymentStatus = PAYMENT_STATUS.SUCCESS;
        return orderState;
      }),
    };

    vi.spyOn(Order, 'findById').mockImplementation(async () => orderState as any);
    const updateProductSpy = vi.spyOn(Product, 'updateOne').mockResolvedValue({
      acknowledged: true,
      modifiedCount: 1,
      matchedCount: 1,
      upsertedCount: 0,
      upsertedId: null,
    } as any);

    // 1st webhook call
    const firstCall = await confirmOrder('order_123');
    expect(firstCall.status).toBe(ORDER_STATUS.ORDER_CONFIRMED);
    expect(updateProductSpy).toHaveBeenCalledTimes(1);

    // 2nd duplicate webhook call
    const secondCall = await confirmOrder('order_123');
    expect(secondCall.status).toBe(ORDER_STATUS.ORDER_CONFIRMED);
    // Product update should NOT be called a second time
    expect(updateProductSpy).toHaveBeenCalledTimes(1);
  });
});
