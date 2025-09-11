import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300
        ${theme === 'dark' ? 'bg-purple-600' : 'bg-gray-300'}
      `}
      aria-label="Toggle theme"
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300
          ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}
        `}
      >
        {theme === 'dark' ? (
          <Moon className="w-3 h-3 text-purple-600 absolute top-0.5 left-0.5" />
        ) : (
          <Sun className="w-3 h-3 text-yellow-500 absolute top-0.5 left-0.5" />
        )}
      </span>
    </button>
  );
};