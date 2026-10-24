'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
}) => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`relative inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer ${
        isDark
          ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-amber-300 hover:text-amber-200 shadow-xs'
          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 shadow-xs'
      } ${className}`}
      title={`Current: ${isDark ? 'Dark Mode' : 'Light Mode'} (Click to switch)`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Moon className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 scale-100" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500 transition-transform duration-300 rotate-0 scale-100" />
        )}
      </div>
      {showLabel && (
        <span className="text-xs font-semibold select-none">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </button>
  );
};
