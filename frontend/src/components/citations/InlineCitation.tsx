import React, { useState, useRef, useEffect } from 'react';
import { Citation } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { CitationTooltip } from './CitationTooltip';
import { CitationCard } from './CitationCard';

interface InlineCitationProps {
  citation: Citation;
  citationNumber: number;
  messageIndex: number;
}

export const InlineCitation: React.FC<InlineCitationProps> = ({
  citation,
  citationNumber,
  messageIndex
}) => {
  const { theme } = useTheme();
  const [showTooltip, setShowTooltip] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const citationRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = citationRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 40  // Much further away from the text
      });
    }
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowTooltip(false);
    setShowCard(!showCard);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // On mobile, show tooltip on touch
    handleMouseEnter(e as any);
  };

  // Close card when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (citationRef.current && !citationRef.current.contains(event.target as Node)) {
        setShowCard(false);
      }
    };

    if (showCard) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCard]);

  const formatCitationNumber = (num: number) => {
    // ChatGPT style: simple numbers in brackets
    return num.toString();
  };

  return (
    <span ref={citationRef} className="relative inline-block">
      <span
        className={`cursor-pointer select-none transition-all duration-200 text-xs px-1 py-0 rounded-full inline-block ${
          theme === 'dark'
            ? 'text-gray-200 bg-gray-600/60 hover:bg-gray-500/80'
            : 'text-gray-600 bg-gray-200/60 hover:bg-gray-300/80'
        } ${showCard ? 'ring-2 ring-blue-400/30' : ''}`}
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
        aria-expanded={showCard}
        aria-label={`Citation: ${citation.source}${citation.page ? `, Page ${citation.page}` : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick(e as any);
          }
        }}
      >
        {citation.source}
      </span>

      {/* Tooltip */}
      {showTooltip && !showCard && (
        <div
          className="fixed z-50"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
        >
          <CitationTooltip
            citations={[citation]}
            visible={showTooltip}
            onClose={() => setShowTooltip(false)}
          />
        </div>
      )}

      {/* Expandable Card */}
      <CitationCard
        citation={citation}
        citationNumber={citationNumber}
        visible={showCard}
        onClose={() => setShowCard(false)}
      />
    </span>
  );
};