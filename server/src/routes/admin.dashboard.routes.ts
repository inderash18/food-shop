import { Router } from 'express';
import { getDashboardStats, getRevenueChart, getRecentTransactions, getSettlements } from '../controllers/admin.dashboard.controller';
import { requireAuth, requireRole } from '../middlewares/auth';
import { ROLE } from '../constants';

const router = Router();

// All routes are protected by admin roles
router.use(requireAuth, requireRole([ROLE.ADMIN, ROLE.SUPER_ADMIN]));

router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/revenue-chart', getRevenueChart);
router.get('/transactions', getRecentTransactions);
router.get('/settlements', getSettlements);

export default router;
