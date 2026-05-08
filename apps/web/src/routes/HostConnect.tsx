import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useUserStore } from '../stores/userStore';
import { usePartyStore } from '../stores/partyStore';
import { api } from '../lib/api';

const SERVICES = [
  { id: 'spotify', name: 'Spotify', icon: '🎧', desc: 'Requires Spotify Premium', available: true },
  { id: 'apple', name: 'Apple Music', icon: '🎵', desc: 'Coming soon', available: false },
  { id: 'youtube', name: 'YouTube Music', icon: '▶️', desc: 'Coming soon', available: false },
];

export default function HostConnect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { displayName, avatar, setUser } = useUserStore();
  const { setParty, settings } = usePartyStore();

  const partyName = (location.state as { partyName?: string } | null)?.partyName;

  const [selectedService, setSelectedService] = useState('spotify');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createParty = async (token: string, name: string | undefined, svc: string) => {
    setLoading(true);
    setError('');
    try {
      const savedSettings = sessionStorage.getItem('pending_party_settings');
      const resolvedSettings = savedSettings ? JSON.parse(savedSettings) : settings;

      const partyData = await api.post<{ partyId: string; roomCode: string }>(
        '/api/parties',
        { partyName: name || undefined, streamingService: svc, settings: resolvedSettings },
        { token },
      );

      setParty({
        partyId: partyData.partyId,
        roomCode: partyData.roomCode,
        partyName: name,
        settings: resolvedSettings,
        connectedService: svc,
      });

      sessionStorage.removeItem('pending_party_settings');
      sessionStorage.removeItem('pending_party_name');
      sessionStorage.removeItem('pending_display_name');
      sessionStorage.removeItem('pending_avatar');
      sessionStorage.removeItem('pending_service');

      navigate(`/party/${partyData.partyId}`);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Try again.');
      setLoading(false);
    }
  };

  // Handle redirect back from Spotify OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('accessToken');
    const oauthConnected = params.get('spotifyConnected');
    const oauthError = params.get('error');

    if (oauthError) {
      setError(oauthError === 'spotify_denied' ? 'Spotify connection cancelled.' : 'Spotify connection failed. Try again.');
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (oauthToken && oauthConnected) {
      window.history.replaceState({}, '', window.location.pathname);

      const savedName = sessionStorage.getItem('pending_party_name') ?? undefined;
      const savedDisplayName = sessionStorage.getItem('pending_display_name') ?? displayName;
      const savedAvatar = sessionStorage.getItem('pending_avatar') ?? avatar;
      const savedService = sessionStorage.getItem('pending_service') ?? 'spotify';

      setUser({ displayName: savedDisplayName, avatar: savedAvatar, role: 'host', accessToken: oauthToken });
      createParty(oauthToken, savedName, savedService);
    }
  }, []);

  const handleSpotifyConnect = () => {
    // Save state to sessionStorage before leaving the page
    sessionStorage.setItem('pending_party_name', partyName ?? '');
    sessionStorage.setItem('pending_party_settings', JSON.stringify(settings));
    sessionStorage.setItem('pending_display_name', displayName ?? '');
    sessionStorage.setItem('pending_avatar', avatar ?? '');
    sessionStorage.setItem('pending_service', selectedService);

    window.location.href = `${import.meta.env.VITE_API_URL ?? ''}/api/auth/oauth/spotify`;
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-white/40 hover:text-white transition-colors text-xl">
          ←
        </button>
        <h1 className="font-heading text-lg font-bold text-white">Connect Streaming Service</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-sm mx-auto flex flex-col gap-7">
          <section>
            <p className="text-sm font-semibold text-white/70 mb-3">Streaming Service</p>
            <div className="flex flex-col gap-2">
              {SERVICES.map((svc) => (
                <button
                  key={svc.id}
                  disabled={!svc.available}
                  onClick={() => svc.available && setSelectedService(svc.id)}
                  className={[
                    'flex items-center gap-4 p-4 rounded-2xl border text-left transition-all',
                    !svc.available ? 'opacity-40 cursor-not-allowed border-border bg-surface' : '',
                    svc.available && selectedService === svc.id
                      ? 'border-primary/60 bg-primary/10'
                      : svc.available
                      ? 'border-border bg-surface hover:border-border-strong'
                      : '',
                  ].filter(Boolean).join(' ')}
                >
                  <span className="text-3xl">{svc.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{svc.name}</p>
                    <p className="text-xs text-white/40">{svc.desc}</p>
                  </div>
                  {svc.available ? (
                    <div className={['w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors', selectedService === svc.id ? 'border-primary bg-primary' : 'border-white/20'].join(' ')} />
                  ) : (
                    <span className="text-xs text-white/30 bg-white/5 px-2 py-0.5 rounded-full flex-shrink-0">Soon</span>
                  )}
                </button>
              ))}
            </div>
          </section>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-4">
              <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-sm text-white/60">Creating your party…</p>
            </div>
          )}

          {error && (
            <p className="text-sm text-error text-center">{error}</p>
          )}

          <div className="p-4 rounded-2xl bg-accent-dim border border-accent/20">
            <p className="text-xs text-accent/80 font-medium">
              🔒 Your streaming credentials are never shared with guests.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-t border-border">
        <div className="max-w-sm mx-auto">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={loading}
            onClick={handleSpotifyConnect}
          >
            <span>🎧</span> Continue with Spotify
          </Button>
        </div>
      </div>
    </div>
  );
}
