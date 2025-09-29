import React, { useState, useRef, useEffect } from 'react';
import { Citation } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { CitationBottomSheet } from './CitationBottomSheet';

interface MobileCitationGroupProps {
  citations: Citation[];
  citationNumbers: number[];
  messageIndex: number;
  maxVisible?: number;
}

export const MobileCitationGroup: React.FC<MobileCitationGroupProps> = ({
  citations,
  citationNumbers,
  messageIndex,
  maxVisible = 1
}) => {
  const { theme } = useTheme();
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const groupRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setShowBottomSheet(true);
  };

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setShowBottomSheet(true);
  };

  const firstCitation = citations[0];
  const additionalCount = citations.length - 1;

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
    >
      <span
        ref={groupRef}
        className={`cursor-pointer select-none transition-all duration-200 text-xs px-1.5 py-0.5 rounded-full inline-block touch-manipulation ${
          showBottomSheet
            ? 'text-white bg-gradient-to-r from-purple-500 to-pink-500'
            : ''
        }`}
        style={{
          fontSize: '8px',
          fontWeight: '500',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
          verticalAlign: 'baseline',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          minHeight: '16px',
          minWidth: '16px',
          WebkitTapHighlightColor: 'transparent',
          outline: 'none',
          ...(showBottomSheet ? {} : {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          })
        }}
        tabIndex={0}
        role="button"
        aria-haspopup="true"
        aria-expanded={showBottomSheet}
        aria-label={`Citation: ${firstCitation.source}${additionalCount > 0 ? ` and ${additionalCount} more` : ''}`}
        onTouchStart={handleTouchStart}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick(e as any);
          }
        }}
      >
        <span style={{
          ...(showBottomSheet ? {} : {
            background: 'linear-gradient(45deg, #a855f7, #ec4899)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent'
          })
        }}>
          {firstCitation.source}{additionalCount > 0 ? ` +${additionalCount}` : ''}
        </span>
      </span>

      <CitationBottomSheet
        citations={citations}
        visible={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
      />
    </div>
  );
};