import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface PartyHeaderProps {
  partyName: string;
  roomCode: string;
  guestCount: number;
  service: string;
}

export function PartyHeader({ partyName, roomCode, guestCount, service }: PartyHeaderProps) {
  const serviceIcon: Record<string, string> = { spotify: '🎧', apple: '🎵', youtube: '▶️' };
  const icon = serviceIcon[service] ?? '🎶';
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const joinUrl = `${window.location.origin}/join/${roomCode}`;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: partyName || 'AuxQueue', text: `Join my party! Code: ${roomCode}`, url: joinUrl });
      } else {
        await navigator.clipboard.writeText(joinUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch { /* user cancelled */ }
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <div>
            <h1 className="font-heading text-sm font-bold text-white leading-tight">{partyName || 'Party'}</h1>
            <p className="text-xs text-white/40">{guestCount} guests</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQr(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            <span className="text-xs text-white/40">code</span>
            <span className="text-xs font-bold text-white font-mono tracking-wider">{roomCode}</span>
            <span className="text-xs text-white/30 ml-1">⊞</span>
          </button>
        </div>
      </div>

      {/* QR code modal */}
      {showQr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-6"
          onClick={() => setShowQr(false)}
        >
          <div
            className="bg-surface border border-border rounded-3xl p-6 flex flex-col items-center gap-4 max-w-xs w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-heading text-lg font-bold text-white">Scan to Join</h2>
            <div className="p-3 bg-white rounded-2xl">
              <QRCodeSVG value={joinUrl} size={200} />
            </div>
            <p className="text-2xl font-bold font-mono tracking-widest text-white">{roomCode}</p>
            <p className="text-xs text-white/40 text-center">
              Point your camera at the QR code, or share the code
            </p>
            <div className="flex gap-2 w-full">
              <button
                onClick={handleShare}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-sm text-white hover:bg-white/15 transition-colors"
              >
                {copied ? '✓ Copied' : '⎘ Copy Link'}
              </button>
              <button
                onClick={() => setShowQr(false)}
                className="flex-1 py-2.5 rounded-xl bg-primary text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
