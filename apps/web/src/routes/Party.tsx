import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { QueueItem, GuestSession, PlaybackState, Track } from '@auxqueue/shared';
import { PartyHeader } from '../components/layout/PartyHeader';
import { TabBar } from '../components/layout/TabBar';
import { NowPlaying } from '../components/queue/NowPlaying';
import { QueueList } from '../components/queue/QueueList';
import { SearchBar } from '../components/search/SearchBar';
import { SearchResults } from '../components/search/SearchResults';
import { GuestRow } from '../components/party/GuestRow';
import { ProfileCard } from '../components/party/ProfileCard';
import { ApprovalQueue } from '../components/party/ApprovalQueue';
import { PartySettings } from '../components/party/PartySettings';
import { Modal } from '../components/ui/Modal';
import { ToastContainer, toast } from '../components/ui/Toast';
import { useUserStore } from '../stores/userStore';
import { usePartyStore } from '../stores/partyStore';
import { useQueueStore } from '../stores/queueStore';
import { useSocketStore } from '../stores/socketStore';
import { useSocket } from '../hooks/useSocket';
import { getSocket } from '../lib/socket';
import { api } from '../lib/api';

// ─── Mock data shown while socket connects ─────────────────────────────────

const MOCK_ALBUM = 'https://picsum.photos/seed/';

const MOCK_QUEUE: QueueItem[] = [
  { id: 'q1', partyId: 'demo', trackTitle: 'Espresso', trackArtist: 'Sabrina Carpenter', trackDuration: '2:55', trackUri: 'spotify:track:1', trackAlbumArt: `${MOCK_ALBUM}esp/100/100`, addedByName: 'Alex', addedByAvatar: '🦊', status: 'queued', netScore: 8, upvotes: 9, downvotes: 1, createdAt: new Date().toISOString() },
  { id: 'q2', partyId: 'demo', trackTitle: 'Bad Guy', trackArtist: 'Billie Eilish', trackDuration: '3:14', trackUri: 'spotify:track:2', trackAlbumArt: `${MOCK_ALBUM}bad/100/100`, addedByName: 'Jordan', addedByAvatar: '🌙', status: 'queued', netScore: 5, upvotes: 6, downvotes: 1, createdAt: new Date().toISOString() },
  { id: 'q3', partyId: 'demo', trackTitle: 'Blinding Lights', trackArtist: 'The Weeknd', trackDuration: '3:22', trackUri: 'spotify:track:3', trackAlbumArt: `${MOCK_ALBUM}blind/100/100`, addedByName: 'Sam', addedByAvatar: '🔥', status: 'queued', netScore: 3, upvotes: 4, downvotes: 1, createdAt: new Date().toISOString() },
];

const MOCK_GUESTS: (GuestSession & { songsQueued: number; upvotesReceived: number })[] = [
  { id: 'g1', partyId: 'demo', displayName: 'Alex', avatar: '🦊', status: 'active', joinedAt: new Date().toISOString(), songsQueued: 12, upvotesReceived: 24 },
  { id: 'g2', partyId: 'demo', displayName: 'Jordan', avatar: '🌙', status: 'active', joinedAt: new Date().toISOString(), songsQueued: 7, upvotesReceived: 11 },
  { id: 'g3', partyId: 'demo', displayName: 'Sam', avatar: '🔥', status: 'active', joinedAt: new Date().toISOString(), songsQueued: 28, upvotesReceived: 60 },
];

const MOCK_SEARCH: Track[] = [
  { uri: 'spotify:track:s1', title: 'Flowers', artist: 'Miley Cyrus', album: 'Endless Summer Vacation', durationMs: 200000, albumArtUrl: `${MOCK_ALBUM}flow/100/100`, isExplicit: false },
  { uri: 'spotify:track:s2', title: 'Cruel Summer', artist: 'Taylor Swift', album: 'Lover', durationMs: 178000, albumArtUrl: `${MOCK_ALBUM}cruel/100/100`, isExplicit: false },
  { uri: 'spotify:track:s3', title: 'Watermelon Sugar', artist: 'Harry Styles', album: 'Fine Line', durationMs: 174000, albumArtUrl: `${MOCK_ALBUM}wm/100/100`, isExplicit: false },
];

const MOCK_NOW_PLAYING: PlaybackState = {
  isPlaying: true,
  track: { uri: 'spotify:track:0', title: 'Anti-Hero', artist: 'Taylor Swift', album: 'Midnights', durationMs: 200000, albumArtUrl: `${MOCK_ALBUM}anti/100/100`, isExplicit: false },
  progressMs: 62000,
  durationMs: 200000,
};

// ─── Party Page ────────────────────────────────────────────────────────────

type Tab = 'queue' | 'add' | 'guests' | 'settings' | 'approval';

export default function Party() {
  const navigate = useNavigate();
  const { partyId: partyIdParam } = useParams<{ partyId: string }>();
  const { role, displayName, avatar, accessToken, sessionToken } = useUserStore();
  const { partyId: storePartyId, roomCode, partyName, settings, connectedService, guests: storeGuests, updateSettings } = usePartyStore();
  const { items, pendingApproval, setQueue, addItem, reorderItems, removeItem, addPending, removePending } = useQueueStore();
  const { status: socketStatus } = useSocketStore();

  const partyId = partyIdParam ?? storePartyId ?? '';
  const isHost = role === 'host';
  // Demo mode: no real party in the URL or store yet (landing page preview)
  const isDemoMode = !partyIdParam || partyIdParam === 'demo';

  const [activeTab, setActiveTab] = useState<Tab>('queue');
  const [playback, setPlayback] = useState<PlaybackState>(
    isDemoMode ? MOCK_NOW_PLAYING : { isPlaying: false, track: null, progressMs: 0, durationMs: 0 },
  );
  const [localGuests, setLocalGuests] = useState(isDemoMode ? MOCK_GUESTS : []);
  const [hydrating, setHydrating] = useState(!isDemoMode && !roomCode);
  const pendingItems = pendingApproval;
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [addedUris, setAddedUris] = useState<Set<string>>(new Set());
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<typeof MOCK_GUESTS[0] | null>(null);

  // Seed mock queue only in demo mode
  useEffect(() => {
    if (isDemoMode && items.length === 0) setQueue(MOCK_QUEUE, null);
  }, []);

  // Re-hydrate party state after a page refresh
  useEffect(() => {
    if (isDemoMode || roomCode) return;
    if (!partyId) { navigate('/'); return; }

    (async () => {
      try {
        // 1. Try guest session from sessionStorage first
        const savedGuest = sessionStorage.getItem(`guest_session_${partyId}`);
        if (savedGuest) {
          const g = JSON.parse(savedGuest) as {
            sessionToken: string; displayName: string; avatar: string;
            roomCode: string; partyName: string | null; settings: any; connectedService: string;
          };
          useUserStore.getState().setUser({
            displayName: g.displayName,
            avatar: g.avatar,
            role: 'guest',
            sessionToken: g.sessionToken,
          });
          usePartyStore.getState().setParty({
            partyId,
            roomCode: g.roomCode,
            partyName: g.partyName ?? undefined,
            settings: g.settings,
            connectedService: g.connectedService,
          });
          setHydrating(false);
          return;
        }

        // 2. Try host refresh cookie
        let token: string | undefined;
        try {
          const refreshed = await api.post<{ accessToken: string }>('/api/auth/refresh');
          useUserStore.getState().setAccessToken(refreshed.accessToken);
          token = refreshed.accessToken;
        } catch {
          navigate('/');
          return;
        }

        const party = await api.get<{
          id: string; partyName: string | null; roomCode: string;
          streamingService: string; settings: any;
        }>(`/api/parties/${partyId}/details`, { token });

        usePartyStore.getState().setParty({
          partyId: party.id,
          roomCode: party.roomCode,
          partyName: party.partyName ?? undefined,
          settings: party.settings,
          connectedService: party.streamingService,
        });

        const { setUser, displayName: dn, avatar: av } = useUserStore.getState();
        setUser({ displayName: dn || 'Host', avatar: av, role: 'host', accessToken: token });
      } catch {
        navigate('/');
      } finally {
        setHydrating(false);
      }
    })();
  }, [partyId]);

  // Simulate playback progress tick
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayback((pb) => {
        if (!pb.isPlaying || !pb.track) return pb;
        const next = pb.progressMs + 1000;
        return next >= pb.durationMs ? { ...pb, progressMs: 0 } : { ...pb, progressMs: next };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePlaybackUpdate = useCallback((state: PlaybackState) => setPlayback(state), []);

  // Wire live socket — will replace mock data once server emits queue:state
  useSocket(partyId, handlePlaybackUpdate);

  const handleSearch = async (query: string) => {
    setSearchLoading(true);
    try {
      if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 400));
        setSearchResults(MOCK_SEARCH.filter((t) =>
          !query || t.title.toLowerCase().includes(query.toLowerCase()) || t.artist.toLowerCase().includes(query.toLowerCase())
        ));
      } else {
        const token = accessToken ?? sessionToken ?? undefined;
        const data = await api.get<{ results: Track[] }>(`/api/parties/${partyId}/search?q=${encodeURIComponent(query)}`, { token });
        setSearchResults(data.results);
      }
    } catch {
      setSearchResults(MOCK_SEARCH);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddTrack = async (track: Track) => {
    if (addedUris.has(track.uri)) return;
    setAddedUris((prev) => new Set(prev).add(track.uri));

    if (isDemoMode) {
      const newItem: QueueItem = {
        id: 'new-' + Math.random().toString(36).slice(2),
        partyId,
        trackTitle: track.title,
        trackArtist: track.artist,
        trackDuration: `${Math.floor(track.durationMs / 60000)}:${String(Math.floor((track.durationMs % 60000) / 1000)).padStart(2, '0')}`,
        trackUri: track.uri,
        trackAlbumArt: track.albumArtUrl,
        addedByName: displayName,
        addedByAvatar: avatar,
        status: settings.approvalRequired ? 'pending' : 'queued',
        netScore: 0, upvotes: 0, downvotes: 0,
        createdAt: new Date().toISOString(),
      };
      if (settings.approvalRequired) {
        addPending(newItem);
        toast('Song sent for host approval', 'info');
      } else {
        addItem(newItem);
        toast(`"${track.title}" added`, 'success');
      }
      return;
    }

    try {
      const token = accessToken ?? sessionToken ?? undefined;
      const result = await api.post<{ queueItemId: string; status: string }>(
        `/api/parties/${partyId}/queue`,
        {
          trackUri: track.uri,
          trackTitle: track.title,
          trackArtist: track.artist,
          trackDuration: `${Math.floor(track.durationMs / 60000)}:${String(Math.floor((track.durationMs % 60000) / 1000)).padStart(2, '0')}`,
          trackAlbumArt: track.albumArtUrl,
        },
        { token },
      );
      if (result.status === 'pending') {
        toast('Song sent for host approval', 'info');
      } else {
        toast(`"${track.title}" added`, 'success');
      }
    } catch (err: any) {
      setAddedUris((prev) => { const s = new Set(prev); s.delete(track.uri); return s; });
      toast(err.message ?? 'Failed to add song', 'error');
    }
  };

  const handleVote = async (itemId: string, direction: 1 | -1 | 0) => {
    // Optimistic update
    const updated = items.map((item) => {
      if (item.id !== itemId) return item;
      const delta = direction - (item.myVote ?? 0);
      return { ...item, myVote: direction as 0 | 1 | -1, netScore: item.netScore + delta };
    });
    const sorted = settings.queueMode === 'vote'
      ? [...updated].sort((a, b) => b.netScore - a.netScore)
      : updated;
    reorderItems(sorted);

    if (!isDemoMode) {
      try {
        const token = accessToken ?? sessionToken ?? undefined;
        await api.post(`/api/parties/${partyId}/queue/${itemId}/vote`, { direction }, { token });
      } catch {
        // server will broadcast reordered queue on success; ignore failure silently
      }
    }
  };

  const handleRemove = async (itemId: string) => {
    removeItem(itemId);
    toast('Removed from queue', 'info');

    if (!isDemoMode) {
      try {
        const token = accessToken ?? sessionToken ?? undefined;
        await api.delete(`/api/parties/${partyId}/queue/${itemId}`, { token });
      } catch {
        // socket event will reconcile if this fails
      }
    }
  };

  const handleApprove = async (itemId: string) => {
    const item = pendingItems.find((i) => i.id === itemId);
    if (!item) return;
    removePending(itemId);
    addItem({ ...item, status: 'queued' });
    toast(`"${item.trackTitle}" approved`, 'success');

    if (!isDemoMode) {
      try {
        const { getSocket } = await import('../lib/socket');
        getSocket().emit('queue:approve', { queueItemId: itemId });
      } catch { /* no-op */ }
    }
  };

  const handleReject = async (itemId: string) => {
    const item = pendingItems.find((i) => i.id === itemId);
    removePending(itemId);
    if (item) toast(`"${item.trackTitle}" rejected`, 'info');

    if (!isDemoMode) {
      try {
        const { getSocket } = await import('../lib/socket');
        getSocket().emit('queue:reject', { queueItemId: itemId });
      } catch { /* no-op */ }
    }
  };

  const handleGuestAction = (guestId: string, action: 'mute' | 'unmute' | 'kick' | 'ban') => {
    const map = { mute: 'muted', unmute: 'active', kick: 'kicked', ban: 'banned' } as const;
    setLocalGuests((prev) => prev.map((g) => g.id === guestId ? { ...g, status: map[action] } : g));
    toast(`Guest ${action}ed`, 'info');
    setSelectedGuest(null);
  };

  if (!partyId) { navigate('/'); return null; }

  if (hydrating) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-white/40">Loading party…</p>
        </div>
      </div>
    );
  }

  const displayGuests = storeGuests.length > 0
    ? storeGuests.map((g) => ({ ...g, songsQueued: 0, upvotesReceived: 0 }))
    : localGuests;

  const activeGuestCount = displayGuests.filter((g) => g.status === 'active').length;

  return (
    <div className="min-h-screen bg-bg flex flex-col font-body">
      <ToastContainer />

      {/* Connection status indicator */}
      {socketStatus === 'connecting' && (
        <div className="h-0.5 bg-gradient-primary animate-pulse" />
      )}
      {socketStatus === 'error' && (
        <div className="bg-error-dim border-b border-error/20 px-4 py-2 text-xs text-error text-center">
          Connection lost — reconnecting…
        </div>
      )}

      <PartyHeader
        partyName={partyName || 'Party'}
        roomCode={roomCode ?? 'AUX-????'}
        guestCount={activeGuestCount}
        service={connectedService ?? 'spotify'}
      />

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-lg mx-auto px-4 py-4">

          {activeTab === 'queue' && (
            <div className="flex flex-col gap-4">
              <NowPlaying
                playback={playback}
                isHost={isHost}
                onPlay={() => {
                  setPlayback((pb) => ({ ...pb, isPlaying: true }));
                  if (!isDemoMode) getSocket().emit('playback:play');
                }}
                onPause={() => {
                  setPlayback((pb) => ({ ...pb, isPlaying: false }));
                  if (!isDemoMode) getSocket().emit('playback:pause');
                }}
                onSkip={() => {
                  if (!isDemoMode) getSocket().emit('playback:skip');
                  else toast('Skipped', 'info');
                }}
              />
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-sm font-semibold text-white/70 uppercase tracking-wide">
                  Up Next — {items.length}
                </h2>
                {settings.queueMode === 'vote' && (
                  <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full">🗳️ Vote Mode</span>
                )}
              </div>
              <QueueList
                items={items}
                showVotes={settings.queueMode === 'vote'}
                isHost={isHost}
                onVote={handleVote}
                onRemove={isHost ? handleRemove : undefined}
              />
            </div>
          )}

          {activeTab === 'add' && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="font-heading text-base font-bold text-white mb-1">Add a Song</h2>
                <p className="text-xs text-white/40">
                  Search {connectedService === 'spotify' ? 'Spotify' : 'the library'}
                </p>
              </div>
              <SearchBar onSearch={handleSearch} loading={searchLoading} />
              {searchResults.length === 0 && !searchLoading && (
                <div className="flex flex-col items-center py-8 text-center">
                  <span className="text-3xl mb-2">🔍</span>
                  <p className="text-sm text-white/40">Search for a song to add it</p>
                </div>
              )}
              <SearchResults results={searchResults} onAdd={handleAddTrack} addedIds={addedUris} />
            </div>
          )}

          {activeTab === 'guests' && (
            <div className="flex flex-col gap-3">
              <h2 className="font-heading text-base font-bold text-white">
                Guests ({activeGuestCount} active)
              </h2>
              {displayGuests.map((guest) => (
                <GuestRow
                  key={guest.id}
                  guest={guest}
                  isHost={isHost}
                  onClick={() => setSelectedGuest(guest as any)}
                  onMute={() => handleGuestAction(guest.id, 'mute')}
                  onUnmute={() => handleGuestAction(guest.id, 'unmute')}
                  onKick={() => handleGuestAction(guest.id, 'kick')}
                  onBan={() => handleGuestAction(guest.id, 'ban')}
                />
              ))}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex flex-col gap-4">
              <h2 className="font-heading text-base font-bold text-white">Party Settings</h2>
              <PartySettings settings={settings} isHost={isHost} onChange={updateSettings} />
              {isHost && (
                <div className="mt-4 pt-4 border-t border-border">
                  <button
                    onClick={async () => {
                      try {
                        await api.delete(`/api/parties/${partyId}`, { token: accessToken ?? undefined });
                      } catch { /* best-effort */ }
                      sessionStorage.removeItem(`guest_session_${partyId}`);
                      usePartyStore.getState().clear();
                      useQueueStore.getState().clear();
                      navigate('/');
                    }}
                    className="text-sm text-error/70 hover:text-error transition-colors"
                  >
                    End Party
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'approval' && isHost && (
            <div className="flex flex-col gap-4">
              <h2 className="font-heading text-base font-bold text-white">Song Approval</h2>
              <ApprovalQueue items={pendingItems} onApprove={handleApprove} onReject={handleReject} />
            </div>
          )}

        </div>
      </div>

      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isHost={isHost}
        pendingCount={pendingItems.length}
      />

      <Modal open={!!selectedGuest} onClose={() => setSelectedGuest(null)} title="Guest Profile">
        {selectedGuest && (
          <ProfileCard
            guest={selectedGuest}
            isHost={isHost}
            onClose={() => setSelectedGuest(null)}
            onKick={() => handleGuestAction(selectedGuest.id, 'kick')}
            onBan={() => handleGuestAction(selectedGuest.id, 'ban')}
          />
        )}
      </Modal>
    </div>
  );
}
