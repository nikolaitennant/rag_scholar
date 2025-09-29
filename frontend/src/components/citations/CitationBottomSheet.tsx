import React, { useState, useEffect, useRef } from 'react';
import { Citation } from '../../types';

interface CitationBottomSheetProps {
  citations: Citation[];
  visible: boolean;
  onClose: () => void;
}

export const CitationBottomSheet: React.FC<CitationBottomSheetProps> = ({
  citations,
  visible,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [startY, setStartY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
      setCurrentIndex(0);
      setDragY(0);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [visible]);

  // Handle touch events for swipe to dismiss
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setStartY(touch.clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - startY;

    // Only allow downward dragging
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;

    setIsDragging(false);

    // If dragged down more than 100px, close the sheet
    if (dragY > 100) {
      onClose();
    } else {
      setDragY(0);
    }
  };

  // Handle horizontal swipe for source navigation
  const [swipeStartX, setSwipeStartX] = useState(0);
  const [swipeCurrentX, setSwipeCurrentX] = useState(0);
  const [isSwipingHorizontal, setIsSwipingHorizontal] = useState(false);

  const handleContentTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setSwipeStartX(touch.clientX);
    setSwipeCurrentX(touch.clientX);
    setIsSwipingHorizontal(false);
  };

  const handleContentTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setSwipeCurrentX(touch.clientX);

    const deltaX = Math.abs(touch.clientX - swipeStartX);
    const deltaY = Math.abs(touch.clientY - startY);

    // Determine if this is a horizontal swipe
    if (deltaX > deltaY && deltaX > 10) {
      setIsSwipingHorizontal(true);
      e.preventDefault();
    }
  };

  const handleContentTouchEnd = () => {
    if (!isSwipingHorizontal || citations.length <= 1) return;

    const deltaX = swipeCurrentX - swipeStartX;
    const threshold = 50;

    if (deltaX > threshold && currentIndex > 0) {
      // Swipe right - previous source
      setCurrentIndex(prev => prev - 1);
    } else if (deltaX < -threshold && currentIndex < citations.length - 1) {
      // Swipe left - next source
      setCurrentIndex(prev => prev + 1);
    }

    setIsSwipingHorizontal(false);
  };

  const getSourceIcon = (source: string) => {
    const lowerSource = source.toLowerCase();
    if (lowerSource.includes('arxiv')) return '📄';
    if (lowerSource.includes('pdf')) return '📄';
    if (lowerSource.includes('wiki')) return '📖';
    if (lowerSource.includes('web') || lowerSource.includes('http')) return '🌐';
    if (lowerSource.includes('medium')) return '📰';
    return '📑';
  };

  const getDocumentTitle = (citation: Citation) => {
    if (citation.preview && citation.preview.length > 20) {
      const words = citation.preview.split(' ');
      // Take first 8-10 words as title
      const title = words.slice(0, 8).join(' ');
      return title.length < citation.preview.length ? title + '...' : title;
    }
    return citation.source || 'Untitled Document';
  };

  const getPreviewText = (citation: Citation) => {
    if (citation.preview && citation.preview.length > 20) {
      const words = citation.preview.split(' ');
      // Skip the title words and take the rest as preview
      const preview = words.slice(8).join(' ');
      return preview.length > 200 ? preview.substring(0, 200) + '...' : preview;
    }
    return 'No preview available';
  };

  const formatDate = () => {
    return 'Recent'; // Placeholder - would parse actual date from citation metadata
  };

  if (!visible || citations.length === 0) return null;

  const currentCitation = citations[currentIndex];
  const hasMultipleSources = citations.length > 1;

  return (
    <>
      {/* Enhanced dimming backdrop */}
      <div
        className={`fixed inset-0 z-[100] transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          background: 'rgba(0, 0, 0, 0.6)'
        }}
        onClick={onClose}
      />

      {/* Floating Frosted Glass Modal */}
      <div
        ref={sheetRef}
        className="fixed z-[110]"
        style={{
          left: '16px',
          right: '16px',
          bottom: '90px',
          opacity: visible ? 1 : 0,
          transform: `translateY(${isDragging ? dragY : visible ? '0px' : 'calc(100% + 100px)'}px)`,
          transition: isDragging ? 'none' : 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          pointerEvents: visible ? 'auto' : 'none'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10"
          style={{
            background: 'transparent',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            minHeight: '30vh',
            maxHeight: '50vh'
          }}
        >
          {/* Header */}
          <div className="px-6 pt-4 pb-2">
            {hasMultipleSources && (
              <p className="text-sm text-white/70 text-center">
                {currentIndex + 1} of {citations.length} sources
              </p>
            )}
          </div>

          {/* Content */}
          <div
            ref={contentRef}
            className="px-6 pb-6 overflow-y-auto flex-1"
            style={{ minHeight: '20vh', maxHeight: 'calc(50vh - 60px)' }}
            onTouchStart={handleContentTouchStart}
            onTouchMove={handleContentTouchMove}
            onTouchEnd={handleContentTouchEnd}
          >
            {/* Article Title */}
            <h4 className="font-bold text-lg mb-2 leading-tight text-white">
              {getDocumentTitle(currentCitation)}
            </h4>

            {/* Metadata */}
            <div className="text-xs mb-3 text-white/70">
              <span>{formatDate()}</span>
              {currentCitation.page && (
                <>
                  <span className="mx-2">•</span>
                  <span>Page {currentCitation.page}</span>
                </>
              )}
            </div>

            {/* Preview Text */}
            <div className="text-sm leading-relaxed text-white/90">
              {getPreviewText(currentCitation)}
            </div>
          </div>

          {/* Pagination dots for multiple sources */}
          {hasMultipleSources && (
            <div className="flex justify-center pb-4">
              <div className="flex gap-2">
                {citations.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentIndex
                        ? 'bg-white'
                        : 'bg-white/40'
                    }`}
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};