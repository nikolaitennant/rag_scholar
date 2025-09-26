import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { User, Brain, HelpCircle, X, ChevronDown, ChevronUp, Terminal } from 'lucide-react';

interface ChatStatusBarProps {
  currentPersona?: string;
  isBackgroundMode?: boolean;
  onClearPersona?: () => void;
  onToggleHints?: () => void;
  showHints?: boolean;
}

export const ChatStatusBar: React.FC<ChatStatusBarProps> = ({
  currentPersona,
  isBackgroundMode,
  onClearPersona,
  onToggleHints,
  showHints = false
}) => {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveStates = currentPersona || isBackgroundMode;

  if (!hasActiveStates && !showHints) {
    return null;
  }

  return (
    <div className={`border-b transition-all ${
      theme === 'dark'
        ? 'bg-black/20 border-white/10 backdrop-blur-sm'
        : 'bg-white/20 border-black/10 backdrop-blur-sm'
    }`}>
      {/* Main Status Bar */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          {/* Active Persona */}
          {currentPersona && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              theme === 'dark'
                ? 'bg-blue-500/20 border border-blue-400/40 text-blue-400'
                : 'bg-blue-500/20 border border-blue-600/40 text-blue-600'
            }`}>
              <User className="w-4 h-4" />
              <span className="font-medium">Acting as: {currentPersona}</span>
              {onClearPersona && (
                <button
                  onClick={onClearPersona}
                  className={`ml-1 hover:bg-black/20 rounded-full p-0.5 transition-colors ${
                    theme === 'dark' ? 'hover:bg-white/20' : 'hover:bg-black/20'
                  }`}
                  title="Clear persona"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Background Mode */}
          {isBackgroundMode && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              theme === 'dark'
                ? 'bg-purple-500/20 border border-purple-400/40 text-purple-400'
                : 'bg-purple-500/20 border border-purple-600/40 text-purple-600'
            }`}>
              <Brain className="w-4 h-4" />
              <span className="font-medium">Background Knowledge Mode</span>
            </div>
          )}
        </div>

        {/* Hints Toggle */}
        <button
          onClick={onToggleHints}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all hover:scale-105 ${
            showHints
              ? theme === 'dark'
                ? 'bg-green-500/20 border border-green-400/40 text-green-400'
                : 'bg-green-500/20 border border-green-600/40 text-green-600'
              : theme === 'dark'
                ? 'bg-white/5 border border-white/20 text-white/60 hover:text-white'
                : 'bg-black/5 border border-black/20 text-black/60 hover:text-black'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Command Hints</span>
          {showHints ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Expandable Command Hints */}
      {showHints && (
        <div className={`border-t px-3 py-3 ${
          theme === 'dark' ? 'border-white/10' : 'border-black/10'
        }`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { cmd: '/background', desc: 'General knowledge', icon: '🧠' },
              { cmd: '/summarize', desc: 'Summarize docs', icon: '📄' },
              { cmd: '/explain', desc: 'Simple explanation', icon: '❓' },
              { cmd: '/compare', desc: 'Compare concepts', icon: '⚖️' },
              { cmd: '/search', desc: 'Search documents', icon: '🔍' },
              { cmd: '/cite', desc: 'Find citations', icon: '📝' },
              { cmd: '/persona', desc: 'Set AI role', icon: '🎭' },
              { cmd: '/reset', desc: 'Reset persona', icon: '🔄' }
            ].map((hint) => (
              <div
                key={hint.cmd}
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  theme === 'dark'
                    ? 'bg-white/5 hover:bg-white/10'
                    : 'bg-black/5 hover:bg-black/10'
                } transition-colors cursor-help`}
                title={`Type ${hint.cmd} to ${hint.desc.toLowerCase()}`}
              >
                <span className="text-sm">{hint.icon}</span>
                <code className={`text-xs font-mono ${
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                }`}>
                  {hint.cmd}
                </code>
                <span className={`text-xs truncate ${
                  theme === 'dark' ? 'text-white/60' : 'text-black/60'
                }`}>
                  {hint.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};