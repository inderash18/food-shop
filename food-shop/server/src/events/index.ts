import { EventEmitter } from 'events';

export interface AppEventMap {
  orderCreated: { orderId: string; orderNumber: string; userId: string };
  orderStatusChanged: { orderId: string; orderNumber: string; userId: string; status: string };
  paymentSucceeded: { orderId: string; orderNumber: string; userId: string };
  paymentFailed: { orderId: string; orderNumber: string; userId: string };
  inventoryUpdated: { productId: string; stock: number };
  productAvailabilityChanged: { productId: string; available: boolean };
  notify: { userId: string; title: string; body: string; type: string; data?: Record<string, unknown> };
}

export const appEvents = new EventEmitter();
appEvents.setMaxListeners(100);

export function on<K extends keyof AppEventMap>(event: K, listener: (payload: AppEventMap[K]) => void) {
  appEvents.on(event, listener);
}

export function emit<K extends keyof AppEventMap>(event: K, payload: AppEventMap[K]): void {
  appEvents.emit(event, payload);
}
