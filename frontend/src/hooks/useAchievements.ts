import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import { useUser } from '../contexts/UserContext';

interface Achievement {
  id: string;
  type: string;
  name: string;
  description: string;
  points: number;
  icon?: string;
  unlocked_at?: string | null;
  progress: number;
  target: number;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  created_at: string;
  is_active: boolean;
  stats: any;
  profile: any;
  achievements: Achievement[];
}

export const useAchievements = () => {
  const { isAuthenticated, loading } = useUser();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([]);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const achievementsRef = useRef<Achievement[]>([]);

  const fetchAchievements = useCallback(async (forceRefresh = false) => {
    // Only fetch if user is authenticated
    if (!isAuthenticated) {
      return;
    }

    try {
      const profile: UserProfile = await apiService.getUserProfile();
      const currentAchievements = profile.achievements || [];

      // Check for newly unlocked achievements (only if we have previous state)
      if (!forceRefresh && lastChecked && achievementsRef.current.length > 0) {
        const newUnlocked = currentAchievements.filter(achievement => {
          const oldAchievement = achievementsRef.current.find(a => a.id === achievement.id || a.type === achievement.type);
          // Achievement is newly unlocked if it wasn't unlocked before but is now
          const wasUnlocked = oldAchievement?.unlocked_at;
          const isNowUnlocked = achievement.unlocked_at;
          const isNew = oldAchievement && !wasUnlocked && isNowUnlocked;

          return isNew;
        });

        if (newUnlocked.length > 0) {
          setNewlyUnlocked(prev => [...prev, ...newUnlocked]);
        }
      }

      achievementsRef.current = currentAchievements;
      setAchievements(currentAchievements);
      setLastChecked(new Date().toISOString());
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    }
  }, [isAuthenticated]);

  const dismissNotification = useCallback((achievementId: string) => {
    setNewlyUnlocked(prev => prev.filter(a => a.id !== achievementId));
  }, []);

  const checkForNewAchievements = useCallback(async () => {
    await fetchAchievements(false);
  }, [fetchAchievements]);

  useEffect(() => {
    // Only fetch achievements if user is authenticated and not loading
    if (isAuthenticated && !loading) {
      const timer = setTimeout(() => {
        fetchAchievements();
      }, 1000); // Small delay to ensure auth is ready

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, loading, fetchAchievements]);

  return {
    achievements,
    newlyUnlocked,
    dismissNotification,
    checkForNewAchievements,
    fetchAchievements
  };
};