import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Clock, ShoppingBag, CheckCheck } from 'lucide-react';
import { apiGet, apiPost } from '../../api/client';
import { Link } from 'react-router-dom';

interface NotificationItem {
  _id: string;
  title: string;
  body: string;
  type: string;
  data?: { orderId?: string; orderNumber?: string };
  isRead: boolean;
  createdAt: string;
}

export function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiGet<{ notifications: NotificationItem[] }>('/api/notifications').then((d) => d.notifications),
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiPost('/api/notifications/read-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-xs text-slate-500">Live order status alerts and food shop announcements</p>
        </div>
        {data && data.length > 0 && (
          <button
            onClick={() => markAllMutation.mutate()}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-bold bg-blue-50 px-3 py-1.5 rounded-xl transition-colors"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading notifications...</div>
        ) : data && data.length > 0 ? (
          data.map((item) => (
            <div
              key={item._id}
              className={`p-4 flex gap-3 transition-colors ${item.isRead ? 'bg-white' : 'bg-blue-50/40'}`}
            >
              <div className={`p-2.5 rounded-xl h-fit ${item.isRead ? 'bg-slate-100 text-slate-500' : 'bg-blue-600 text-white'}`}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-900">{item.title}</h3>
                  <span className="text-[10px] text-slate-400">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{item.body}</p>
                {item.data?.orderId && (
                  <Link
                    to="/orders"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline pt-1"
                  >
                    <ShoppingBag className="w-3 h-3" /> View Order
                  </Link>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-xs text-slate-400">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No notifications yet
          </div>
        )}
      </div>
    </div>
  );
}
