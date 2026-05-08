import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-white/70">{label}</label>
        )}
        <input
          ref={ref}
          className={[
            'w-full px-4 py-3 rounded-xl bg-white/5 border text-white placeholder-white/25',
            'focus:outline-none focus:border-white/20 transition-colors duration-150',
            error ? 'border-error/50' : 'border-border',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
        {hint && !error && <p className="text-xs text-white/40">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
