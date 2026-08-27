import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth';
import { loadUser } from '../middlewares/loadUser';
import { validate } from '../middlewares/validate';
import { User, Order, Cart, RefreshToken, Notification, OtpToken } from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { recordAudit } from '../services/audit.service';
import { ROLE, AUDIT_ACTION } from '../constants';
import { publicUser, generateTempPassword, createAdminAccount } from '../services/auth.service';
import { hashPassword } from '../utils/crypto';

const router = Router();
router.use(requireAuth(), loadUser(), requireRole(ROLE.ADMIN, ROLE.SUPER_ADMIN));

const listUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 25,
    search,
    role,
    status,
  } = req.query as {
    page?: string;
    limit?: string;
    search?: string;
    role?: string;
    status?: string;
  };

  const filter: Record<string, unknown> = {};

  if (role && role !== 'ALL') {
    if (role === 'STAFF_ADMIN' || role === 'ADMINS' || role === 'ADMIN') {
      filter.role = { $in: [ROLE.ADMIN, ROLE.SUPER_ADMIN] };
    } else {
      filter.role = role.toUpperCase();
    }
  }

  if (status && status !== 'ALL') {
    if (status.toUpperCase() === 'ACTIVE') {
      filter.isActive = true;
    } else if (status.toUpperCase() === 'INACTIVE' || status.toUpperCase() === 'BLOCKED') {
      filter.isActive = false;
    }
  }

  if (search?.trim()) {
    const term = search.trim();
    const regex = new RegExp(term, 'i');
    filter.$or = [
      { name: regex },
      { email: regex },
      { emailNormalized: regex },
      { studentId: regex },
      { mobileNumber: regex },
      { phone: regex },
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 25));

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    User.countDocuments(filter),
  ]);

  const userIds = users.map((u) => u._id);
  const orderCountMap = new Map<string, number>();

  if (userIds.length > 0) {
    try {
      const counts = await Order.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
      ]);
      counts.forEach((c) => {
        if (c._id) {
          orderCountMap.set(String(c._id), c.count || 0);
        }
      });
    } catch {
      // In isolated tests without DB aggregation, fallback cleanly
    }
  }

  const rows = users.map((u: any) => {
    const pub = publicUser(u as never);
    const count = orderCountMap.get(String(u._id)) || 0;
    const mobile = u.mobileNumber || u.phone || '';
    return {
      ...pub,
      mobile,
      mobileNumber: mobile,
      phone: mobile,
      status: u.isActive ? 'ACTIVE' : 'INACTIVE',
      lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
      orderCount: count,
    };
  });

  sendSuccess(res, {
    users: rows,
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.max(1, Math.ceil(total / limitNum)),
  });
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

const setRoleSchema = z.object({ role: z.enum(['STUDENT', 'ADMIN', 'SUPER_ADMIN']) });
const setRole = asyncHandler(async (req, res) => {
  const body = req.validatedBody as { role: string };
  if (req.user?.role !== ROLE.SUPER_ADMIN && req.user?.role !== ROLE.ADMIN) {
    throw new ForbiddenError('Only an administrator can change roles');
  }
  const user = await User.findById(req.params.id);
  if (!user) throw new NotFoundError('User not found');
  if (String(user._id) === req.userId) throw new ConflictError('You cannot change your own role');
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
  role: z.enum(['ADMIN', 'SUPER_ADMIN']).optional(),
});
const createStaff = asyncHandler(async (req, res) => {
  if (req.user?.role !== ROLE.SUPER_ADMIN && req.user?.role !== ROLE.ADMIN) {
    throw new ForbiddenError('Only an administrator can create admin accounts');
  }
  const body = req.validatedBody as { name: string; email: string; studentId: string; role?: 'ADMIN' | 'SUPER_ADMIN' };
  const tempPassword = generateTempPassword();
  const user = await createAdminAccount({ ...body, password: tempPassword, role: body.role || 'ADMIN' });
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

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new NotFoundError('User not found');
  if (String(user._id) === req.userId) {
    throw new ConflictError('You cannot delete your own account');
  }
  if (user.role === ROLE.SUPER_ADMIN && req.user?.role !== ROLE.SUPER_ADMIN) {
    throw new ForbiddenError('Only a Super Admin can delete another Super Admin');
  }

  // Clean up user's related data
  await Promise.all([
    Cart.deleteMany({ userId: user._id }),
    RefreshToken.deleteMany({ userId: user._id }),
    Notification.deleteMany({ userId: user._id }),
    OtpToken.deleteMany({ email: user.email }),
    User.deleteOne({ _id: user._id }),
  ]);

  await recordAudit({
    actorId: req.userId,
    actorEmail: req.user?.email,
    action: AUDIT_ACTION.USER_DELETED,
    resource: 'user',
    resourceId: req.params.id,
    metadata: { name: user.name, email: user.email, role: user.role },
    ip: req.ip,
  });

  sendSuccess(res, { message: 'User deleted successfully' });
});

router.get('/', listUsers);
router.get('/:id', getUserDetail);
router.patch('/:id/active', validate(setActiveSchema), setActive);
router.patch('/:id/role', validate(setRoleSchema), setRole);
router.post('/staff', validate(createStaffSchema), createStaff);
router.post('/:id/reset-password', validate(resetPasswordSchema), resetPassword);
router.delete('/:id', deleteUser);

export default router;
