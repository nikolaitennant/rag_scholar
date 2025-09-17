import React from 'react';
import { Sun, Moon, Clock } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  themeMode: 'light' | 'dark' | 'auto';
  onToggle: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, themeMode, onToggle }) => {
  const getIcon = () => {
    if (themeMode === 'auto') {
      return <Clock className="w-3 h-3 text-blue-600 absolute top-0.5 left-0.5" />;
    }
    return theme === 'dark' ? (
      <Moon className="w-3 h-3 text-purple-600 absolute top-0.5 left-0.5" />
    ) : (
      <Sun className="w-3 h-3 text-yellow-500 absolute top-0.5 left-0.5" />
    );
  };

  const getBackgroundColor = () => {
    if (themeMode === 'auto') {
      return 'bg-blue-500';
    }
    return theme === 'dark' ? 'bg-purple-600' : 'bg-gray-300';
  };

  const getPosition = () => {
    if (themeMode === 'auto') {
      return 'translate-x-3.5'; // Middle position
    }
    return theme === 'dark' ? 'translate-x-6' : 'translate-x-1';
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={onToggle}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300
          ${getBackgroundColor()}
        `}
        aria-label={`Toggle theme (current: ${themeMode})`}
        title={`Current: ${themeMode} mode${themeMode === 'auto' ? ` (${theme})` : ''}`}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300
            ${getPosition()}
          `}
        >
          {getIcon()}
        </span>
      </button>
      <span className="text-xs text-white/60 capitalize">
        {themeMode === 'auto' ? `Auto (${theme})` : themeMode}
      </span>
    </div>
  );
};