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
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ actorEmail: new RegExp(escaped, 'i') }, { resourceId: new RegExp(escaped, 'i') }];
  }
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 25));
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('actorId', 'name email')
      .lean(),
    AuditLog.countDocuments(filter),
  ]);
  sendSuccess(res, {
    logs: logs || [],
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.max(1, Math.ceil(total / limitNum)),
  });
}));

export default router;
