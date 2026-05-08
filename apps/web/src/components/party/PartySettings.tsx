import type { PartySettings as PartySettingsType } from '@auxqueue/shared';
import { Toggle } from '../ui/Toggle';

interface PartySettingsProps {
  settings: PartySettingsType;
  isHost: boolean;
  onChange: (settings: Partial<PartySettingsType>) => void;
}

const QUEUE_MODE_OPTIONS = [
  {
    value: 'vote' as const,
    label: '🗳️ Vote Mode',
    desc: 'Songs are sorted by upvotes. Low-voted songs get removed.',
  },
  {
    value: 'open' as const,
    label: '📋 Open Queue',
    desc: 'Songs play in the order they were added.',
  },
  {
    value: 'host' as const,
    label: '👑 Host Control',
    desc: 'Only the host can reorder the queue.',
  },
];

export function PartySettings({ settings, isHost, onChange }: PartySettingsProps) {
  if (!isHost) {
    return (
      <div className="flex flex-col gap-4">
        <SettingRow label="Queue Mode" value={settings.queueMode} />
        <SettingRow label="Approval Required" value={settings.approvalRequired ? 'Yes' : 'No'} />
        <SettingRow label="Explicit Filter" value={settings.explicitFilter ? 'On' : 'Off'} />
        <SettingRow label="Max Songs per Guest" value={String(settings.maxPerGuest)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold text-white/70 mb-3">Queue Mode</p>
        <div className="flex flex-col gap-2">
          {QUEUE_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ queueMode: opt.value })}
              className={[
                'flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
                settings.queueMode === opt.value
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-border bg-surface hover:border-border-strong',
              ].join(' ')}
            >
              <div
                className={[
                  'w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 transition-colors',
                  settings.queueMode === opt.value ? 'border-primary bg-primary' : 'border-white/20',
                ].join(' ')}
              />
              <div>
                <p className="text-sm font-semibold text-white">{opt.label}</p>
                <p className="text-xs text-white/40 mt-0.5">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Toggle
          checked={settings.approvalRequired}
          onChange={(v) => onChange({ approvalRequired: v })}
          label="Require approval before songs join queue"
        />
        <Toggle
          checked={settings.explicitFilter}
          onChange={(v) => onChange({ explicitFilter: v })}
          label="Filter explicit content"
        />
        <Toggle
          checked={settings.lockOnDeck}
          onChange={(v) => onChange({ lockOnDeck: v })}
          label="Lock next song (prevent voting it out)"
        />
      </div>

      <div>
        <p className="text-sm font-semibold text-white/70 mb-2">
          Max songs per guest: <span className="text-white">{settings.maxPerGuest}</span>
        </p>
        <input
          type="range"
          min={1}
          max={20}
          value={settings.maxPerGuest}
          onChange={(e) => onChange({ maxPerGuest: Number(e.target.value) })}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-white/30 mt-1">
          <span>1</span>
          <span>20</span>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-white/70 mb-2">
          Vote-out threshold: <span className="text-white">{settings.voteOutThreshold}</span>
        </p>
        <input
          type="range"
          min={-10}
          max={-1}
          value={settings.voteOutThreshold}
          onChange={(e) => onChange({ voteOutThreshold: Number(e.target.value) })}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-white/30 mt-1">
          <span>-10 (strict)</span>
          <span>-1 (lenient)</span>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border last:border-0">
      <span className="text-sm text-white/60">{label}</span>
      <span className="text-sm font-medium text-white capitalize">{value}</span>
    </div>
  );
}
