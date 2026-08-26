import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

interface SendEmailOtpInput {
  email: string;
  otp: string;
  subject?: string;
}

/**
 * Creates Nodemailer transporter using Gmail SMTP and Google App Password.
 */
function createTransporter() {
  const user = env.gmailUser || process.env.GMAIL_USER;
  const pass = env.gmailAppPassword || process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass || pass === 'mock' || pass === 'your_google_app_password') {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Sends a professional verification OTP email via Gmail SMTP (Nodemailer).
 */
export async function sendVerificationOTP(input: SendEmailOtpInput): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const shopName = process.env.SHOP_NAME || 'College Food Shop';
  const transporter = createTransporter();

  const subject = input.subject || `Verify your email address — ${shopName}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8faf9; color: #1c1917; margin: 0; padding: 24px; }
          .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e7e5e4; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
          .logo { font-size: 20px; font-weight: 800; color: #389c9a; margin-bottom: 20px; display: inline-block; }
          .title { font-size: 20px; font-weight: 700; color: #1c1917; margin-bottom: 12px; }
          .text { font-size: 14px; line-height: 1.6; color: #57534e; margin-bottom: 24px; }
          .otp-box { background: #f5f5f4; border-radius: 12px; padding: 18px; text-align: center; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1c1917; margin-bottom: 24px; border: 1px solid #e7e5e4; }
          .footer { font-size: 12px; color: #a8a29e; text-align: center; border-t: 1px solid #f5f5f4; pt: 16px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">${shopName}</div>
          <div class="title">Verify your email address</div>
          <div class="text">Hello,<br><br>Your verification code is below. Enter this 6-digit code to complete your verification:</div>
          <div class="otp-box">${input.otp}</div>
          <div class="text">This code will expire in <strong>5 minutes</strong>. If you did not request this verification code, please ignore this email.</div>
          <div class="footer">© ${new Date().getFullYear()} ${shopName}. All rights reserved.</div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
Verify your email address - ${shopName}

Hello,

Your verification code is: ${input.otp}

This code expires in 5 minutes.

If you did not request this code, you can safely ignore this email.

Regards,
${shopName}
  `.trim();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"${shopName}" <${process.env.GMAIL_USER}>`,
        to: normalizedEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });
      logger.info('Verification email sent via Gmail SMTP', { to: normalizedEmail, messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      logger.error('Nodemailer Gmail SMTP error', { to: normalizedEmail, error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Development Fallback Logger
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`[DEV GMAIL OTP LOG] To: ${normalizedEmail} | OTP Code: ${input.otp}`);
  }
  return { success: true, messageId: `mock-email-${Date.now()}` };
}
