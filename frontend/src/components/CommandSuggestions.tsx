import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { CommandSuggestion } from '../utils/commandParser';
import { Terminal, Brain, BookOpen, User, RotateCcw, FileText, HelpCircle, GitCompare, Search, Quote } from 'lucide-react';

interface CommandSuggestionsProps {
  suggestions: CommandSuggestion[];
  onSelect: (command: string) => void;
  visible: boolean;
}

const getCommandIcon = (command: string) => {
  switch (command) {
    case '/background':
      return Brain;
    case '/persona':
      return User;
    case '/reset':
      return RotateCcw;
    case '/summarize':
      return FileText;
    case '/explain':
      return HelpCircle;
    case '/compare':
      return GitCompare;
    case '/search':
      return Search;
    case '/cite':
      return Quote;
    default:
      return Terminal;
  }
};

export const CommandSuggestions: React.FC<CommandSuggestionsProps> = ({
  suggestions,
  onSelect,
  visible
}) => {
  const { theme } = useTheme();

  if (!visible || suggestions.length === 0) {
    return null;
  }

  return (
    <div className={`absolute bottom-full left-0 right-0 mb-2 rounded-lg border backdrop-blur-sm ${
      theme === 'dark'
        ? 'bg-black/80 border-white/20'
        : 'bg-white/80 border-black/20'
    }`}>
      <div className="p-2 space-y-1">
        <div className={`text-xs font-medium px-2 py-1 ${
          theme === 'dark' ? 'text-white/60' : 'text-black/60'
        }`}>
          Command Suggestions
        </div>
        {suggestions.map((suggestion, index) => {
          const Icon = getCommandIcon(suggestion.command);
          return (
            <button
              key={suggestion.command}
              onClick={() => onSelect(suggestion.example)}
              className={`w-full p-2 rounded-md text-left transition-all hover:scale-[1.02] ${
                theme === 'dark'
                  ? 'hover:bg-white/10 text-white'
                  : 'hover:bg-black/10 text-black'
              }`}
            >
              <div className="flex items-start gap-3">
                <Icon className="w-4 h-4 mt-0.5 text-blue-400" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className={`text-xs px-2 py-1 rounded font-mono ${
                      theme === 'dark' ? 'bg-white/10 text-blue-400' : 'bg-black/10 text-blue-600'
                    }`}>
                      {suggestion.command}
                    </code>
                  </div>
                  <div className={`text-xs mb-1 ${
                    theme === 'dark' ? 'text-white/70' : 'text-black/70'
                  }`}>
                    {suggestion.description}
                  </div>
                  <div className={`text-xs font-mono ${
                    theme === 'dark' ? 'text-white/50' : 'text-black/50'
                  }`}>
                    {suggestion.example}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};