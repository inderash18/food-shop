import { useState } from 'react';
import { cn } from '../../lib/utils';

interface UserAvatarProps {
  user?: { name?: string; avatarUrl?: string | null } | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showBorder?: boolean;
}

export function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({ user, size = 'md', className, showBorder = true }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(user?.name);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
    '2xl': 'w-24 h-24 text-3xl font-bold',
  };

  const hasPhoto = user?.avatarUrl && !imageError;

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden shrink-0 flex items-center justify-center select-none relative font-bold transition-transform',
        sizeClasses[size],
        showBorder && 'ring-2 ring-white shadow-3xs',
        hasPhoto
          ? 'bg-amber-50'
          : 'bg-[#FEDB71] border border-amber-300 text-amber-950 hover:bg-[#F5CA38]',
        className
      )}
    >
      {hasPhoto ? (
        <img
          src={user.avatarUrl!}
          alt={user?.name || 'User Avatar'}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover rounded-full"
          loading="lazy"
        />
      ) : (
        <span className="tracking-tight font-bold text-amber-950">
          {initials}
        </span>
      )}
    </div>
  );
}
