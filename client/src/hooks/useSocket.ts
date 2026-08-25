import { useEffect } from 'react';
import { useAuthStore } from '../stores/auth';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket, disconnectSocket } from '../lib/socket';

interface OrderEvent {
  orderId: string;
  orderNumber: string;
  userId: string;
  status?: string;
}

/**
 * Establishes a Socket.IO connection for the authenticated user and
 * invalidates relevant queries on domain events.
 */
export function useSocket() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      return;
    }

    const socket = getSocket();
    if (!socket) return;

    const handleOrderStatus = (payload: OrderEvent) => {
      // Invalidate student order queries
      if (!payload.userId || payload.userId === user.id) {
        queryClient.invalidateQueries({ queryKey: ['my-orders'] });
        queryClient.invalidateQueries({ queryKey: ['my-active-order'] });
        queryClient.invalidateQueries({ queryKey: ['order-detail', payload.orderId] });
        queryClient.invalidateQueries({ queryKey: ['order-confirmation', payload.orderId] });
      }

      // Invalidate admin / staff queues
      if (user.role !== 'STUDENT') {
        queryClient.invalidateQueries({ queryKey: ['kitchen-board'] });
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      }
    };

    const handleNotification = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    };

    socket.on('orderStatusChanged', handleOrderStatus);
    socket.on('orderConfirmed', handleOrderStatus);
    socket.on('notification', handleNotification);

    return () => {
      socket.off('orderStatusChanged', handleOrderStatus);
      socket.off('orderConfirmed', handleOrderStatus);
      socket.off('notification', handleNotification);
    };
  }, [user?.id, user?.role, queryClient]);

  return getSocket();
}

