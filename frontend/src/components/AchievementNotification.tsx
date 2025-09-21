import React, { useEffect, useState } from 'react';
import { Trophy, X } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  points: number;
  icon?: string;
}

interface AchievementNotificationProps {
  achievement: Achievement;
  onClose: () => void;
}

export const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  achievement,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);

    // Auto-close after 5 seconds
    const autoClose = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(autoClose);
    };
  }, [onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 dark:from-yellow-500 dark:to-orange-600
                      text-white rounded-lg shadow-lg p-4 min-w-[320px] max-w-[400px]">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="bg-white/20 rounded-full p-2">
                <Trophy className="w-6 h-6" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Achievement Unlocked!</h3>
              <h4 className="font-semibold text-base mb-1">{achievement.name}</h4>
              <p className="text-sm opacity-90 mb-2">{achievement.description}</p>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                  +{achievement.points} points
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};