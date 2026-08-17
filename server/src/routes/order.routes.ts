import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth';
import { loadUser } from '../middlewares/loadUser';
import { validate } from '../middlewares/validate';
import {
  getMyOrders,
  getMyOrder,
  getOrderByNumber,
  cancelMyOrder,
  getAdminOrders,
  getKitchenBoard,
  getOrderCounts,
  getMyActiveOrder,
  reorder,
} from '../controllers/order.controller';
import { updateOrderStatusAdmin } from '../services/order.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { ROLE, ORDER_STATUS } from '../constants';

const router = Router();

// ---- Student orders ----
router.use(requireAuth(), loadUser());

// ---- Admin / staff ----
router.use('/admin', requireRole(ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.STAFF));
router.get('/admin', getAdminOrders);
router.get('/admin/counts', getOrderCounts);
router.get('/admin/kitchen', getKitchenBoard);

const statusSchema = z.object({ status: z.enum(Object.values(ORDER_STATUS) as [string, ...string[]]) });
router.patch(
  '/admin/:orderId/status',
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const body = req.validatedBody as { status: string };
    const order = await updateOrderStatusAdmin(
      req.params.orderId,
      body.status as never,
      req.userId!,
      req.user?.email
    );
    sendSuccess(res, { order });
  })
);

// ---- Student orders ----
router.get('/mine', getMyOrders);
router.get('/mine/active', getMyActiveOrder);
router.get('/number/:orderNumber', getOrderByNumber);
router.get('/:orderId', getMyOrder);
router.post('/:orderId/cancel', cancelMyOrder);
router.post('/:orderId/reorder', reorder);

export default router;
