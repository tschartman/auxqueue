import type { Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@auxqueue/shared';
import { verifyToken } from '../middleware/auth';

export function socketAuthMiddleware(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  next: (err?: Error) => void,
) {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next();

  const payload = verifyToken(token);
  if (payload?.type === 'access') {
    socket.data.userId = payload.userId;
    socket.data.role = 'host';
  } else {
    // Treat as guest session token — validated later in party:join
    socket.data.sessionToken = token;
    socket.data.role = 'guest';
  }

  next();
}
