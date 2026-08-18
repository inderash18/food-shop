import { describe, it, expect, vi, beforeEach } from 'vitest';
import { markOrderCollected, updateKitchenPrepStatus, initiateCheckout } from '../services/order.service';
import { Order, Product, ShopSettings, Coupon } from '../models';
import { NotFoundError } from '../utils/errors';
import * as auditService from '../services/audit.service';
import * as notificationService from '../services/notification.service';
import { paymentService } from '../services/payment.service';

describe('Food Pre-Order & Queue-Free Express Collection Flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('validates express counter collection and prevents duplicate hand-over', async () => {
    vi.spyOn(auditService, 'recordAudit').mockResolvedValue({} as any);

    const mockOrder = {
      _id: 'ord_123',
      orderNumber: 'ORD-20260818-000104',
      tokenNumber: 'A104',
      status: 'READY',
      collectionStatus: 'PENDING',
      collectedAt: undefined,
      items: [{ productNameSnapshot: 'Smash Burger', quantity: 2, prepStatus: 'READY' }],
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(Order, 'findOne').mockResolvedValue(mockOrder as any);

    // 1st Collection by Token #A104
    const firstAttempt = await markOrderCollected('A104', 'staff_1', 'staff@college.local');
    expect(firstAttempt.success).toBe(true);
    expect(firstAttempt.alreadyCollected).toBe(false);
    expect(mockOrder.collectionStatus).toBe('COLLECTED');
    expect(mockOrder.status).toBe('COMPLETED');

    // 2nd Duplicate Collection
    const secondAttempt = await markOrderCollected('A104', 'staff_1', 'staff@college.local');
    expect(secondAttempt.success).toBe(true);
    expect(secondAttempt.alreadyCollected).toBe(true);
  });

  it('progresses kitchen preparation status and triggers ready notification', async () => {
    vi.spyOn(auditService, 'recordAudit').mockResolvedValue({} as any);
    const notifySpy = vi.spyOn(notificationService, 'notifyUser').mockResolvedValue({} as any);

    const mockOrder = {
      _id: 'ord_123',
      orderNumber: 'ORD-20260818-000104',
      tokenNumber: 'A104',
      userId: 'user_456',
      status: 'ORDER_CONFIRMED',
      collectionStatus: 'PENDING',
      collectionCounter: 'Counter 2 - Express Pick',
      items: [{ productNameSnapshot: 'Avocado Toast', quantity: 1, prepStatus: 'CONFIRMED' }],
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(Order, 'findById').mockResolvedValue(mockOrder as any);

    // 1. Move to PREPARING
    const prepOrder = await updateKitchenPrepStatus('ord_123', 'PREPARING', 'staff_1');
    expect(prepOrder.status).toBe('PREPARING');

    // 2. Move to READY_FOR_COLLECTION
    const readyOrder = await updateKitchenPrepStatus('ord_123', 'READY_FOR_COLLECTION', 'staff_1');
    expect(readyOrder.status).toBe('READY');
    expect(readyOrder.collectionStatus).toBe('READY');
    expect(notifySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('#A104 is Ready!'),
      })
    );
  });
});
