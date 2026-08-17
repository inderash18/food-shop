import { Router } from 'express';
import { requireAuth } from '../middlewares/auth';
import { Notification } from '../models';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

const router = Router();
router.use(requireAuth());

router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query as { page?: string; limit?: string };
  const [notifications, total, unread] = await Promise.all([
    Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean(),
    Notification.countDocuments({ userId: req.userId }),
    Notification.countDocuments({ userId: req.userId, read: false }),
  ]);
  sendSuccess(res, { notifications, total, unread, page: Number(page), limit: Number(limit), pages: Math.max(1, Math.ceil(total / Number(limit))) });
}));

router.get('/unread-count', asyncHandler(async (req, res) => {
  const unread = await Notification.countDocuments({ userId: req.userId, read: false });
  sendSuccess(res, { unread });
}));

router.patch('/:id/read', asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, userId: req.userId }, { $set: { read: true } });
  sendSuccess(res, { message: 'Marked as read' });
}));

router.patch('/read-all', asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.userId, read: false }, { $set: { read: true } });
  sendSuccess(res, { message: 'All notifications marked as read' });
}));

export default router;
