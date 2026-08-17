import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth';
import { loadUser } from '../middlewares/loadUser';
import { validate } from '../middlewares/validate';
import { initiateCheckout } from '../services/order.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { rateLimit } from '../middlewares/rateLimit';
import { AppError } from '../utils/errors';
import { logger } from '../config/logger';
import { randomUUID } from 'crypto';

const router = Router();
router.use(requireAuth(), loadUser());

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(99),
      })
    )
    .min(1, 'Cart is empty')
    .max(30),
  couponCode: z.string().trim().toUpperCase().optional(),
  checkoutRequestId: z.string().min(8).max(64).optional(),
});

router.post(
  '/',
  rateLimit({ windowMs: 60_000, max: 20, keyPrefix: 'checkout' }),
  validate(checkoutSchema),
  asyncHandler(async (req, res) => {
    const body = req.validatedBody as {
      items: { productId: string; quantity: number }[];
      couponCode?: string;
      checkoutRequestId?: string;
    };
    const checkoutRequestId = body.checkoutRequestId ?? `chk_${req.userId}_${randomUUID()}`;

    logger.info('Checkout initiated', { userId: req.userId, items: body.items.length });
    const result = await initiateCheckout(req.userId!, body.items, checkoutRequestId, body.couponCode);
    sendSuccess(res, { checkout: result }, 201);
  })
);

router.post('/cancel', asyncHandler(async (_req, res) => {
  throw new AppError(400, 'BAD_REQUEST', 'Use the order cancellation endpoint');
}));

export default router;
