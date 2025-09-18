import React, { useState, useEffect } from 'react';
import { X, User, Mail, LogOut, Palette, Clock, Shield, Sparkles, Bell, Globe, Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, themeMode, toggleTheme, background, setBackground } = useTheme();
  const { user, userProfile, logout, updateUserProfile } = useUser();
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    bio: userProfile?.profile?.bio || '',
  });
  const [timezone, setTimezone] = useState(() => {
    return localStorage.getItem('userTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const backgroundOptions = [
    { id: 'none', name: 'Default', color: 'from-blue-500 to-purple-600' },
    { id: 'mountain', name: 'Mountain', color: 'from-orange-500 to-amber-600' },
    { id: 'ocean', name: 'Ocean', color: 'from-blue-500 to-cyan-600' },
    { id: 'sunset', name: 'Sunset', color: 'from-orange-500 to-pink-600' },
    { id: 'forest', name: 'Forest', color: 'from-green-500 to-emerald-600' },
  ];

  useEffect(() => {
    localStorage.setItem('userTimezone', timezone);
  }, [timezone]);

  if (!isOpen) return null;

  const handleSaveProfile = async () => {
    setIsLoading(true);
    setSaveMessage(null);

    try {
      const updateData: any = {
        name: formData.name,
        bio: formData.bio || null,
        research_interests: [],
        preferred_domains: [],
      };

      await updateUserProfile(updateData);
      setSaveMessage('Profile updated successfully!');

      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage('Failed to save changes. Please try again.');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-lg"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-2xl mx-4 rounded-2xl shadow-2xl overflow-hidden ${
        theme === 'dark'
          ? 'bg-gray-900/95 backdrop-blur-xl border border-white/10'
          : 'bg-white/95 backdrop-blur-xl border border-gray-200/50'
      }`}>

        {/* Header */}
        <div className={`p-6 border-b ${
          theme === 'dark' ? 'border-white/10' : 'border-gray-200/50'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Settings
              </h2>
              <p className={`text-sm mt-1 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Customize your experience
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all duration-200 ${
                theme === 'dark'
                  ? 'hover:bg-white/10 text-gray-400 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto">

          {/* Profile Section */}
          <div className={`p-6 rounded-xl border ${
            theme === 'dark'
              ? 'bg-white/5 border-white/10'
              : 'bg-gray-50/50 border-gray-200/50'
          }`}>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Profile
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Your account details
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 ${
                    theme === 'dark'
                      ? 'bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-blue-400'
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className={`w-full px-4 py-3 rounded-lg border cursor-not-allowed opacity-60 ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-gray-400'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>

          {/* Appearance Section */}
          <div className={`p-6 rounded-xl border ${
            theme === 'dark'
              ? 'bg-white/5 border-white/10'
              : 'bg-gray-50/50 border-gray-200/50'
          }`}>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Appearance
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Theme and visual preferences
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Theme Toggle */}
              <div>
                <label className={`block text-sm font-medium mb-3 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Color Theme
                </label>
                <button
                  onClick={toggleTheme}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 ${
                    theme === 'dark'
                      ? 'border-white/20 hover:border-white/40 bg-white/5'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {theme === 'dark' ? (
                      <Moon className="w-5 h-5 text-blue-400" />
                    ) : (
                      <Sun className="w-5 h-5 text-orange-500" />
                    )}
                    <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {themeMode === 'auto' ? `Auto (${theme})` : theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    </span>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-colors duration-200 ${
                    theme === 'dark' ? 'bg-blue-500' : 'bg-gray-300'
                  }`}>
                    <div className={`w-5 h-5 mt-0.5 rounded-full bg-white transition-transform duration-200 ${
                      theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </div>
                </button>
              </div>

              {/* Background Style */}
              <div>
                <label className={`block text-sm font-medium mb-3 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Background Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {backgroundOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setBackground(option.id as any)}
                      className={`relative h-16 rounded-lg border-2 transition-all duration-200 overflow-hidden ${
                        background === option.id
                          ? 'border-blue-500 ring-2 ring-blue-500/20'
                          : theme === 'dark'
                            ? 'border-white/20 hover:border-white/40'
                            : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${option.color}`} />
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white font-medium text-xs drop-shadow-lg">
                          {option.name}
                        </span>
                      </div>
                      {background === option.id && (
                        <div className="absolute top-2 right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div className={`p-6 rounded-xl border ${
            theme === 'dark'
              ? 'bg-white/5 border-white/10'
              : 'bg-gray-50/50 border-gray-200/50'
          }`}>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Preferences
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Regional and behavior settings
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border transition-all duration-200 ${
                    theme === 'dark'
                      ? 'bg-white/10 border-white/20 text-white focus:border-blue-400'
                      : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                    Auto-detect
                  </option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                </select>
              </div>

              <div className={`p-4 rounded-lg border ${
                theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center space-x-3">
                  <Globe className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                  <div className="text-sm">
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Current Time
                    </p>
                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {new Date().toLocaleString('en-US', {
                        timeZone: timezone,
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Section */}
          <div className={`p-6 rounded-xl border ${
            theme === 'dark'
              ? 'bg-white/5 border-white/10'
              : 'bg-gray-50/50 border-gray-200/50'
          }`}>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Account
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Security and account management
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${
                theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {user?.displayName || 'User'}
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {user?.email}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className={`w-full flex items-center justify-center space-x-2 p-3 rounded-lg border-2 transition-all duration-200 ${
                  theme === 'dark'
                    ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className={`mx-6 mb-6 p-4 rounded-lg border ${
            saveMessage.includes('successfully')
              ? theme === 'dark'
                ? 'bg-green-900/20 border-green-500/30 text-green-400'
                : 'bg-green-50 border-green-200 text-green-700'
              : theme === 'dark'
                ? 'bg-red-900/20 border-red-500/30 text-red-400'
                : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <p className="text-sm text-center font-medium">{saveMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};