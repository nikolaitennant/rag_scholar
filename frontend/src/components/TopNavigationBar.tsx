import React from 'react';
import { ChevronDown, Search, Settings } from 'lucide-react';
import { UserClass } from '../types';

interface TopNavigationBarProps {
  activeClass: UserClass | null;
  onClassSwitcherClick: () => void;
  onSearchClick: () => void;
  onSettingsClick: () => void;
}

export const TopNavigationBar: React.FC<TopNavigationBarProps> = ({
  activeClass,
  onClassSwitcherClick,
  onSearchClick,
  onSettingsClick,
}) => {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        background: 'rgba(28, 28, 30, 0.8)',
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
        borderBottom: '0.5px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="flex items-center justify-between px-4 h-14">
        {/* Class Switcher */}
        <button
          onClick={onClassSwitcherClick}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors"
        >
          <span className="text-white font-medium text-base">
            {activeClass?.name || 'Select Class'}
          </span>
          <ChevronDown className="w-5 h-5 text-white/70" />
        </button>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {/* Search Button */}
          <button
            onClick={onSearchClick}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors"
          >
            <Search className="w-5 h-5 text-white/80" />
          </button>

          {/* Settings Button */}
          <button
            onClick={onSettingsClick}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors"
          >
            <Settings className="w-5 h-5 text-white/80" />
          </button>
        </div>
      </div>
    </div>
  );
};
