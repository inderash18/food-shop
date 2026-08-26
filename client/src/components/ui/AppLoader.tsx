import React from 'react';
import { BrandLogo } from './BrandLogo';

export function AppLoader({ message = 'Loading Food Shop...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-[#f8faf9] dark:bg-stone-950 flex flex-col items-center justify-center p-6 z-50 animate-in fade-in duration-200 antialiased">
      <div className="flex flex-col items-center space-y-4 text-center">
        {/* Pulsing Logo Container */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full bg-teal-500/10 dark:bg-teal-400/10 animate-ping" />
          <div className="relative p-3 bg-white dark:bg-stone-900 rounded-3xl shadow-lg border border-stone-200/60 dark:border-stone-800">
            <BrandLogo size="lg" />
          </div>
        </div>

        {/* Loading Spinner & Label */}
        <div className="flex items-center gap-2.5 pt-2">
          <div className="w-4 h-4 border-2 border-[#389C9A] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-stone-600 dark:text-stone-300 tracking-wide">
            {message}
          </span>
        </div>
      </div>
    </div>
  );
}
