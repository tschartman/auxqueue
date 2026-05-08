import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-primary shadow-glow flex items-center justify-center text-4xl mb-4 mx-auto">
            🎛️
          </div>
          <h1 className="font-heading text-4xl font-extrabold gradient-text">AuxQueue</h1>
          <p className="text-white/50 mt-2 text-base">
            Everyone picks the music.
            <br />
            The crowd decides what plays.
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 w-full">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => navigate('/host/setup')}
          >
            🎉 Host a Party
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => navigate('/join')}
          >
            🎵 Join a Party
          </Button>
        </div>

        {/* Feature chips */}
        <div className="flex flex-wrap justify-center gap-2 mt-10">
          {['Vote on songs', 'Live queue', 'No account needed', 'PWA'].map((feat) => (
            <span
              key={feat}
              className="text-xs text-white/40 bg-white/5 border border-border px-3 py-1 rounded-full"
            >
              {feat}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
