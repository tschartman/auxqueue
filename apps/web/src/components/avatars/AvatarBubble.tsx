interface AvatarBubbleProps {
  avatar: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-xl',
  xl: 'w-16 h-16 text-3xl',
};

export function AvatarBubble({ avatar, size = 'md', className = '' }: AvatarBubbleProps) {
  return (
    <div
      className={[
        'rounded-full bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0 select-none',
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      {avatar}
    </div>
  );
}
