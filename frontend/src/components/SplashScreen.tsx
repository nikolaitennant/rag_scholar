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
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: '#0D0D0D',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
      }}
    >
      {/* Main content container */}
      <div className={`flex flex-col items-center justify-center space-y-6 transition-all duration-700 ease-out ${
        showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}>

        {/* Simple book icon with gentle pulse */}
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
          <h1 className="text-white text-2xl font-semibold tracking-tight">
            RAG Scholar
          </h1>
        </div>

        {/* Loading text */}
        <div className={`text-center transition-all duration-700 delay-300 ease-out ${
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}>
          <p className="text-gray-500 text-sm font-normal">
            Loading your workspace...
          </p>
        </div>
      </div>
    </div>
  );
};