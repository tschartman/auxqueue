import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@auxqueue/shared';

type AuxSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AuxSocket | null = null;

export function getSocket(sessionToken?: string): AuxSocket {
  if (socket?.connected) return socket;

  const wsUrl = import.meta.env.VITE_WS_URL ?? '';

  socket = io(wsUrl, {
    auth: sessionToken ? { token: sessionToken } : undefined,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: Infinity,
  }) as AuxSocket;

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
