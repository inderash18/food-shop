import { Router } from 'express';
import { adminLogin, adminMe, adminLogout, adminRefresh } from '../controllers/admin.auth.controller';
import { validate } from '../middlewares/validate';
import { loginSchema } from '../validators/auth.schema';
import { requireAuth, requireRole } from '../middlewares/auth';
import { loadUser } from '../middlewares/loadUser';
import { ROLE } from '../constants';
import { rateLimit } from '../middlewares/rateLimit';
import { env } from '../config/env';

const router = Router();

// Dedicated Admin Login route
router.post(
  '/login',
  rateLimit({ windowMs: env.rateLimitLoginWindowMs, max: 10, keyPrefix: 'admin_login' }),
  validate(loginSchema),
  adminLogin
);

// Dedicated Admin Verification route
router.get(
  '/me',
  requireAuth(),
  loadUser(),
  requireRole(ROLE.ADMIN, ROLE.SUPER_ADMIN),
  adminMe
);

// Dedicated Admin Refresh Session route
router.post('/refresh', adminRefresh);

// Dedicated Admin Logout route
router.post('/logout', adminLogout);

export default router;
