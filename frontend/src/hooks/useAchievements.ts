import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

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
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState<Achievement[]>([]);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    try {
      const profile: UserProfile = await apiService.getUserProfile();
      const currentAchievements = profile.achievements || [];

      // Check for newly unlocked achievements
      if (lastChecked && achievements.length > 0) {
        const newUnlocked = currentAchievements.filter(achievement => {
          const oldAchievement = achievements.find(a => a.id === achievement.id || a.type === achievement.type);
          // Achievement is newly unlocked if it wasn't unlocked before but is now
          return oldAchievement && !oldAchievement.unlocked_at && achievement.unlocked_at;
        });

        if (newUnlocked.length > 0) {
          console.log('🎉 New achievements unlocked:', newUnlocked.map(a => a.name));
          setNewlyUnlocked(prev => [...prev, ...newUnlocked]);
        }
      }

      setAchievements(currentAchievements);
      setLastChecked(new Date().toISOString());
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    }
  }, [achievements, lastChecked]);

  const dismissNotification = useCallback((achievementId: string) => {
    setNewlyUnlocked(prev => prev.filter(a => a.id !== achievementId));
  }, []);

  const checkForNewAchievements = useCallback(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  useEffect(() => {
    // Only fetch achievements if we have access to API
    const timer = setTimeout(() => {
      fetchAchievements();
    }, 1000); // Small delay to ensure auth is ready

    return () => clearTimeout(timer);
  }, []);

  return {
    achievements,
    newlyUnlocked,
    dismissNotification,
    checkForNewAchievements,
    fetchAchievements
  };
};