import { apiGet, apiPost, apiPatch } from './client';
import type { EventItem, Booking } from '../lib/types';

export interface HoldSeatsPayload {
  eventId: string;
  date: string;
  timeSlot: string;
  seatNumbers: string[];
}

export interface BookingCheckoutPayload {
  eventId: string;
  bookingDate: string;
  timeSlot: string;
  seatNumbers: string[];
  preOrderItems?: Array<{ productId: string; quantity: number }>;
  notes?: string;
  checkoutRequestId?: string;
}

export interface BookingCheckoutResponse {
  success: boolean;
  order: Booking;
  booking: Booking;
  paymentIntent: {
    paymentId: string;
    provider: string;
    amount: number;
    providerPaymentId?: string;
    metadata?: any;
  };
}

export const bookingApi = {
  getEvents: () => apiGet<{ success: boolean; events: EventItem[] }>('/api/events'),

  getEventById: (id: string) => apiGet<{ success: boolean; event: EventItem }>(`/api/events/${id}`),

  getOccupiedSeats: (eventId: string, date: string, timeSlot: string) =>
    apiGet<{ success: boolean; booked: string[]; held: string[] }>(
      `/api/events/${eventId}/seats?date=${encodeURIComponent(date)}&timeSlot=${encodeURIComponent(timeSlot)}`
    ),

  holdSeats: (payload: HoldSeatsPayload) =>
    apiPost<{ success: boolean; expiresAt: number }>('/api/bookings/hold', payload),

  createBooking: (payload: BookingCheckoutPayload) =>
    apiPost<BookingCheckoutResponse>('/api/bookings/checkout', payload),

  getMyBookings: () => apiGet<{ success: boolean; bookings: Booking[] }>('/api/bookings/mine'),

  getBookingById: (id: string) => apiGet<{ success: boolean; booking: Booking }>(`/api/bookings/${id}`),

  staffCheckIn: (qrDataOrBookingNumber: string) =>
    apiPost<{ success: boolean; alreadyCheckedIn: boolean; booking: Booking; message: string }>(
      '/api/bookings/check-in',
      { qrData: qrDataOrBookingNumber }
    ),

  updatePrepStatus: (bookingId: string, prepStatus: 'CONFIRMED' | 'PREPARING' | 'READY_FOR_COLLECTION' | 'COLLECTED') =>
    apiPatch<{ success: boolean; booking: Booking }>(`/api/bookings/${bookingId}/prep-status`, { prepStatus }),
};
