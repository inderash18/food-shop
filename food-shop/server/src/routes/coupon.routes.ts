import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth';
import { loadUser } from '../middlewares/loadUser';
import { validate } from '../middlewares/validate';
import { Coupon } from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { NotFoundError, ConflictError } from '../utils/errors';
import { recordAudit } from '../services/audit.service';
import { AUDIT_ACTION } from '../constants';

const router = Router();
router.use(requireAuth(), loadUser(), requireRole('ADMIN', 'SUPER_ADMIN'));

const couponSchema = z.object({
  code: z.string().trim().toUpperCase().min(3).max(20),
  type: z.enum(['PERCENTAGE', 'FLAT']),
  value: z.coerce.number().positive(),
  minOrder: z.coerce.number().min(0).default(0),
  maxDiscount: z.coerce.number().min(0).default(0),
  expiresAt: z.string().datetime().optional().nullable(),
  usageLimit: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

const couponUpdateSchema = z.object({
  code: z.string().trim().toUpperCase().min(3).max(20).optional(),
  type: z.enum(['PERCENTAGE', 'FLAT']).optional(),
  value: z.coerce.number().positive().optional(),
  minOrder: z.coerce.number().min(0).optional(),
  maxDiscount: z.coerce.number().min(0).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  usageLimit: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

router.get('/', asyncHandler(async (_req, res) => {
  const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean();
  sendSuccess(res, { coupons });
}));

router.post('/', validate(couponSchema), asyncHandler(async (req, res) => {
  const body = req.validatedBody as z.infer<typeof couponSchema>;
  const existing = await Coupon.findOne({ code: body.code });
  if (existing) throw new ConflictError('Coupon code already exists');
  const coupon = await Coupon.create({ ...body, expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined });
  await recordAudit({ actorId: req.userId, actorEmail: req.user?.email, action: AUDIT_ACTION.COUPON_CREATED, resource: 'coupon', resourceId: String(coupon._id), ip: req.ip });
  sendSuccess(res, { coupon }, 201);
}));

router.patch('/:id', validate(couponUpdateSchema), asyncHandler(async (req, res) => {
  const body = req.validatedBody as z.infer<typeof couponUpdateSchema>;
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw new NotFoundError('Coupon not found');
  Object.assign(coupon, body, body.expiresAt ? { expiresAt: new Date(body.expiresAt) } : {});
  await coupon.save();
  await recordAudit({ actorId: req.userId, actorEmail: req.user?.email, action: AUDIT_ACTION.COUPON_UPDATED, resource: 'coupon', resourceId: req.params.id, ip: req.ip });
  sendSuccess(res, { coupon });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await Coupon.deleteOne({ _id: req.params.id });
  sendSuccess(res, { message: 'Coupon deleted' });
}));

export default router;
