import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth';
import { loadUser } from '../middlewares/loadUser';
import { validate } from '../middlewares/validate';
import { ShopSettings } from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { recordAudit } from '../services/audit.service';
import { AUDIT_ACTION, SHOP_STATUS } from '../constants';
import { cache } from '../services/cache.service';

const router = Router();

const settingsSchema = z.object({
  shopName: z.string().trim().min(2).max(100).optional(),
  collegeName: z.string().trim().min(2).max(100).optional(),
  contactPhone: z.string().trim().max(20).optional(),
  contactEmail: z.string().trim().email().optional(),
  address: z.string().trim().max(300).optional(),
  shopStatus: z.enum(Object.values(SHOP_STATUS) as [string, ...string[]]).optional(),
  orderCutoffMinutesBeforeClose: z.coerce.number().int().min(0).max(120).optional(),
  minOrderAmount: z.coerce.number().min(0).optional(),
  serviceFee: z.coerce.number().min(0).max(10000).optional(),
  currency: z.string().trim().length(3).optional(),
  timezone: z.string().trim().min(2).max(50).optional(),
  orderPreparationEnabled: z.boolean().optional(),
  orderOpenTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  orderCloseTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
});

// Public: fetch current shop status/settings
router.get('/public', asyncHandler(async (_req, res) => {
  let settings = await ShopSettings.findOne().lean();
  if (!settings) {
    settings = await ShopSettings.create({ shopName: 'College Food Shop', collegeName: 'College' });
  }
  cache.set('settings', settings, 30_000);
  sendSuccess(res, {
    settings: {
      shopName: settings.shopName,
      collegeName: settings.collegeName,
      contactPhone: settings.contactPhone,
      shopStatus: settings.shopStatus,
      minOrderAmount: settings.minOrderAmount,
      serviceFee: settings.serviceFee,
      currency: settings.currency,
      timezone: settings.timezone,
      orderOpenTime: settings.orderOpenTime,
      orderCloseTime: settings.orderCloseTime,
    },
  });
}));

// Admin: full settings
router.get('/', requireAuth(), loadUser(), requireRole('ADMIN', 'SUPER_ADMIN'), asyncHandler(async (_req, res) => {
  let settings = await ShopSettings.findOne().lean();
  if (!settings) settings = await ShopSettings.create({ shopName: 'College Food Shop', collegeName: 'College' });
  sendSuccess(res, { settings });
}));

router.patch(
  '/',
  requireAuth(),
  loadUser(),
  requireRole('ADMIN', 'SUPER_ADMIN'),
  validate(settingsSchema),
  asyncHandler(async (req, res) => {
    const body = req.validatedBody;
    let settings = await ShopSettings.findOne();
    if (!settings) settings = await ShopSettings.create({ shopName: 'College Food Shop', collegeName: 'College' });
    Object.assign(settings, body);
    await settings.save();
    cache.del('settings');
    await recordAudit({
      actorId: req.userId,
      actorEmail: req.user?.email,
      action: AUDIT_ACTION.SETTINGS_UPDATED,
      resource: 'settings',
      metadata: { changed: Object.keys(body as Record<string, unknown>) },
      ip: req.ip,
    });
    sendSuccess(res, { settings });
  })
);

export default router;
