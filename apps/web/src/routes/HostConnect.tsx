import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useUserStore } from '../stores/userStore';
import { usePartyStore } from '../stores/partyStore';
import { api } from '../lib/api';

const SERVICES = [
  { id: 'spotify', name: 'Spotify', icon: '🎧', desc: 'Requires Spotify Premium', available: true },
  { id: 'apple', name: 'Apple Music', icon: '🎵', desc: 'Coming soon', available: false },
  { id: 'youtube', name: 'YouTube Music', icon: '▶️', desc: 'Coming soon', available: false },
];

type AuthMode = 'register' | 'login';

export default function HostConnect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { displayName, avatar, setUser } = useUserStore();
  const { setParty, settings } = usePartyStore();

  const partyName = (location.state as { partyName?: string } | null)?.partyName;

  const [selectedService, setSelectedService] = useState('spotify');
  const [authMode, setAuthMode] = useState<AuthMode>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [spotifyConnected, setSpotifyConnected] = useState(false);

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
      setUser({ ...{ displayName, avatar, role: 'host' }, accessToken: oauthToken });
      setSpotifyConnected(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleCreate = async () => {
    const { accessToken: storedToken } = useUserStore.getState();
    const canCreateDirectly = spotifyConnected && storedToken;

    if (!canCreateDirectly && (!email.trim() || password.length < 8)) return;
    setError('');
    setLoading(true);

    try {
      let hostToken = storedToken;

      if (!canCreateDirectly) {
        // Step 1: register or login via email/password
        const authEndpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
        const authPayload =
          authMode === 'register'
            ? { email: email.trim(), password, displayName, avatar }
            : { email: email.trim(), password };

        let authData: { accessToken: string; user: { id: string } };
        try {
          authData = await api.post<typeof authData>(authEndpoint, authPayload);
        } catch (err: any) {
          if (authMode === 'register' && err.message?.includes('already registered')) {
            setError('That email is already registered. Switch to "Log in" below.');
            setLoading(false);
            return;
          }
          throw err;
        }

        setUser({
          userId: authData.user.id,
          displayName,
          avatar,
          role: 'host',
          accessToken: authData.accessToken,
        });
        hostToken = authData.accessToken;
      }

      // Create the party
      const partyData = await api.post<{ partyId: string; roomCode: string }>(
        '/api/parties',
        {
          partyName: partyName || undefined,
          streamingService: selectedService,
          settings,
        },
        { token: hostToken ?? undefined },
      );

      setParty({
        partyId: partyData.partyId,
        roomCode: partyData.roomCode,
        partyName: partyName,
        settings,
        connectedService: selectedService,
      });

      navigate(`/party/${partyData.partyId}`);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-white/40 hover:text-white transition-colors text-xl">
          ←
        </button>
        <h1 className="font-heading text-lg font-bold text-white">Connect & Create Party</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-sm mx-auto flex flex-col gap-7">
          {/* Service selection */}
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

          {/* Auth section */}
          <section className="glass rounded-2xl p-5 border border-border flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-white mb-0.5">
                {authMode === 'register' ? 'Create your host account' : 'Log in to your account'}
              </p>
              <p className="text-xs text-white/40">
                Your account saves your party history and tier progress.
              </p>
            </div>

            {selectedService === 'spotify' && !spotifyConnected && (
              <>
                <a
                  href={`${import.meta.env.VITE_API_URL ?? ''}/api/auth/oauth/spotify`}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold text-sm transition-colors"
                >
                  <span>🎧</span> Continue with Spotify
                </a>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-white/30">or use email</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              </>
            )}

            {spotifyConnected && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30">
                <span className="text-green-400 text-sm">✓</span>
                <p className="text-xs text-green-400 font-medium">Spotify connected</p>
              </div>
            )}

            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder={authMode === 'register' ? 'Password (8+ characters)' : 'Password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
            />

            {error && <p className="text-xs text-error">{error}</p>}

            <button
              onClick={() => { setAuthMode(authMode === 'register' ? 'login' : 'register'); setError(''); }}
              className="text-xs text-white/40 hover:text-white/70 transition-colors text-left"
            >
              {authMode === 'register'
                ? 'Already have an account? Log in →'
                : "Don't have an account? Register →"}
            </button>
          </section>

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
            disabled={(!spotifyConnected && (!email.trim() || password.length < 8)) || loading}
            onClick={handleCreate}
          >
            {loading ? 'Creating party…' : '🎉 Create Party'}
          </Button>
        </div>
      </div>
    </div>
  );
}
