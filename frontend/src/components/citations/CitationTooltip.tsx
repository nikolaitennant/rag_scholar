import React, { useState } from 'react';
import { FileText, Calendar, Hash, ChevronLeft, ChevronRight } from 'lucide-react';
import { Citation } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface CitationTooltipProps {
  citations: Citation[];
  visible: boolean;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const CitationTooltip: React.FC<CitationTooltipProps> = ({
  citations,
  visible,
  onClose,
  onMouseEnter,
  onMouseLeave
}) => {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!visible || citations.length === 0) return null;

  const citation = citations[currentIndex];
  const hasMultiple = citations.length > 1;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + citations.length) % citations.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % citations.length);
  };

  // Get source icon based on source name
  const getSourceIcon = (source: string) => {
    const lowerSource = source.toLowerCase();
    if (lowerSource.includes('arxiv')) return '📄';
    if (lowerSource.includes('pdf')) return '📄';
    if (lowerSource.includes('wiki')) return '📖';
    if (lowerSource.includes('web') || lowerSource.includes('http')) return '🌐';
    return '📑';
  };

  // Extract document title from source or use source as fallback
  const getDocumentTitle = () => {
    if (citation.preview && citation.preview.length > 10) {
      return citation.preview.substring(0, 60) + (citation.preview.length > 60 ? '...' : '');
    }
    return citation.source || 'Unknown Document';
  };

  // Format publication date if available
  const getPublicationDate = () => {
    // You can extract date from citation metadata if available
    // For now, return a placeholder or extract from source
    return 'Recent'; // This would be replaced with actual date parsing
  };

  // Get preview text with better formatting
  const getPreviewText = () => {
    if (citation.preview && citation.preview.length > 10) {
      return citation.preview.length > 120 ? citation.preview.substring(0, 120) + '...' : citation.preview;
    }
    return 'No preview available';
  };

  return (
    <div
      className={`absolute z-[100] p-4 rounded-2xl shadow-2xl pointer-events-auto transform transition-opacity duration-200 overflow-hidden backdrop-blur-2xl ${
        visible ? 'opacity-100' : 'opacity-0'
      } ${theme === 'dark'
        ? 'bg-black/30 text-white'
        : 'bg-white/10 text-black'
      }`}
      style={{
        minWidth: '280px',
        maxWidth: '320px',
        backdropFilter: 'blur(20px) saturate(120%) brightness(0.9)',
        WebkitBackdropFilter: 'blur(20px) saturate(120%) brightness(0.9)'
      }}
      role="tooltip"
      onMouseEnter={(e) => {
        e.stopPropagation();
        onMouseEnter?.();
      }}
      onMouseLeave={(e) => {
        e.stopPropagation();
        onMouseLeave?.();
      }}
    >
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getSourceIcon(citation.source)}</span>
          <div className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
            {citation.source}
          </div>
        </div>

        {/* Navigation arrows and counter for multiple citations */}
        {hasMultiple && (
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevious}
              className={`p-1 rounded transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-300 hover:text-white'
                  : 'hover:bg-gray-200 text-gray-600 hover:text-black'
              }`}
              aria-label="Previous citation"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className={`text-xs px-2 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {currentIndex + 1} of {citations.length}
            </span>

            <button
              onClick={goToNext}
              className={`p-1 rounded transition-colors ${
                theme === 'dark'
                  ? 'hover:bg-gray-700 text-gray-300 hover:text-white'
                  : 'hover:bg-gray-200 text-gray-600 hover:text-black'
              }`}
              aria-label="Next citation"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Document Title */}
      <div className={`font-medium text-sm mb-2 leading-relaxed ${
        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
      }`}>
        {getDocumentTitle()}
      </div>

      {/* Publication Date */}
      <div className={`flex items-center gap-1 text-xs ${
        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
      }`}>
        <Calendar className="w-3 h-3" />
        <span>{getPublicationDate()}</span>
      </div>

      {/* Page and Line Information */}
      <div className="flex items-center gap-3 text-xs mt-2">
        {citation.page && (
          <div className={`flex items-center gap-1 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <Hash className="w-3 h-3" />
            <span>Page {citation.page}</span>
          </div>
        )}
        {citation.line && (
          <div className={`flex items-center gap-1 ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <FileText className="w-3 h-3" />
            <span>Line {citation.line}</span>
          </div>
        )}
      </div>

      {/* Preview Text */}
      <div className={`mt-3 p-2 rounded-lg text-xs leading-relaxed ${
        theme === 'dark'
          ? 'bg-gray-800/50 text-gray-300'
          : 'bg-gray-100/50 text-gray-700'
      }`}>
        <div className={`font-medium mb-1 ${
          theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
        }`}>
          Preview:
        </div>
        <div className="italic">
          "{getPreviewText()}"
        </div>
      </div>
    </div>
  );
};