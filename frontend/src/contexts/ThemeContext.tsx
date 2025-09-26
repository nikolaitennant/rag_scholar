import React, { createContext, useContext, useState, useEffect } from 'react';

type BackgroundType = 'classic' | 'gradient' | 'mountain' | 'ocean' | 'sunset' | 'forest';
type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: 'light' | 'dark';
  themeMode: ThemeMode;
  background: BackgroundType;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
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
  const getStorageValue = (key: string, defaultValue: string): string => {
    try {
      return localStorage.getItem(key) || defaultValue;
    } catch (error) {
      console.warn('localStorage not available:', error);
      // For theme specifically, try to use system preference if storage fails
      if (key === 'theme' || key === 'themeMode') {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          return 'dark';
        }
      }
      return defaultValue;
    }
  };

  const setStorageValue = (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('localStorage write failed:', error);
    }
  };

  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    return getStorageValue('themeMode', 'dark') as ThemeMode;
  });

  const getAutoTheme = (): 'light' | 'dark' => {
    const now = new Date();
    const hour = now.getHours();
    // Light mode from 6 AM to 6 PM, dark mode otherwise
    return (hour >= 6 && hour < 18) ? 'light' : 'dark';
  };

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedThemeMode = getStorageValue('themeMode', 'dark') as ThemeMode;
    if (savedThemeMode === 'auto') {
      return getAutoTheme();
    }
    return getStorageValue('theme', 'dark') as 'light' | 'dark';
  });

  const [background, setBackgroundState] = useState<BackgroundType>(() => {
    return getStorageValue('background', 'classic') as BackgroundType;
  });

  const backgroundClasses = {
    classic: theme === 'dark'
      ? 'bg-neutral-800'
      : 'bg-white',
    gradient: theme === 'dark'
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


  // Effect to handle theme mode changes and auto mode
  useEffect(() => {
    if (themeMode === 'auto') {
      const updateAutoTheme = () => {
        const autoTheme = getAutoTheme();
        setTheme(autoTheme);
      };

      // Update immediately
      updateAutoTheme();

      // Set up interval to check every minute
      const interval = setInterval(updateAutoTheme, 60000);

      return () => clearInterval(interval);
    } else {
      // For manual modes, set theme directly
      setTheme(themeMode as 'light' | 'dark');
    }
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    // Only save theme to localStorage if not in auto mode
    if (themeMode !== 'auto') {
      setStorageValue('theme', theme);
    }
  }, [theme, themeMode]);

  useEffect(() => {
    setStorageValue('themeMode', themeMode);
  }, [themeMode]);

  useEffect(() => {
    setStorageValue('background', background);
  }, [background]);

  const toggleTheme = () => {
    // Cycle through: auto -> light -> dark -> auto
    if (themeMode === 'auto') {
      setThemeModeState('light');
    } else if (themeMode === 'light') {
      setThemeModeState('dark');
    } else {
      setThemeModeState('auto');
    }
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
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
      themeMode,
      background,
      toggleTheme,
      setThemeMode,
      setBackground,
      getBackgroundClass
    }}>
      {children}
    </ThemeContext.Provider>
  );
};