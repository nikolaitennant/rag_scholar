import React, { useState } from 'react';
import { FileText, Calendar, Hash, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Citation } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface MobileCitationTooltipProps {
  citations: Citation[];
  visible: boolean;
  onClose: () => void;
}

export const MobileCitationTooltip: React.FC<MobileCitationTooltipProps> = ({
  citations,
  visible,
  onClose
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
      return citation.preview.substring(0, 80) + (citation.preview.length > 80 ? '...' : '');
    }
    return citation.source || 'Unknown Document';
  };

  // Format publication date if available
  const getPublicationDate = () => {
    return 'Recent';
  };

  // Get preview text directly from citation
  const getPreviewText = () => {
    if (citation.preview && citation.preview.length > 10) {
      return citation.preview.length > 150 ? citation.preview.substring(0, 150) + '...' : citation.preview;
    }
    return 'No preview available';
  };

  return (
    <div
      className={`absolute z-[100] p-5 rounded-3xl shadow-2xl pointer-events-auto transform transition-opacity duration-200 overflow-hidden backdrop-blur-2xl ${
        visible ? 'opacity-100' : 'opacity-0'
      } ${theme === 'dark'
        ? 'bg-black/40 text-white border border-white/10'
        : 'bg-white/40 text-black border border-black/10'
      }`}
      style={{
        minWidth: '300px',
        maxWidth: 'calc(100vw - 32px)',
        backdropFilter: 'blur(20px) saturate(120%) brightness(0.9)',
        WebkitBackdropFilter: 'blur(20px) saturate(120%) brightness(0.9)',
        WebkitTapHighlightColor: 'transparent'
      }}
      role="tooltip"
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Header with close button and navigation */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xl">{getSourceIcon(citation.source)}</span>
          <div className={`font-semibold text-base ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
            {citation.source}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Navigation arrows and counter for multiple citations */}
          {hasMultiple && (
            <>
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  goToPrevious();
                }}
                className={`p-2 rounded-full transition-colors touch-manipulation ${
                  theme === 'dark'
                    ? 'bg-gray-700/50 active:bg-gray-600 text-gray-300 active:text-white'
                    : 'bg-gray-200/50 active:bg-gray-300 text-gray-600 active:text-black'
                }`}
                aria-label="Previous citation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className={`text-sm px-2 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {currentIndex + 1} of {citations.length}
              </span>

              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  goToNext();
                }}
                className={`p-2 rounded-full transition-colors touch-manipulation ${
                  theme === 'dark'
                    ? 'bg-gray-700/50 active:bg-gray-600 text-gray-300 active:text-white'
                    : 'bg-gray-200/50 active:bg-gray-300 text-gray-600 active:text-black'
                }`}
                aria-label="Next citation"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Close button */}
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onClose();
            }}
            className={`p-2 rounded-full transition-colors touch-manipulation ${
              theme === 'dark'
                ? 'bg-gray-700/50 active:bg-gray-600 text-gray-300 active:text-white'
                : 'bg-gray-200/50 active:bg-gray-300 text-gray-600 active:text-black'
            }`}
            aria-label="Close citation"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Document Title */}
      <div className={`font-medium text-base mb-3 leading-relaxed ${
        theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
      }`}>
        {getDocumentTitle()}
      </div>

      {/* Publication Date */}
      <div className={`flex items-center gap-2 text-sm mb-3 ${
        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
      }`}>
        <Calendar className="w-4 h-4" />
        <span>{getPublicationDate()}</span>
      </div>

      {/* Page and Line Information - only show if data exists */}
      {(citation.page || citation.line) && (
        <div className="flex items-center gap-4 text-sm mb-4">
          {citation.page && (
            <div className={`flex items-center gap-2 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <Hash className="w-4 h-4" />
              <span>Page {citation.page}</span>
            </div>
          )}
          {citation.line && (
            <div className={`flex items-center gap-2 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <FileText className="w-4 h-4" />
              <span>Line {citation.line}</span>
            </div>
          )}
        </div>
      )}

      {/* Preview Text */}
      <div className={`mt-4 p-3 rounded-xl text-sm leading-relaxed ${
        theme === 'dark'
          ? 'bg-gray-800/50 text-gray-300'
          : 'bg-gray-100/50 text-gray-700'
      }`}>
        <div className={`font-medium mb-2 ${
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