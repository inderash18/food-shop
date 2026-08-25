import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { requestContext } from './middlewares/requestContext';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { rateLimit } from './middlewares/rateLimit';
import authRoutes from './routes/auth.routes';
import adminAuthRoutes from './routes/admin.auth.routes';
import { publicCatalogRoutes, adminCatalogRoutes } from './routes/catalog.routes';
import cartRoutes from './routes/cart.routes';
import checkoutRoutes from './routes/checkout.routes';
import paymentRoutes from './routes/payment.routes';
import orderRoutes from './routes/order.routes';
import notificationRoutes from './routes/notification.routes';
import userRoutes from './routes/user.routes';
import analyticsRoutes from './routes/analytics.routes';
import reportsRoutes from './routes/reports.routes';
import couponRoutes from './routes/coupon.routes';
import settingsRoutes from './routes/settings.routes';
import auditRoutes from './routes/audit.routes';
import adminDashboardRoutes from './routes/admin.dashboard.routes';
import { bookingRouter } from './routes/booking.routes';
import razorpayRoutes from './routes/razorpay.routes';
import { registerProvider } from './services/payment.service';
import { PaytmProvider } from './services/providers/paytm.provider';
import { MerchantUPIProvider } from './services/providers/merchant-upi.provider';
import { PhonePeProvider } from './services/providers/phonepe.provider';
import { RazorpayProvider } from './services/providers/razorpay.provider';
import { validateRazorpayConfig } from './config/razorpay';
import { logger } from './config/logger';

export function createApp(): express.Application {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestContext());
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowedOrigins = [
          env.clientUrl,
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://localhost:3000',
          'http://localhost:4000',
        ];
        if (
          allowedOrigins.includes(origin) ||
          process.env.NODE_ENV !== 'production' ||
          origin.endsWith('.vercel.app')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      exposedHeaders: ['X-New-Access-Token'],
    })
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.use(cookieParser());

  // Capture raw body for webhook signature verification
  app.use('/api/payments/webhooks/paytm', express.raw({ type: '*/*', limit: '256kb' }), (req, _res, next) => {
    (req as unknown as { rawBody?: string }).rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : undefined;
    next();
  });

  app.use(
    morgan('combined', {
      stream: {
        write: (msg: string) => logger.info(msg.trim()),
      },
    })
  );

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), ts: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/admin/auth', adminAuthRoutes);
  app.use('/api/admin', adminAuthRoutes);
  app.use('/api', publicCatalogRoutes);
  app.use('/api', bookingRouter);
  app.use(
    '/api/admin',
    adminCatalogRoutes,
    userRoutes,
    analyticsRoutes,
    reportsRoutes,
    couponRoutes,
    auditRoutes,
    adminDashboardRoutes
  );
  app.use('/api/cart', cartRoutes);
  app.use('/api/checkout', checkoutRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/payment', paymentRoutes);
  app.use('/api/razorpay', razorpayRoutes);
  app.use('/api', razorpayRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/settings', settingsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  // Register payment providers
  registerProvider(new RazorpayProvider());
  registerProvider(new PhonePeProvider());
  registerProvider(new PaytmProvider());
  registerProvider(new MerchantUPIProvider());

  validateRazorpayConfig();

  return app;
}
