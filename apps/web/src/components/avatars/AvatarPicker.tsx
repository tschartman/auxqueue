import { AVATARS } from '../../lib/avatars';

interface AvatarPickerProps {
  selected: string;
  onSelect: (avatar: string) => void;
}

export function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-8 gap-2">
      {AVATARS.map((avatar) => (
        <button
          key={avatar}
          onClick={() => onSelect(avatar)}
          className={[
            'w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all duration-150',
            selected === avatar
              ? 'bg-gradient-primary shadow-glow-sm scale-110'
              : 'bg-white/5 hover:bg-white/10 border border-border',
          ].join(' ')}
        >
          {avatar}
        </button>
      ))}
    </div>
  );
}
