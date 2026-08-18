import React from 'react';
import { cn } from '../../lib/utils';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BrandLogo({ size = 'md', className }: BrandLogoProps) {
  const iconSizes = {
    sm: 'w-7 h-7 rounded-xl text-xs',
    md: 'w-9 h-9 rounded-2xl text-sm',
    lg: 'w-12 h-12 rounded-2xl text-base',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };

  return (
    <div className={cn('flex items-center gap-3 select-none group', className)}>
      {/* Premium Emblem with Gold Gradient */}
      <div
        className={cn(
          'relative bg-gradient-to-br from-[#FEDB71] via-[#FBBF24] to-[#F59E0B] border-2 border-amber-400/60 text-amber-950 flex items-center justify-center font-bold shadow-lg shadow-amber-300/40 shrink-0 group-hover:scale-110 group-hover:-rotate-6 group-hover:shadow-xl group-hover:shadow-amber-400/50 transition-all duration-500 ease-out',
          iconSizes[size]
        )}
      >
        {/* Premium shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent rounded-inherit pointer-events-none" />
        
        {/* Gold reflection line */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent rounded-inherit pointer-events-none" />
        
        {/* Outer glow ring */}
        <div className="absolute -inset-1.5 rounded-inherit border-2 border-amber-400/30 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 blur-sm" />
        
        {/* Inner decorative ring */}
        <div className="absolute inset-1 rounded-inherit border border-amber-400/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            size === 'sm' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-4.5 h-4.5' : 'w-6 h-6',
            'text-amber-950 transition-all duration-500 group-hover:scale-110 group-hover:rotate-12'
          )}
        >
          {/* Premium cutlery icon */}
          <path d="M8 2v12M12 2v12M6 14h8M6 2v4a2 2 0 0 0 4 0V2" />
          <path d="M18 2v20M15 10h6M15 14h4M15 18h2" />
          <circle cx="18" cy="6" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      </div>

      {/* Premium Typography with Gradient Text */}
      <div className="flex items-center leading-none">
        <span className={cn(
          'font-black tracking-tight transition-all duration-500 group-hover:tracking-wider',
          textSizes[size]
        )}>
          <span className="bg-gradient-to-r from-amber-950 via-amber-800 to-amber-950 bg-clip-text text-transparent">
            Food
          </span>
          <span className={cn(
            'relative ml-1',
            'bg-gradient-to-r from-[#F59E0B] via-[#FBBF24] to-[#F59E0B] bg-clip-text text-transparent'
          )}>
            Live
            {/* Premium underline with glow */}
            <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-full shadow-lg shadow-amber-400/50" />
            <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-right opacity-40" />
          </span>
        </span>
      </div>
    </div>
  );
}