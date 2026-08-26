import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const bool = (v: string | undefined, def: boolean): boolean => {
  if (v === undefined) return def;
  return v === 'true' || v === '1';
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT ?? '4000', 10),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',

  databaseUrl: process.env.DATABASE_URL ?? 'mongodb://127.0.0.1:27017/food-shop',

  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',

  allowedEmailDomains: (process.env.ALLOWED_EMAIL_DOMAINS ?? '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean),
  requireDomainCheck: bool(process.env.REQUIRE_DOMAIN_CHECK, false),

  paymentProvider: process.env.PAYMENT_PROVIDER ?? 'razorpay',
  paymentKeyId: process.env.PAYMENT_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? '',
  paymentKeySecret: process.env.PAYMENT_KEY_SECRET ?? process.env.RAZORPAY_KEY_SECRET ?? '',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? process.env.PAYMENT_KEY_ID ?? '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? process.env.PAYMENT_KEY_SECRET ?? '',
  webhookSecret: process.env.WEBHOOK_SECRET ?? 'dev-webhook-secret',

  shopName: process.env.SHOP_NAME ?? 'College Food Shop',
  collegeName: process.env.COLLEGE_NAME ?? 'My College',
  currency: process.env.CURRENCY ?? 'INR',
  timezone: process.env.TIMEZONE ?? 'Asia/Kolkata',

  cookieSecure: bool(process.env.COOKIE_SECURE, false),

  gmailUser: process.env.GMAIL_USER ?? '',
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD ?? '',
  otpExpiry: parseInt(process.env.OTP_EXPIRY ?? '300', 10),
  otpResendCooldown: parseInt(process.env.OTP_RESEND_COOLDOWN ?? '60', 10),
  otpMaxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS ?? '5', 10),

  rateLimitLoginMax: parseInt(process.env.RATE_LIMIT_LOGIN_MAX ?? '10', 10),
  rateLimitLoginWindowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS ?? '900000', 10),
  rateLimitGeneralMax: parseInt(process.env.RATE_LIMIT_GENERAL_MAX ?? '300', 10),
  rateLimitGeneralWindowMs: parseInt(process.env.RATE_LIMIT_GENERAL_WINDOW_MS ?? '60000', 10),
} as const;

export type Env = typeof env;
