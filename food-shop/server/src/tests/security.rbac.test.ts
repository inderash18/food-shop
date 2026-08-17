import { describe, it, expect, vi } from 'vitest';
import { requireRole } from '../middlewares/auth';
import { ROLE } from '../constants';
import { cancelOrder } from '../services/order.service';
import { Order } from '../models';
import { AppError } from '../utils/errors';

describe('Security & Role-Based Access Control (RBAC)', () => {
  it('blocks student role from accessing admin-restricted middleware', () => {
    const middleware = requireRole(ROLE.ADMIN, ROLE.SUPER_ADMIN);
    const req: any = { user: { role: ROLE.STUDENT } };
    const res: any = {};
    let errorPassed: any = null;
    const next = vi.fn((err) => {
      errorPassed = err;
    });

    middleware(req, res, next);
    expect(errorPassed).toBeTruthy();
    expect(errorPassed.status).toBe(403);
  });

  it('allows admin and super admin to proceed through admin middleware', () => {
    const middleware = requireRole(ROLE.ADMIN, ROLE.SUPER_ADMIN);
    const reqAdmin: any = { user: { role: ROLE.ADMIN } };
    const nextAdmin = vi.fn();
    middleware(reqAdmin, {} as any, nextAdmin);
    expect(nextAdmin).toHaveBeenCalledWith();

    const reqSuper: any = { user: { role: ROLE.SUPER_ADMIN } };
    const nextSuper = vi.fn();
    middleware(reqSuper, {} as any, nextSuper);
    expect(nextSuper).toHaveBeenCalledWith();
  });

  it('prevents a student from cancelling another student’s order (IDOR protection)', async () => {
    const foreignOrder = {
      _id: 'order_999',
      userId: 'student_A',
      status: 'PAYMENT_PENDING',
      paymentStatus: 'PENDING',
      items: [],
    };

    vi.spyOn(Order, 'findById').mockResolvedValue(foreignOrder as any);

    // Student B attempts to cancel Student A's order
    await expect(cancelOrder('order_999', 'student_B', false)).rejects.toThrow(AppError);
  });
});
