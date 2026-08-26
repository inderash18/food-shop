import { Notification, User } from '../models';
import { emit } from '../events';
import { sendSMS } from './sms.service';
import { logger } from '../config/logger';

interface NotifyInput {
  userId: string;
  title: string;
  body: string;
  type?: string;
  channel?: 'SMS' | 'EMAIL' | 'IN_APP';
  data?: Record<string, unknown>;
}

export async function notifyUser(input: NotifyInput): Promise<void> {
  try {
    const notification = await Notification.create({
      userId: input.userId,
      title: input.title,
      body: input.body,
      type: input.type ?? 'general',
      channel: input.channel ?? 'IN_APP',
      status: 'SENT',
      data: input.data,
    });

    emit('notify', {
      userId: input.userId,
      title: input.title,
      body: input.body,
      type: input.type ?? 'general',
      data: input.data,
    });

    // If SMS channel requested or for critical order events, attempt SMS dispatch
    if (input.channel === 'SMS') {
      dispatchSmsNotification(input.userId, input.body, notification._id.toString()).catch((err) => {
        logger.error('Background SMS dispatch failed', { error: err.message, userId: input.userId });
      });
    }
  } catch (err: any) {
    logger.error('Failed to persist notification', { error: err.message, userId: input.userId });
  }
}

async function dispatchSmsNotification(userId: string, message: string, notificationId: string): Promise<void> {
  try {
    const user = await User.findById(userId).lean();
    const phone = user?.mobileNumber || user?.phone;
    if (phone) {
      const res = await sendSMS({ to: phone, message });
      if (!res.success) {
        await Notification.updateOne({ _id: notificationId }, { $set: { status: 'FAILED', errorDetails: res.error } });
      }
    }
  } catch (err: any) {
    await Notification.updateOne({ _id: notificationId }, { $set: { status: 'FAILED', errorDetails: err.message } });
  }
}

export async function sendOrderConfirmation(order: { _id: any; userId: any; orderNumber: string; total: number }): Promise<void> {
  const userId = String(order.userId);
  const message = `Your order #${order.orderNumber} has been confirmed. Amount: ₹${order.total}`;
  await notifyUser({
    userId,
    title: 'Order Confirmed',
    body: message,
    type: 'ORDER_CONFIRMED',
    channel: 'SMS',
    data: { orderId: String(order._id), orderNumber: order.orderNumber, total: order.total },
  });
}

export async function sendOrderPreparing(order: { _id: any; userId: any; orderNumber: string }): Promise<void> {
  const userId = String(order.userId);
  const message = `Your order #${order.orderNumber} is being prepared.`;
  await notifyUser({
    userId,
    title: 'Order Preparing',
    body: message,
    type: 'PREPARING',
    channel: 'SMS',
    data: { orderId: String(order._id), orderNumber: order.orderNumber },
  });
}

export async function sendOrderReady(order: { _id: any; userId: any; orderNumber: string; tokenNumber: string }): Promise<void> {
  const userId = String(order.userId);
  const message = `Your order #${order.orderNumber} (Token #${order.tokenNumber}) is ready for pickup!`;
  await notifyUser({
    userId,
    title: 'Order Ready',
    body: message,
    type: 'READY',
    channel: 'SMS',
    data: { orderId: String(order._id), orderNumber: order.orderNumber, tokenNumber: order.tokenNumber },
  });
}

export async function sendOrderCompleted(order: { _id: any; userId: any; orderNumber: string }): Promise<void> {
  const userId = String(order.userId);
  const message = `Your order #${order.orderNumber} has been completed. Thank you!`;
  await notifyUser({
    userId,
    title: 'Order Completed',
    body: message,
    type: 'COMPLETED',
    channel: 'SMS',
    data: { orderId: String(order._id), orderNumber: order.orderNumber },
  });
}

export async function sendPaymentFailure(order: { _id: any; userId: any; orderNumber: string }): Promise<void> {
  const userId = String(order.userId);
  const message = `Payment for order #${order.orderNumber} was unsuccessful. Your order was not confirmed.`;
  await notifyUser({
    userId,
    title: 'Payment Failed',
    body: message,
    type: 'PAYMENT_FAILED',
    channel: 'SMS',
    data: { orderId: String(order._id), orderNumber: order.orderNumber },
  });
}
