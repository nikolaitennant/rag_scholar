import React from 'react';
import { X, FileText, Hash } from 'lucide-react';
import { Citation } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface CitationCardProps {
  citation: Citation;
  citationNumber: number;
  visible: boolean;
  onClose: () => void;
}

export const CitationCard: React.FC<CitationCardProps> = ({
  citation,
  citationNumber,
  visible,
  onClose
}) => {
  const { theme } = useTheme();

  if (!visible) return null;

  return (
    <div className={`mt-3 p-4 rounded-2xl border shadow-lg transition-all duration-300 ${
      theme === 'dark'
        ? 'bg-black/40 border-white/20 backdrop-blur-xl'
        : 'bg-white/40 border-black/20 backdrop-blur-xl'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            theme === 'dark'
              ? 'bg-violet-500/30 text-violet-300'
              : 'bg-violet-500/30 text-violet-600'
          }`}>
            {citationNumber}
          </div>
          <div>
            <div className={`font-semibold text-sm ${
              theme === 'dark' ? 'text-white' : 'text-black'
            }`}>
              {citation.source}
            </div>
            <div className={`flex items-center gap-3 text-xs mt-1 ${
              theme === 'dark' ? 'text-white/60' : 'text-black/60'
            }`}>
              {citation.page && (
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  Page {citation.page}
                  {citation.line && `, Line ${citation.line}`}
                </span>
              )}
              {citation.document_type && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {citation.document_type.toUpperCase()}
                </span>
              )}
              {citation.confidence && (
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  citation.confidence > 0.8
                    ? 'bg-green-500/20 text-green-400'
                    : citation.confidence > 0.6
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {Math.round(citation.confidence * 100)}% confidence
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded-full transition-colors ${
            theme === 'dark'
              ? 'hover:bg-white/10 text-white/60 hover:text-white'
              : 'hover:bg-black/10 text-black/60 hover:text-black'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Text Excerpt */}
      {citation.preview && (
        <div className="mb-3">
          <div className={`text-xs font-medium mb-2 ${
            theme === 'dark' ? 'text-white/80' : 'text-black/80'
          }`}>
            Text Excerpt:
          </div>
          <div className={`text-sm p-3 rounded-lg italic border-l-2 ${
            theme === 'dark'
              ? 'bg-white/5 text-white/90 border-violet-400/50'
              : 'bg-black/5 text-black/90 border-violet-500/50'
          }`}>
            "{citation.preview}"
          </div>
        </div>
      )}

      {/* AI Summary */}
      {citation.summary && (
        <div>
          <div className={`text-xs font-medium mb-2 ${
            theme === 'dark' ? 'text-white/80' : 'text-black/80'
          }`}>
            Summary:
          </div>
          <div className={`text-sm p-3 rounded-lg ${
            theme === 'dark'
              ? 'bg-white/5 text-white/90'
              : 'bg-black/5 text-black/90'
          }`}>
            {citation.summary}
          </div>
        </div>
      )}
    </div>
  );
};