import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth';
import { loadUser } from '../middlewares/loadUser';
import { validate } from '../middlewares/validate';
import { User, Order } from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { NotFoundError, ConflictError } from '../utils/errors';
import { recordAudit } from '../services/audit.service';
import { ROLE, AUDIT_ACTION } from '../constants';
import { publicUser, generateTempPassword, createAdminAccount } from '../services/auth.service';
import { hashPassword } from '../utils/crypto';

const router = Router();
router.use(requireAuth(), loadUser(), requireRole(ROLE.ADMIN, ROLE.SUPER_ADMIN));

const listUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search, role } = req.query as { page?: string; limit?: string; search?: string; role?: string };
  const filter: Record<string, unknown> = {};
  if (role) filter.role = role;
  if (search?.trim()) {
    const term = search.trim();
    filter.$or = [
      { name: new RegExp(term, 'i') },
      { email: new RegExp(term, 'i') },
      { studentId: new RegExp(term, 'i') },
    ];
  }
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean(),
    User.countDocuments(filter),
  ]);
  const rows = users.map((u) => publicUser(u as never));
  sendSuccess(res, { users: rows, total, page: Number(page), limit: Number(limit), pages: Math.max(1, Math.ceil(total / Number(limit))) });
});

const getUserDetail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) throw new NotFoundError('User not found');
  const [orderCount, totalSpend] = await Promise.all([
    Order.countDocuments({ userId: req.params.id }),
    Order.aggregate([
      { $match: { userId: user._id, paymentStatus: 'SUCCESS' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
  ]);
  sendSuccess(res, {
    user: publicUser(user as never),
    stats: {
      orderCount,
      totalSpend: totalSpend[0]?.total ?? 0,
    },
  });
});

const setActiveSchema = z.object({ isActive: z.boolean() });
const setActive = asyncHandler(async (req, res) => {
  const body = req.validatedBody as { isActive: boolean };
  const user = await User.findById(req.params.id);
  if (!user) throw new NotFoundError('User not found');
  if (String(user._id) === req.userId) throw new ConflictError('You cannot deactivate yourself');
  user.isActive = body.isActive;
  await user.save();
  await recordAudit({
    actorId: req.userId,
    actorEmail: req.user?.email,
    action: body.isActive ? AUDIT_ACTION.USER_ACTIVATED : AUDIT_ACTION.USER_DEACTIVATED,
    resource: 'user',
    resourceId: req.params.id,
    ip: req.ip,
  });
  sendSuccess(res, { user: publicUser(user as never) });
});

const setRoleSchema = z.object({ role: z.enum(['STUDENT', 'STAFF', 'ADMIN', 'SUPER_ADMIN']) });
const setRole = asyncHandler(async (req, res) => {
  const body = req.validatedBody as { role: string };
  if (req.user?.role !== ROLE.SUPER_ADMIN) {
    const { ForbiddenError } = await import('../utils/errors');
    throw new ForbiddenError('Only a super admin can change roles');
  }
  const user = await User.findById(req.params.id);
  if (!user) throw new NotFoundError('User not found');
  if (String(user._id) === req.userId) throw new ConflictError('You cannot change your own role');
  if (body.role === ROLE.SUPER_ADMIN && req.user.role !== ROLE.SUPER_ADMIN) {
    throw new ConflictError('Only a super admin can assign the super admin role');
  }
  user.role = body.role as never;
  await user.save();
  await recordAudit({
    actorId: req.userId,
    actorEmail: req.user?.email,
    action: AUDIT_ACTION.USER_ROLE_CHANGED,
    resource: 'user',
    resourceId: req.params.id,
    metadata: { newRole: body.role },
    ip: req.ip,
  });
  sendSuccess(res, { user: publicUser(user as never) });
});

const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  studentId: z.string().trim().min(2).max(50),
  role: z.enum(['STAFF', 'ADMIN']).optional(),
});
const createStaff = asyncHandler(async (req, res) => {
  if (req.user?.role !== ROLE.SUPER_ADMIN) {
    const { ForbiddenError } = await import('../utils/errors');
    throw new ForbiddenError('Only a super admin can create staff/admin accounts');
  }
  const body = req.validatedBody as { name: string; email: string; studentId: string; role?: 'STAFF' | 'ADMIN' };
  const tempPassword = generateTempPassword();
  const user = await createAdminAccount({ ...body, password: tempPassword, role: body.role });
  sendSuccess(res, { user: publicUser(user as never), temporaryPassword: tempPassword }, 201);
});

const resetPasswordSchema = z.object({ newPassword: z.string().min(8).max(72) });
const resetPassword = asyncHandler(async (req, res) => {
  const body = req.validatedBody as { newPassword: string };
  const user = await User.findById(req.params.id);
  if (!user) throw new NotFoundError('User not found');
  user.passwordHash = await hashPassword(body.newPassword);
  await user.save();
  await recordAudit({
    actorId: req.userId,
    actorEmail: req.user?.email,
    action: 'USER_UPDATED',
    resource: 'user',
    resourceId: req.params.id,
    metadata: { passwordReset: true },
    ip: req.ip,
  });
  sendSuccess(res, { message: 'Password reset successfully' });
});

router.get('/', listUsers);
router.get('/:id', getUserDetail);
router.patch('/:id/active', validate(setActiveSchema), setActive);
router.patch('/:id/role', validate(setRoleSchema), setRole);
router.post('/staff', validate(createStaffSchema), createStaff);
router.post('/:id/reset-password', validate(resetPasswordSchema), resetPassword);

export default router;
