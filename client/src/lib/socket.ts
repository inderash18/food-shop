import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../api/client';

let globalSocket: Socket | null = null;

export function getSocket(): Socket | null {
  if (globalSocket) return globalSocket;

  // Vercel serverless functions do not support WebSockets
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return null;
  }

  const token = getAccessToken();
  if (!token) return null;

  globalSocket = io(import.meta.env.VITE_API_URL ?? '', {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 5,
  });

  return globalSocket;
}
