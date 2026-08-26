import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth';
import { loadUser } from '../middlewares/loadUser';
import { validate } from '../middlewares/validate';
import {
  getMyOrders,
  getMyOrderStatus,
  getMyOrder,
  getOrderByNumber,
  cancelMyOrder,
  getAdminOrders,
  getKitchenBoard,
  getOrderCounts,
  getMyActiveOrder,
  reorder,
  counterCollectOrder,
  updateKitchenPrepStatusController,
} from '../controllers/order.controller';
import { updateOrderStatusAdmin } from '../services/order.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { ROLE, ORDER_STATUS } from '../constants';

const router = Router();

// ---- Authenticated User ----
router.use(requireAuth(), loadUser());

// ---- Admin / Staff Counter & Kitchen Endpoints ----
router.use('/admin', requireRole(ROLE.ADMIN, ROLE.SUPER_ADMIN, ROLE.STAFF));
router.get('/admin', getAdminOrders);
router.get('/admin/counts', getOrderCounts);
router.get('/admin/kitchen', getKitchenBoard);
router.post('/admin/counter-collect', counterCollectOrder);
router.patch('/admin/:orderId/prep-status', updateKitchenPrepStatusController);

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

// ---- Customer Pre-Order Endpoints ----
router.get('/mine', getMyOrders);
router.get('/mine/active', getMyActiveOrder);
router.get('/number/:orderNumber', getOrderByNumber);
router.get('/:orderId/status', getMyOrderStatus);
router.get('/:orderId', getMyOrder);
router.post('/:orderId/cancel', cancelMyOrder);
router.post('/:orderId/reorder', reorder);

export default router;
