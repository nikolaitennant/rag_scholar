import React, { useState, useRef, useEffect } from 'react';
import { Citation } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { MobileCitationTooltip } from './MobileCitationTooltip';

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
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const groupRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    const rect = groupRef.current?.getBoundingClientRect();
    if (rect) {
      const tooltipWidth = Math.min(320, window.innerWidth - 32); // Mobile-responsive width
      setTooltipPosition({
        x: Math.max(16, Math.min(rect.left + rect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - 16)),
        y: rect.bottom + 8
      });
    }
    setShowTooltip(true);
  };

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (showTooltip) {
      setShowTooltip(false);
    } else {
      handleTouchStart(e as React.TouchEvent);
    }
  };

  const handleContainerTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  const handleOutsideTouch = () => {
    setShowTooltip(false);
  };

  useEffect(() => {
    if (showTooltip) {
      const handleTouchOutside = (event: TouchEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setShowTooltip(false);
        }
      };

      document.addEventListener('touchstart', handleTouchOutside);
      return () => document.removeEventListener('touchstart', handleTouchOutside);
    }
  }, [showTooltip]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const firstCitation = citations[0];
  const additionalCount = citations.length - 1;

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onTouchStart={handleContainerTouchStart}
    >
      <span
        ref={groupRef}
        className={`cursor-pointer select-none transition-all duration-200 text-sm px-2 py-1 rounded-full inline-block touch-manipulation ${
          theme === 'dark'
            ? 'text-gray-200 bg-gray-600/60 hover:bg-gray-500/80 active:bg-gray-400/80'
            : 'text-gray-600 bg-gray-200/60 hover:bg-gray-300/80 active:bg-gray-400/80'
        } ${showTooltip ? 'ring-2 ring-blue-400/30' : ''}`}
        style={{
          fontSize: '10px',
          fontWeight: 'normal',
          verticalAlign: 'baseline',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          minHeight: '24px',
          minWidth: '24px',
          WebkitTapHighlightColor: 'transparent'
        }}
        tabIndex={0}
        role="button"
        aria-haspopup="true"
        aria-expanded={showTooltip}
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
        {firstCitation.source}{additionalCount > 0 ? ` +${additionalCount}` : ''}
      </span>

      {showTooltip && (
        <div
          className="fixed z-[100]"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y
          }}
        >
          <MobileCitationTooltip
            citations={citations}
            visible={showTooltip}
            onClose={() => setShowTooltip(false)}
          />
        </div>
      )}
    </div>
  );
};