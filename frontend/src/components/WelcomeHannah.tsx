import React from 'react';
import { Heart } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface WelcomeHannahProps {
  messageCount: number;
  currentTime: string;
  backgroundCommandCount?: number;
}

export const WelcomeHannah: React.FC<WelcomeHannahProps> = ({ messageCount, currentTime }) => {
  const { theme } = useTheme();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning, Hannah!";
    if (hour < 17) return "Good afternoon, Hannah!";
    return "Good evening, Hannah!";
  };

  return (
    <div className="text-center py-2">
      <h2 className={`text-xl font-semibold flex items-center justify-center gap-2 ${
        theme === 'dark' ? 'text-white' : 'text-black'
      }`}>
        {getGreeting()}
        <Heart className="w-4 h-4 text-pink-400 animate-pulse" />
      </h2>
    </div>
  );
};