import React from 'react';
import { X, Camera, User as UserIcon } from 'lucide-react';

interface ProfileImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChangePhoto?: () => void;
  imageUrl?: string;
  userName: string;
  showChangeButton?: boolean;
}

export const ProfileImageModal: React.FC<ProfileImageModalProps> = ({
  isOpen,
  onClose,
  onChangePhoto,
  imageUrl,
  userName,
  showChangeButton = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center">
      {/* iOS-style frosted glass backdrop */}
      <div
        className="absolute inset-0 bg-white/10 backdrop-blur-3xl"
        onClick={onClose}
        style={{
          backdropFilter: 'blur(60px) saturate(180%) brightness(0.3)',
          WebkitBackdropFilter: 'blur(60px) saturate(180%) brightness(0.3)'
        }}
      />

      {/* Main content */}
      <div
        className="relative flex flex-col items-center justify-center animate-fade-in"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif'
        }}
      >
        {/* Large profile image */}
        <div className="relative mb-8">
          <div className="w-64 h-64 rounded-full overflow-hidden bg-white/10 shadow-2xl">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={userName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <UserIcon className="w-24 h-24 text-white/30" />
              </div>
            )}
          </div>

          {/* iOS-style glow effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* User name with iOS typography */}
        <h2 className="text-white text-3xl font-light tracking-tight mb-2 text-center">
          {userName}
        </h2>

        {/* iOS-style change photo button */}
        {showChangeButton && onChangePhoto && (
          <button
            onClick={() => {
              onChangePhoto();
              onClose();
            }}
            className="mt-6 px-8 py-4 bg-white/15 backdrop-blur-md rounded-full text-white font-medium transition-all duration-200 hover:bg-white/20 active:scale-95"
            style={{
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)'
            }}
          >
            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5" />
              <span>Change Photo</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};