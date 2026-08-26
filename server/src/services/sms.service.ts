import { logger } from '../config/logger';

export interface SendSmsOptions {
  to: string;
  message: string;
  templateId?: string;
}

export async function sendSMS(options: SendSmsOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const provider = (process.env.SMS_PROVIDER || 'mock').toLowerCase();
  const apiKey = process.env.SMS_API_KEY;

  try {
    if (provider === 'fast2sms' && apiKey) {
      // Production Fast2SMS API integration
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          numbers: options.to.replace('+91', ''),
          message: options.message,
        }),
      });
      const data = await response.json() as any;
      if (data.return) {
        logger.info('SMS sent via Fast2SMS', { to: options.to, request_id: data.request_id });
        return { success: true, messageId: data.request_id };
      }
      logger.error('Fast2SMS failed', { error: data });
      return { success: false, error: data.message || 'Fast2SMS error' };
    }

    if (provider === 'twilio' && apiKey && process.env.SMS_SECRET) {
      // Production Twilio SMS integration
      const accountSid = apiKey;
      const authToken = process.env.SMS_SECRET;
      const fromNumber = process.env.SMS_FROM_NUMBER || '+1234567890';
      const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const body = new URLSearchParams({
        To: options.to,
        From: fromNumber,
        Body: options.message,
      });

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
      const data = await response.json() as any;
      if (response.ok) {
        logger.info('SMS sent via Twilio', { to: options.to, sid: data.sid });
        return { success: true, messageId: data.sid };
      }
      return { success: false, error: data.message || 'Twilio SMS error' };
    }

    // Default: Mock SMS logger (for dev / testing)
    logger.info(`[SMS SENT (MOCK)] To: ${options.to} | Message: "${options.message}"`);
    return { success: true, messageId: `mock-${Date.now()}` };
  } catch (error: any) {
    logger.error('SMS sending error', { to: options.to, error: error.message });
    return { success: false, error: error.message };
  }
}
