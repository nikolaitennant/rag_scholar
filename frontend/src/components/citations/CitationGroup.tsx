import React, { useState, useRef, useEffect } from 'react';
import { Citation } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { InlineCitation } from './InlineCitation';
import { CitationTooltip } from './CitationTooltip';
import { Calendar, Hash, FileText } from 'lucide-react';

interface CitationGroupProps {
  citations: Citation[];
  citationNumbers: number[];
  messageIndex: number;
  maxVisible?: number;
}

export const CitationGroup: React.FC<CitationGroupProps> = ({
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

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    const rect = groupRef.current?.getBoundingClientRect();
    if (rect) {
      const tooltipWidth = 280;
      setTooltipPosition({
        x: rect.left + rect.width / 2 - tooltipWidth / 2,
        y: rect.bottom + 8
      });
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 500);
  };

  const handleContainerMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setShowTooltip(true);
  };

  const handleContainerMouseLeave = () => {
    setShowTooltip(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    console.log('Citation group clicked:', citations);
  };

  const firstCitation = citations[0];
  const additionalCount = citations.length - 1;

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleContainerMouseEnter}
      onMouseLeave={handleContainerMouseLeave}
    >
      <span
        ref={groupRef}
        className={`cursor-pointer select-none transition-all duration-200 text-xs px-1 py-0 rounded-full inline-block ${
          theme === 'dark'
            ? 'text-gray-200 bg-gray-600/60 hover:bg-gray-500/80'
            : 'text-gray-600 bg-gray-200/60 hover:bg-gray-300/80'
        } ${showTooltip ? 'ring-2 ring-blue-400/30' : ''}`}
        style={{
          fontSize: '7px',
          fontWeight: 'normal',
          verticalAlign: 'baseline',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
        tabIndex={0}
        role="button"
        aria-haspopup="true"
        aria-expanded={showTooltip}
        aria-label={`Citation: ${firstCitation.source}${additionalCount > 0 ? ` and ${additionalCount} more` : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {firstCitation.source}{additionalCount > 0 ? ` +${additionalCount}` : ''}
      </span>

      {showTooltip && (
        <>
          <div
            className="fixed z-[99]"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y - 8,
              width: '280px',
              height: '16px'
            }}
          />

          <div
            className="fixed z-[100]"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y
            }}
          >
            <CitationTooltip
              citations={citations}
              visible={showTooltip}
              onClose={() => setShowTooltip(false)}
              onMouseEnter={handleContainerMouseEnter}
              onMouseLeave={handleContainerMouseLeave}
            />
          </div>
        </>
      )}
    </div>
  );
};