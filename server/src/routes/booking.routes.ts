import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import { checkInBooking } from '../services/booking.service';
import { Order } from '../models';
import { ROLE } from '../constants';
import { NotFoundError } from '../utils/errors';

export const bookingRouter = Router();

// 1. Get User's Pre-Orders (Authenticated)
bookingRouter.get('/bookings/mine', requireAuth(), async (req: Request, res: Response) => {
  const bookings = await Order.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, bookings });
});

// 2. Get Single Pre-Order with Digital Pass (Authenticated)
bookingRouter.get('/bookings/:id', requireAuth(), async (req: Request, res: Response) => {
  const booking = await Order.findOne({ _id: req.params.id, userId: req.userId }).lean();
  if (!booking) {
    throw new NotFoundError('Order not found');
  }
  res.json({ success: true, booking });
});

// 3. Staff QR Check-In / Counter Collection Scanner (Staff / Admin)
bookingRouter.post(
  '/bookings/check-in',
  requireAuth(),
  requireRole(ROLE.STAFF, ROLE.ADMIN, ROLE.SUPER_ADMIN),
  async (req: Request, res: Response) => {
    const { qrData, bookingNumber } = req.body;
    const result = await checkInBooking(qrData || bookingNumber, req.userId!);
    res.json({
      success: true,
      alreadyCheckedIn: result.alreadyCheckedIn,
      booking: result.booking,
      message: result.message,
    });
  }
);
