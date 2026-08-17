import { Notification } from '../models';
import { emit } from '../events';

interface NotifyInput {
  userId: string;
  title: string;
  body: string;
  type?: string;
  data?: Record<string, unknown>;
}

/**
 * Persists an in-app notification and emits a realtime event for Socket.IO delivery.
 * Channel abstraction: swap/extend the body with email/push providers later.
 */
export async function notifyUser(input: NotifyInput): Promise<void> {
  await Notification.create({
    userId: input.userId,
    title: input.title,
    body: input.body,
    type: input.type ?? 'general',
    data: input.data,
  });
  emit('notify', {
    userId: input.userId,
    title: input.title,
    body: input.body,
    type: input.type ?? 'general',
    data: input.data,
  });
}
