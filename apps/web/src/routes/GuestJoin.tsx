import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PartySettings } from '@auxqueue/shared';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AvatarPicker } from '../components/avatars/AvatarPicker';
import { useUserStore } from '../stores/userStore';
import { usePartyStore } from '../stores/partyStore';
import { api } from '../lib/api';

interface PartyInfo {
  partyId: string;
  partyName: string | null;
  roomCode: string;
  streamingService: string;
  queueMode: string;
}

export default function GuestJoin() {
  const navigate = useNavigate();
  const { code: codeParam } = useParams<{ code?: string }>();
  const { setUser, avatar, setAvatar } = useUserStore();
  const { setParty } = usePartyStore();

  const [roomCode, setRoomCode] = useState(codeParam ?? '');
  const [displayName, setDisplayName] = useState('');
  const [partyInfo, setPartyInfo] = useState<PartyInfo | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  const formatCode = (raw: string) => {
    const upper = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (upper.startsWith('AUX')) {
      const digits = upper.slice(3);
      return `AUX-${digits}`.slice(0, 8);
    }
    return upper.length <= 4 ? `AUX-${upper}`.slice(0, 8) : upper.slice(0, 8);
  };

  const lookupParty = useCallback(async (code: string) => {
    if (code.length < 8) { setPartyInfo(null); return; }
    setLookupLoading(true);
    setLookupError('');
    try {
      const data = await api.get<PartyInfo>(`/api/parties/${code}`);
      setPartyInfo(data);
    } catch {
      setPartyInfo(null);
      setLookupError('Party not found. Double-check the code.');
    } finally {
      setLookupLoading(false);
    }
  }, []);

  // Auto-lookup when a full code is entered
  useEffect(() => {
    if (roomCode.length === 8) lookupParty(roomCode);
    else setPartyInfo(null);
  }, [roomCode, lookupParty]);

  // Auto-lookup on mount if code is in URL
  useEffect(() => {
    if (codeParam && codeParam.length === 8) lookupParty(codeParam);
  }, [codeParam, lookupParty]);

  const handleJoin = async () => {
    if (!partyInfo || !displayName.trim()) return;
    setJoinError('');
    setJoining(true);

    try {
      const data = await api.post<{
        sessionId: string;
        sessionToken: string;
        partyId: string;
        partyName: string | null;
        roomCode: string;
        settings: PartySettings;
      }>(`/api/parties/${partyInfo.partyId}/join`, {
        displayName: displayName.trim(),
        avatar,
      });

      setUser({
        displayName: displayName.trim(),
        avatar,
        role: 'guest',
        sessionToken: data.sessionToken,
      });

      setParty({
        partyId: data.partyId,
        roomCode: data.roomCode,
        partyName: data.partyName ?? undefined,
        settings: data.settings,
        connectedService: partyInfo.streamingService,
      });

      // Persist guest session so page refresh doesn't kick them out
      sessionStorage.setItem(
        `guest_session_${data.partyId}`,
        JSON.stringify({
          sessionToken: data.sessionToken,
          displayName: displayName.trim(),
          avatar,
          roomCode: data.roomCode,
          partyName: data.partyName,
          settings: data.settings,
          connectedService: partyInfo.streamingService,
        }),
      );

      navigate(`/party/${data.partyId}`);
    } catch (err: any) {
      setJoinError(err.message ?? 'Could not join. Try again.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-white/40 hover:text-white transition-colors text-xl">
          ←
        </button>
        <h1 className="font-heading text-lg font-bold text-white">Join a Party</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-sm mx-auto flex flex-col gap-7 relative z-10">
          {/* Room code */}
          <section>
            <Input
              label="Room Code"
              placeholder="AUX-XXXX"
              value={roomCode}
              onChange={(e) => setRoomCode(formatCode(e.target.value))}
              error={lookupError}
              className="text-center text-lg font-mono tracking-widest"
              maxLength={8}
            />
            {lookupLoading && (
              <p className="text-xs text-white/40 text-center mt-2">Looking up party…</p>
            )}
            {partyInfo && (
              <div className="mt-3 p-3 rounded-xl bg-success-dim border border-success/30 flex items-center gap-2">
                <span className="text-success text-lg">✓</span>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {partyInfo.partyName || 'Party found'}
                  </p>
                  <p className="text-xs text-white/50 capitalize">
                    {partyInfo.queueMode} queue · {partyInfo.streamingService}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Identity — only shown once party is found */}
          {partyInfo && (
            <section>
              <Input
                label="Your Name"
                placeholder="What should we call you?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                className="mb-4"
              />
              <p className="text-sm font-medium text-white/70 mb-3">Pick your vibe</p>
              <AvatarPicker selected={avatar} onSelect={setAvatar} />
              {joinError && <p className="text-xs text-error mt-3">{joinError}</p>}
            </section>
          )}

          {!partyInfo && !lookupLoading && !lookupError && (
            <p className="text-xs text-white/30 text-center">
              Ask the host for the code displayed on their screen
            </p>
          )}
        </div>
      </div>

      <div className="px-4 py-4 border-t border-border">
        <div className="max-w-sm mx-auto">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!partyInfo || !displayName.trim() || joining}
            onClick={handleJoin}
          >
            {joining ? 'Joining…' : '🎉 Join Party'}
          </Button>
        </div>
      </div>
    </div>
  );
}
