import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PartySettings } from '@auxqueue/shared';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Toggle } from '../components/ui/Toggle';
import { AvatarPicker } from '../components/avatars/AvatarPicker';
import { useUserStore } from '../stores/userStore';
import { usePartyStore } from '../stores/partyStore';

const ADJECTIVES = [
  'Cosmic', 'Electric', 'Midnight', 'Neon', 'Golden', 'Velvet', 'Solar', 'Lunar',
  'Blazing', 'Funky', 'Groovy', 'Wild', 'Infinite', 'Stellar', 'Radiant', 'Hypnotic',
  'Euphoric', 'Mystic', 'Thunderous', 'Vibrant', 'Psychedelic', 'Ethereal', 'Savage',
];

const NOUNS = [
  'Groove', 'Beats', 'Vibes', 'Jam', 'Bash', 'Wave', 'Fiesta', 'Disco', 'Rave',
  'Session', 'Gala', 'Mixer', 'Banger', 'Shindig', 'Frenzy', 'Surge', 'Odyssey',
];

function generatePartyName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}

const QUEUE_MODE_OPTIONS = [
  {
    value: 'vote' as const,
    label: '🗳️ Vote Mode',
    desc: 'Songs sorted by upvotes. Bad ones voted out.',
  },
  {
    value: 'open' as const,
    label: '📋 Open Queue',
    desc: 'First in, first out. Fair and simple.',
  },
  {
    value: 'host' as const,
    label: '👑 Host Control',
    desc: 'You decide the order. You run the show.',
  },
];

export default function HostSetup() {
  const navigate = useNavigate();
  const { setUser, avatar, setAvatar } = useUserStore();
  const { updateSettings } = usePartyStore();

  const [partyName, setPartyName] = useState(() => generatePartyName());
  const [displayName, setDisplayName] = useState('');
  const [queueMode, setQueueMode] = useState<PartySettings['queueMode']>('vote');
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [explicitFilter, setExplicitFilter] = useState(false);
  const [maxPerGuest, setMaxPerGuest] = useState(5);
  const [voteOutThreshold, setVoteOutThreshold] = useState(-3);
  const [lockOnDeck, setLockOnDeck] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleContinue = () => {
    if (!displayName.trim()) return;

    setUser({ displayName: displayName.trim(), avatar, role: 'host' });
    updateSettings({
      queueMode,
      approvalRequired,
      explicitFilter,
      maxPerGuest,
      voteOutThreshold,
      lockOnDeck,
    });

    navigate('/host/connect', { state: { partyName: partyName.trim() || undefined } });
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="text-white/40 hover:text-white transition-colors text-xl"
        >
          ←
        </button>
        <h1 className="font-heading text-lg font-bold text-white">Set Up Your Party</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-sm mx-auto flex flex-col gap-8">
          {/* Party name */}
          <section>
            <Input
              label="Party Name (optional)"
              placeholder="Party name"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              maxLength={100}
            />
          </section>

          {/* Host identity */}
          <section>
            <p className="text-sm font-semibold text-white/70 mb-3">Your Name & Avatar</p>
            <Input
              placeholder="Your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              className="mb-4"
            />
            <AvatarPicker selected={avatar} onSelect={setAvatar} />
          </section>

          {/* Queue mode */}
          <section>
            <p className="text-sm font-semibold text-white/70 mb-3">Queue Mode</p>
            <div className="flex flex-col gap-2">
              {QUEUE_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setQueueMode(opt.value)}
                  className={[
                    'flex items-start gap-3 p-4 rounded-2xl border text-left transition-all',
                    queueMode === opt.value
                      ? 'border-primary/60 bg-primary/10'
                      : 'border-border bg-surface hover:border-border-strong',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 transition-colors',
                      queueMode === opt.value ? 'border-primary bg-primary' : 'border-white/20',
                    ].join(' ')}
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{opt.label}</p>
                    <p className="text-xs text-white/40 mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Guest permissions */}
          <section>
            <p className="text-sm font-semibold text-white/70 mb-3">Guest Permissions</p>
            <div className="flex flex-col gap-4 glass rounded-2xl p-4 border border-border">
              <Toggle
                checked={approvalRequired}
                onChange={setApprovalRequired}
                label="Require song approval"
              />
              <Toggle
                checked={explicitFilter}
                onChange={setExplicitFilter}
                label="Filter explicit content"
              />
            </div>
          </section>

          {/* Advanced */}
          <section>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-white/40 hover:text-white/70 transition-colors flex items-center gap-1"
            >
              <span>{showAdvanced ? '▼' : '▶'}</span>
              Advanced Settings
            </button>

            {showAdvanced && (
              <div className="mt-3 glass rounded-2xl p-4 border border-border flex flex-col gap-5">
                <Toggle
                  checked={lockOnDeck}
                  onChange={setLockOnDeck}
                  label="Lock next song (prevent voting it out)"
                />
                <div>
                  <p className="text-sm text-white/60 mb-2">
                    Max songs per guest: <span className="text-white font-semibold">{maxPerGuest}</span>
                  </p>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={maxPerGuest}
                    onChange={(e) => setMaxPerGuest(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <div>
                  <p className="text-sm text-white/60 mb-2">
                    Vote-out threshold: <span className="text-white font-semibold">{voteOutThreshold}</span>
                  </p>
                  <input
                    type="range"
                    min={-10}
                    max={-1}
                    value={voteOutThreshold}
                    onChange={(e) => setVoteOutThreshold(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="px-4 py-4 border-t border-border">
        <div className="max-w-sm mx-auto">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!displayName.trim()}
            onClick={handleContinue}
          >
            Connect Streaming Service →
          </Button>
        </div>
      </div>
    </div>
  );
}
