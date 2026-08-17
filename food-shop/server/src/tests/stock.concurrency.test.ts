import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reserveStock } from '../services/order.service';
import { Product } from '../models';
import { OutOfStockError } from '../utils/errors';

describe('Inventory & Stock Concurrency', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('prevents overselling when two simultaneous checkouts request remaining stock', async () => {
    let callCount = 0;
    // Mock Product.updateOne atomic conditional check
    vi.spyOn(Product, 'updateOne').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // First student gets the last item
        return { acknowledged: true, modifiedCount: 1, matchedCount: 1, upsertedCount: 0, upsertedId: null } as any;
      } else {
        // Second student fails because stock is no longer available
        return { acknowledged: true, modifiedCount: 0, matchedCount: 0, upsertedCount: 0, upsertedId: null } as any;
      }
    });

    const mockItem = { productId: 'prod_123', quantity: 1 };

    // First student checkout
    await expect(reserveStock({ _id: 'order_1', items: [mockItem] })).resolves.toBeUndefined();

    // Second student simultaneous checkout
    await expect(reserveStock({ _id: 'order_2', items: [mockItem] })).rejects.toThrow(OutOfStockError);
  });
});
