import { useEffect, useCallback } from 'react';
import type { PlaybackState } from '@auxqueue/shared';
import { getSocket } from '../lib/socket';
import { useUserStore } from '../stores/userStore';
import { useQueueStore } from '../stores/queueStore';
import { usePartyStore } from '../stores/partyStore';
import { useSocketStore } from '../stores/socketStore';
import { toast } from '../components/ui/Toast';
import { api } from '../lib/api';

export function useSocket(
  partyId: string,
  onPlaybackUpdate?: (state: PlaybackState) => void,
  ready = true,
) {
  const { sessionToken, accessToken } = useUserStore();
  const { setSocket, setStatus } = useSocketStore();
  const { setQueue, addItem, reorderItems, removeItem, addPending } = useQueueStore();
  const { updateSettings, addGuest, removeGuest, updateGuestStatus } = usePartyStore();

  const stableOnPlayback = useCallback(
    (state: PlaybackState) => onPlaybackUpdate?.(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!ready) return;
    const token = sessionToken ?? accessToken ?? undefined;
    const socket = getSocket(token);
    setSocket(socket);

    const onConnect = () => {
      setStatus('connected');
      socket.emit('party:join', { partyId, sessionToken: token ?? '' });
    };

    const onDisconnect = () => setStatus('disconnected');

    const onConnectError = async (err: Error) => {
      setStatus('error');
      // If auth failed for a host, try refreshing the access token and reconnecting
      if (err.message?.includes('unauthorized') || err.message?.includes('401')) {
        try {
          const { accessToken: newToken } = await api.post<{ accessToken: string }>('/api/auth/refresh');
          useUserStore.getState().setAccessToken(newToken);
          socket.auth = { token: newToken };
          socket.connect();
        } catch { /* refresh failed, stay disconnected */ }
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    socket.on('queue:state', ({ items, nowPlaying }) => setQueue(items, nowPlaying));
    socket.on('queue:added', ({ item }) => addItem(item));
    socket.on('queue:reordered', ({ items }) => reorderItems(items));
    socket.on('queue:removed', ({ queueItemId }) => removeItem(queueItemId));
    socket.on('queue:pending', ({ item }) => addPending(item));
    socket.on('queue:voted_out', ({ title }) => toast(`"${title}" was voted out`, 'warning'));

    socket.on('guest:joined', ({ guest }) =>
      addGuest({ id: guest.id, partyId, displayName: guest.name, avatar: guest.avatar, status: 'active', joinedAt: new Date().toISOString() }),
    );
    socket.on('guest:left', ({ guestId }) => removeGuest(guestId));
    socket.on('guest:status', ({ guestId, status }) => updateGuestStatus(guestId, status));

    socket.on('party:settings_updated', ({ settings }) => updateSettings(settings));
    socket.on('toast', ({ message, type }) => toast(message, type));

    if (onPlaybackUpdate) {
      socket.on('playback:update', stableOnPlayback);
      socket.on('playback:track_changed', ({ track }) => {
        if (track) toast(`Now playing: ${track.title}`, 'info');
      });
    }

    if (socket.connected) {
      onConnect();
    } else {
      setStatus('connecting');
    }

    return () => {
      socket.emit('party:leave', { partyId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('queue:state');
      socket.off('queue:added');
      socket.off('queue:reordered');
      socket.off('queue:removed');
      socket.off('queue:pending');
      socket.off('queue:voted_out');
      socket.off('guest:joined');
      socket.off('guest:left');
      socket.off('guest:status');
      socket.off('party:settings_updated');
      socket.off('toast');
      if (onPlaybackUpdate) {
        socket.off('playback:update', stableOnPlayback);
        socket.off('playback:track_changed');
      }
    };
  }, [partyId, ready]);
}
