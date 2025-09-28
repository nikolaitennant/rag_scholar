import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';

interface SplashScreenProps {
  isVisible: boolean;
  onTransitionComplete?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isVisible,
  onTransitionComplete
}) => {
  const [showContent, setShowContent] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Show content after a brief delay for smooth appearance
      const contentTimer = setTimeout(() => {
        setShowContent(true);
      }, 150);

      return () => clearTimeout(contentTimer);
    } else {
      // Start fade out
      setFadeOut(true);

      // Complete transition after fade animation
      const fadeTimer = setTimeout(() => {
        onTransitionComplete?.();
      }, 500); // Match the fade duration

      return () => clearTimeout(fadeTimer);
    }
  }, [isVisible, onTransitionComplete]);

  if (!isVisible && !fadeOut) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-500 ease-out ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: '#0D0D0D',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
        pointerEvents: fadeOut ? 'none' : 'auto'
      }}
    >
      {/* Main content container */}
      <div className={`flex flex-col items-center justify-center space-y-6 transition-all duration-700 ease-out ${
        showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}>

        {/* Simple book icon with gentle pulse and brand color tint */}
        <div className="relative">
          <div className={`w-16 h-16 flex items-center justify-center transition-all duration-700 delay-100 ease-out ${
            showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}>
            <BookOpen
              className="w-12 h-12 text-white animate-pulse"
              style={{
                animationDuration: '2s',
                animationIterationCount: 'infinite'
              }}
            />
          </div>
        </div>

        {/* App name */}
        <div className={`text-center transition-all duration-700 delay-200 ease-out ${
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
              fontWeight: 600
            }}
          >
            <span
              className="bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] bg-clip-text text-transparent"
              style={{
                filter: 'drop-shadow(0 2px 8px rgba(139, 92, 246, 0.25))'
              }}
            >
              RAG Scholar
            </span>
            <span className="text-white">
              <span className="animate-dot-1">.</span><span className="animate-dot-2">.</span><span className="animate-dot-3">.</span>
            </span>
          </h1>
        </div>

      </div>
    </div>
  );
};