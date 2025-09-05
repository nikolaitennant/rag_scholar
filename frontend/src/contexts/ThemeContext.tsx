import React, { createContext, useContext, useState, useEffect } from 'react';

type BackgroundType = 'none' | 'mountain' | 'ocean' | 'sunset' | 'forest';

interface ThemeContextType {
  theme: 'light' | 'dark';
  background: BackgroundType;
  toggleTheme: () => void;
  setBackground: (bg: BackgroundType) => void;
  getBackgroundClass: () => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [background, setBackgroundState] = useState<BackgroundType>('none');

  const backgroundClasses = {
    none: theme === 'dark' 
      ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
      : 'bg-gradient-to-br from-blue-200 via-indigo-100 to-purple-200',
    mountain: theme === 'dark'
      ? 'bg-gradient-to-br from-slate-800 via-stone-900 to-amber-900'
      : 'bg-gradient-to-br from-stone-200 via-amber-100 to-yellow-200',
    ocean: theme === 'dark'
      ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900'
      : 'bg-gradient-to-br from-blue-200 via-cyan-100 to-teal-200',
    sunset: theme === 'dark'
      ? 'bg-gradient-to-br from-orange-900 via-pink-900 to-purple-900'
      : 'bg-gradient-to-br from-orange-200 via-pink-100 to-purple-200',
    forest: theme === 'dark'
      ? 'bg-gradient-to-br from-emerald-900 via-green-900 to-cyan-900'
      : 'bg-gradient-to-br from-green-200 via-emerald-100 to-cyan-200',
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const savedBackground = localStorage.getItem('background') as BackgroundType | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
    if (savedBackground) {
      setBackgroundState(savedBackground);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('background', background);
  }, [background]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setBackground = (bg: BackgroundType) => {
    setBackgroundState(bg);
  };

  const getBackgroundClass = () => {
    return backgroundClasses[background];
  };

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      background, 
      toggleTheme, 
      setBackground, 
      getBackgroundClass 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};