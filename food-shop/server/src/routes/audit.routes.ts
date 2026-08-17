import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import { loadUser } from '../middlewares/loadUser';
import { AuditLog } from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { ROLE } from '../constants';

const router = Router();
router.use(requireAuth(), loadUser(), requireRole(ROLE.ADMIN, ROLE.SUPER_ADMIN));

router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, search } = req.query as { page?: string; limit?: string; action?: string; search?: string };
  const filter: Record<string, unknown> = {};
  if (action) filter.action = action;
  if (search?.trim()) {
    filter.$or = [{ actorEmail: new RegExp(search.trim(), 'i') }, { resourceId: new RegExp(search.trim(), 'i') }];
  }
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('actorId', 'name email')
      .lean(),
    AuditLog.countDocuments(filter),
  ]);
  sendSuccess(res, { logs, total, page: Number(page), limit: Number(limit), pages: Math.max(1, Math.ceil(total / Number(limit))) });
}));

export default router;
