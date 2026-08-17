import { Router } from 'express';
import { register, login, refresh, logout, me, createAdmin } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { registerSchema, loginSchema, createAdminSchema } from '../validators/auth.schema';
import { requireAuth } from '../middlewares/auth';
import { loadUser } from '../middlewares/loadUser';
import { requireRole } from '../middlewares/auth';
import { ROLE } from '../constants';
import { rateLimit } from '../middlewares/rateLimit';
import { env } from '../config/env';

const router = Router();

router.post(
  '/register',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: 'reg' }),
  validate(registerSchema),
  register
);
router.post(
  '/login',
  rateLimit({ windowMs: env.rateLimitLoginWindowMs, max: env.rateLimitLoginMax, keyPrefix: 'login' }),
  validate(loginSchema),
  login
);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth(), loadUser(), me);

router.post(
  '/admin/create',
  requireAuth(),
  loadUser(),
  requireRole(ROLE.SUPER_ADMIN),
  validate(createAdminSchema),
  createAdmin
);

export default router;
