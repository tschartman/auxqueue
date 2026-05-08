import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@auxqueue/shared';

type AuxServer = Server<ClientToServerEvents, ServerToClientEvents>;

let _io: AuxServer | null = null;

export function setIo(io: AuxServer) {
  _io = io;
}

export function getIo(): AuxServer {
  if (!_io) throw new Error('Socket.io not initialized');
  return _io;
}
