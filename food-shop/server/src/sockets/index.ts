import { Server as SocketServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { verifyAccessToken } from '../utils/jwt';
import { env } from '../config/env';
import { on, emit } from '../events';
import { logger } from '../config/logger';

interface SocketUser {
  socketId: string;
  userId: string;
}

const connected = new Map<string, string>();
let io: SocketServer | null = null;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const payload = verifyAccessToken(token as string);
      (socket as unknown as { userId: string }).userId = payload.sub;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = (socket as unknown as { userId: string }).userId;
    connected.set(userId, socket.id);
    socket.join(`user:${userId}`);
    logger.debug('Socket connected', { userId, socketId: socket.id });

    socket.on('disconnect', () => {
      if (connected.get(userId) === socket.id) connected.delete(userId);
      logger.debug('Socket disconnected', { userId, socketId: socket.id });
    });
  });

  // Forward domain events to connected clients
  on('notify', (payload) => {
    io?.to(`user:${payload.userId}`).emit('notification', payload);
  });
  on('orderStatusChanged', (payload) => {
    io?.to(`user:${payload.userId}`).emit('orderStatusChanged', payload);
    io?.emit('orderBoardUpdated', payload);
  });
  on('orderCreated', (payload) => {
    io?.emit('orderBoardUpdated', payload);
  });
  on('inventoryUpdated', (payload) => {
    io?.emit('inventoryUpdated', payload);
  });

  return io;
}

export function getIo(): SocketServer | null {
  return io;
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  io?.to(`user:${userId}`).emit(event, data);
}

export function emitBroadcast(event: string, data: unknown): void {
  io?.emit(event, data);
}

export { emit };
