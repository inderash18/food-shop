import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { addToCart, getCartForUser, updateCartItem, removeCartItem, clearCart } from '../services/cart.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

const router = Router();
router.use(requireAuth());

const addItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
});

const updateItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(99),
});

router.get('/', asyncHandler(async (req, res) => {
  const cart = await getCartForUser(req.userId!);
  sendSuccess(res, { cart });
}));

router.post('/', validate(addItemSchema), asyncHandler(async (req, res) => {
  const body = req.validatedBody as { productId: string; quantity: number };
  const cart = await addToCart(req.userId!, body.productId, body.quantity);
  sendSuccess(res, { cart });
}));

router.patch('/:productId', validate(updateItemSchema), asyncHandler(async (req, res) => {
  const body = req.validatedBody as { quantity: number };
  const cart = await updateCartItem(req.userId!, req.params.productId, body.quantity);
  sendSuccess(res, { cart });
}));

router.delete('/:productId', asyncHandler(async (req, res) => {
  const cart = await removeCartItem(req.userId!, req.params.productId);
  sendSuccess(res, { cart });
}));

router.delete('/', asyncHandler(async (req, res) => {
  const cart = await clearCart(req.userId!);
  sendSuccess(res, { cart });
}));

export default router;
