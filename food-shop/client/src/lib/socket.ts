import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../api/client';

let globalSocket: Socket | null = null;

export function getSocket(): Socket | null {
  if (globalSocket) return globalSocket;

  const token = getAccessToken();
  if (!token) return null;

  globalSocket = io(import.meta.env.VITE_API_URL ?? '', {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 5,
  });

  return globalSocket;
}
