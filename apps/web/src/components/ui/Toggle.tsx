interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none',
          checked ? 'bg-gradient-primary' : 'bg-white/10',
          disabled ? 'opacity-40 cursor-not-allowed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
      {label && <span className="text-sm text-white/80">{label}</span>}
    </label>
  );
}
