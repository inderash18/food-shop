import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth';
import { useQueryClient } from '@tanstack/react-query';
import { getAccessToken } from '../api/client';

interface OrderEvent {
  orderId: string;
  orderNumber: string;
  userId: string;
  status?: string;
}

/**
 * Establishes a Socket.IO connection for the authenticated user and
 * invalidates relevant queries on domain events. No-op for guests.
 */
export function useSocket() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Vercel serverless functions do not support WebSockets
    if (!user || (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'))) {
      return;
    }

    const socket = io(import.meta.env.VITE_API_URL ?? '', {
      auth: { token: getAccessToken() },
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('orderStatusChanged', (payload: OrderEvent) => {
      if (payload.userId === user.id) {
        queryClient.invalidateQueries({ queryKey: ['orders', 'mine'] });
        queryClient.invalidateQueries({ queryKey: ['order', payload.orderId] });
      }
    });

    socket.on('notification', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id, queryClient]);

  return socketRef.current;
}
