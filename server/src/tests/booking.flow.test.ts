import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkInBooking } from '../services/booking.service';
import { Order } from '../models';
import * as auditService from '../services/audit.service';

describe('Express Pre-Order Pass Collection Flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('validates pre-order token pass collection and prevents duplicate pickup', async () => {
    vi.spyOn(auditService, 'recordAudit').mockResolvedValue({} as any);

    const mockOrder = {
      _id: 'ord_123',
      orderNumber: 'ORD-2026-0042',
      tokenNumber: 'A104',
      collectionStatus: 'PENDING',
      status: 'READY',
      collectedAt: undefined,
      items: [{ productNameSnapshot: 'Veggie Wrap', quantity: 1, prepStatus: 'READY' }],
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(Order, 'findOne').mockResolvedValue(mockOrder as any);

    // 1st Collection
    const firstCheck = await checkInBooking('A104', 'staff_1');
    expect(firstCheck.success).toBe(true);
    expect(firstCheck.alreadyCheckedIn).toBe(false);
    expect(mockOrder.collectionStatus).toBe('COLLECTED');

    // 2nd Duplicate Collection
    const secondCheck = await checkInBooking('A104', 'staff_1');
    expect(secondCheck.success).toBe(true);
    expect(secondCheck.alreadyCheckedIn).toBe(true);
  });
});
