import { create } from 'zustand';
import type { Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@auxqueue/shared';

type AuxSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface SocketStore {
  socket: AuxSocket | null;
  status: ConnectionStatus;
  setSocket: (socket: AuxSocket) => void;
  setStatus: (status: ConnectionStatus) => void;
  clear: () => void;
}

export const useSocketStore = create<SocketStore>((set) => ({
  socket: null,
  status: 'disconnected',

  setSocket: (socket) => set({ socket }),
  setStatus: (status) => set({ status }),
  clear: () => set({ socket: null, status: 'disconnected' }),
}));
