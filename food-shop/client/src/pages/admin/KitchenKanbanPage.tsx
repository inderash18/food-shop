import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChefHat, Clock, CheckCircle2, Flame, RefreshCw, Volume2 } from 'lucide-react';
import { adminApi } from '../../api/admin';
import type { Order } from '../../lib/types';
import { getSocket } from '../../lib/socket';

export function KitchenKanbanPage() {
  const queryClient = useQueryClient();

  const { data: board, isLoading, refetch } = useQuery({
    queryKey: ['kitchen-board'],
    queryFn: adminApi.kitchenBoard,
    refetchInterval: 10_000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      adminApi.updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-board'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
    },
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit('joinRoom', 'kitchen');

    const handleOrderEvent = () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-board'] });
    };

    socket.on('orderStatusChanged', handleOrderEvent);
    socket.on('orderConfirmed', handleOrderEvent);

    return () => {
      socket.off('orderStatusChanged', handleOrderEvent);
      socket.off('orderConfirmed', handleOrderEvent);
      socket.emit('leaveRoom', 'kitchen');
    };
  }, [queryClient]);

  const renderOrderCard = (order: Order, currentColumn: 'NEW' | 'PREPARING' | 'READY') => {
    const isPendingAction = updateStatusMutation.isPending;

    return (
      <div
        key={order._id}
        className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3 hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <span className="font-mono font-extrabold text-sm text-blue-700">{order.orderNumber}</span>
            <p className="text-xs text-slate-500 font-medium">{order.userId?.name || 'Student'}</p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
            ₹{order.total}
          </span>
        </div>

        {/* Order Items */}
        <div className="space-y-1.5 text-xs text-slate-800">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between items-center font-medium">
              <span className="truncate pr-2">
                <span className="font-bold text-blue-600 mr-1.5">{item.quantity}×</span>
                {item.productNameSnapshot}
              </span>
              <span className="text-slate-400 font-mono">₹{item.priceSnapshot * item.quantity}</span>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="pt-1">
          {currentColumn === 'NEW' && (
            <button
              disabled={isPendingAction}
              onClick={() => updateStatusMutation.mutate({ orderId: order._id, status: 'PREPARING' })}
              className="w-full flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white py-2 px-3 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
            >
              <Flame className="w-3.5 h-3.5" />
              START PREPARING
            </button>
          )}

          {currentColumn === 'PREPARING' && (
            <button
              disabled={isPendingAction}
              onClick={() => updateStatusMutation.mutate({ orderId: order._id, status: 'READY' })}
              className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              MARK READY
            </button>
          )}

          {currentColumn === 'READY' && (
            <button
              disabled={isPendingAction}
              onClick={() => updateStatusMutation.mutate({ orderId: order._id, status: 'COMPLETED' })}
              className="w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white py-2 px-3 rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
            >
              COMPLETE ORDER
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Kitchen Display System (KDS)</h1>
            <p className="text-xs text-slate-500">Live operational order queue for food preparation staff</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh Board"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Kanban Board Columns */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
          Loading Kitchen Board...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: NEW CONFIRMED ORDERS */}
          <div className="bg-slate-100/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <span className="font-bold text-sm text-slate-700 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                NEW CONFIRMED
              </span>
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
                {board?.NEW?.length ?? 0}
              </span>
            </div>
            <div className="space-y-3">
              {board?.NEW && board.NEW.length > 0 ? (
                board.NEW.map((order) => renderOrderCard(order, 'NEW'))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No new orders
                </div>
              )}
            </div>
          </div>

          {/* Column 2: PREPARING */}
          <div className="bg-slate-100/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <span className="font-bold text-sm text-slate-700 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                PREPARING
              </span>
              <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">
                {board?.PREPARING?.length ?? 0}
              </span>
            </div>
            <div className="space-y-3">
              {board?.PREPARING && board.PREPARING.length > 0 ? (
                board.PREPARING.map((order) => renderOrderCard(order, 'PREPARING'))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No items being prepared
                </div>
              )}
            </div>
          </div>

          {/* Column 3: READY FOR PICKUP */}
          <div className="bg-slate-100/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <span className="font-bold text-sm text-slate-700 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                READY FOR PICKUP
              </span>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full">
                {board?.READY?.length ?? 0}
              </span>
            </div>
            <div className="space-y-3">
              {board?.READY && board.READY.length > 0 ? (
                board.READY.map((order) => renderOrderCard(order, 'READY'))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  No orders ready for pickup
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
