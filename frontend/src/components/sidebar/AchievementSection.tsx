import React from 'react';
import { Star, Award, Zap, Trophy, Target, BookOpen, MessageCircle, Upload, Sparkles } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface Achievement {
  id: string;
  type: string;
  name: string;
  description: string;
  unlocked_at: string | null;
  progress?: number;
  required?: number;
  points?: number;
  target?: number;
}

interface UserProfile {
  achievements?: Achievement[];
  stats?: {
    total_points?: number;
  };
}

interface AchievementSectionProps {
  userProfile: UserProfile | null;
}

export const AchievementSection: React.FC<AchievementSectionProps> = ({ userProfile }) => {
  const { theme } = useTheme();

  const achievements = userProfile?.achievements || [];
  const totalPoints = userProfile?.stats?.total_points || 0;

  // Map achievement types to icons
  const getAchievementIcon = (type: string) => {
    const iconMap: { [key: string]: any } = {
      first_chat: MessageCircle,
      prolific_researcher: Target,
      document_uploader: Upload,
      early_adopter: Trophy,
      knowledge_seeker: BookOpen,
      domain_explorer: Sparkles,
    };
    return iconMap[type] || Trophy;
  };

  // Map achievement types to colors
  const getAchievementColor = (type: string) => {
    const colorMap: { [key: string]: string } = {
      first_chat: 'text-blue-400',
      prolific_researcher: theme === 'dark' ? 'text-green-400' : 'text-green-800',
      document_uploader: 'text-orange-400',
      early_adopter: 'text-yellow-400',
      knowledge_seeker: 'text-indigo-400',
      domain_explorer: 'text-purple-400',
    };
    return colorMap[type] || 'text-gray-400';
  };

  // Separate achievements into achieved and open
  const achievedAchievements = achievements.filter(achievement => achievement.unlocked_at !== null);
  const openAchievements = achievements.filter(achievement => achievement.unlocked_at === null);

  const renderAchievement = (achievement: Achievement) => {
    const Icon = getAchievementIcon(achievement.type);
    const isUnlocked = achievement.unlocked_at !== null;
    return (
      <div
        key={achievement.type}
        className={`relative p-3 rounded-lg transition-all duration-200 ${
          isUnlocked
            ? (theme === 'dark' ? 'bg-white/10' : 'bg-black/10')
            : (theme === 'dark' ? 'bg-white/5' : 'bg-black/5')
        }`}
      >
        {/* Achievement unlocked glow effect */}
        {isUnlocked && (
          <div className={`absolute inset-0 rounded-lg animate-pulse ${
            theme === 'dark'
              ? 'bg-gradient-to-r from-yellow-400/20 to-orange-400/20'
              : 'bg-gradient-to-r from-yellow-300/40 to-amber-400/40'
          }`} />
        )}

        <div className="relative">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon className={`w-5 h-5 ${getAchievementColor(achievement.type)}`} />
              {isUnlocked && (
                <Award className={`w-4 h-4 ${
                theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
              }`} />
              )}
            </div>
            {/* Points display for both unlocked and locked achievements */}
            <div className={`rounded-full px-3 py-1 flex items-center gap-1 whitespace-nowrap ${
              isUnlocked
                ? theme === 'dark'
                  ? 'bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border border-yellow-400/40'
                  : 'bg-gradient-to-r from-yellow-300/50 to-amber-400/50 border border-amber-500/50'
                : 'bg-gradient-to-r from-blue-400/20 to-purple-400/20 border border-purple-400/40'
            }`}>
              <Zap className={`w-3 h-3 ${
                isUnlocked
                  ? theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
                  : 'text-purple-400'
              }`} />
              <span className={`text-xs font-bold ${
                isUnlocked
                  ? theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
                  : 'text-purple-400'
              }`}>
                +{achievement.points}{isUnlocked ? '' : ' pts'}
              </span>
            </div>
          </div>

          <h4 className={`text-sm font-medium mb-1 ${
            isUnlocked
              ? (theme === 'dark' ? 'text-white' : 'text-black')
              : (theme === 'dark' ? 'text-white/60' : 'text-black/60')
          }`}>
            {achievement.name}
          </h4>

          <p className={`text-xs mb-2 ${
            theme === 'dark' ? 'text-white/70' : 'text-black/70'
          }`}>
            {achievement.description}
          </p>

          {/* Progress bar for locked achievements */}
          {!isUnlocked && (
            <div className="space-y-1">
              <div className={`w-full rounded-full h-2 ${
                theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
              }`}>
                <div
                  className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((achievement.progress || 0) / (achievement.target || achievement.required || 1)) * 100}%` }}
                />
              </div>
              <div className="text-right">
                <span className={`text-xs ${
                  theme === 'dark' ? 'text-white/50' : 'text-black/50'
                }`}>
                  {achievement.progress || 0}/{achievement.target || achievement.required || 0}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`text-sm font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-black'
          }`}>Rewards</h3>
          <p className={`text-xs mt-1 ${
            theme === 'dark' ? 'text-white/60' : 'text-black/60'
          }`}>{achievedAchievements.length} of {achievements.length} completed</p>
        </div>
        <div className={`rounded-full px-4 py-1.5 flex items-center gap-2 whitespace-nowrap ${
          theme === 'dark'
            ? 'bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border border-yellow-400/40'
            : 'bg-gradient-to-r from-yellow-300/50 to-amber-400/50 border border-amber-500/50'
        }`}>
          <Star className={`w-4 h-4 ${
            theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
          }`} />
          <span className={`font-bold text-sm ${
            theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
          }`}>
            {totalPoints} pts
          </span>
        </div>
      </div>

      <div className="space-y-6 min-h-[calc(100vh-16rem)] overflow-y-auto scrollbar-none">
        {/* Goals Section - Show first */}
        {openAchievements.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <Target className="w-4 h-4 text-blue-400" />
              <h4 className={`text-xs font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}>
                GOALS ({openAchievements.length})
              </h4>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {openAchievements.map(renderAchievement)}
            </div>
          </div>
        )}

        {/* Unlocked Section - Show after goals */}
        {achievedAchievements.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <Trophy className={`w-4 h-4 ${
                theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
              }`} />
              <h4 className={`text-xs font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}>
                UNLOCKED ({achievedAchievements.length})
              </h4>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {achievedAchievements.map(renderAchievement)}
            </div>
          </div>
        )}

        {/* Empty state */}
        {achievements.length === 0 && (
          <div className="text-center py-8">
            <Trophy className={`w-12 h-12 mx-auto mb-3 ${
              theme === 'dark' ? 'text-white/30' : 'text-black/30'
            }`} />
            <p className={`text-sm ${
              theme === 'dark' ? 'text-white/60' : 'text-black/60'
            }`}>No rewards yet</p>
            <p className={`text-xs mt-1 ${
              theme === 'dark' ? 'text-white/40' : 'text-black/40'
            }`}>Start using RAG Scholar to unlock rewards!</p>
          </div>
        )}
      </div>
    </div>
  );
};