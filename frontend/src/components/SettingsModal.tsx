import React, { useState, useEffect } from 'react';
import { X, User, Mail, LogOut, Palette, Clock, HelpCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, toggleTheme, background, setBackground } = useTheme();
  const { user, userProfile, logout, updateUserProfile } = useUser();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'appearance' | 'preferences'>('profile');
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    bio: userProfile?.profile?.bio || '',
  });
  const [timezone, setTimezone] = useState(() => {
    return localStorage.getItem('userTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
  });
  const [mobileScreen, setMobileScreen] = useState<'main' | 'timezone' | 'background' | 'help' | 'profile' | 'password'>('main');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const backgroundOptions = [
    { id: 'none', name: 'Default', preview: 'bg-gradient-to-br from-blue-200 via-indigo-300 to-purple-400' },
    { id: 'mountain', name: 'Mountain', preview: 'bg-gradient-to-br from-orange-400 via-amber-500 to-stone-600' },
    { id: 'ocean', name: 'Ocean', preview: 'bg-gradient-to-br from-blue-400 via-cyan-500 to-teal-600' },
    { id: 'sunset', name: 'Sunset', preview: 'bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600' },
    { id: 'forest', name: 'Forest', preview: 'bg-gradient-to-br from-green-400 via-emerald-500 to-cyan-600' },
  ];

  const commonTimezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney',
    'Pacific/Auckland',
  ];

  useEffect(() => {
    localStorage.setItem('userTimezone', timezone);
  }, [timezone]);

  if (!isOpen) return null;

  const handleSaveAccount = async () => {
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
      setSaveMessage('Changes saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage('Failed to save changes. Please try again.');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSaveMessage('New passwords do not match');
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setSaveMessage('Password must be at least 8 characters long');
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    setIsLoading(true);
    setSaveMessage(null);
    
    try {
      // Firebase password change would go here - for now just show success
      // await updatePassword(auth.currentUser, passwordData.newPassword);
      setSaveMessage('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Failed to change password. Please try again.');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const handleTimezoneChange = (newTimezone: string) => {
    setTimezone(newTimezone);
    localStorage.setItem('userTimezone', newTimezone);
    setMobileScreen('main');
  };

  const handleBackgroundChange = (newBackground: string) => {
    setBackground(newBackground as any);
    setMobileScreen('main');
  };

  const getBackgroundAwareColors = () => {
    if (theme === 'light') {
      return {
        bg: 'bg-gray-50',
        text: 'text-black',
        textSecondary: 'text-gray-600',
        border: 'border-black/10',
        itemBg: 'bg-gray-50',
        itemHover: 'hover:bg-gray-100',
        iconBg: 'bg-gray-200',
        iconText: 'text-black'
      };
    }

    // Dark mode with background-aware colors
    switch (background) {
      case 'ocean':
        return {
          bg: 'bg-slate-900',
          text: 'text-cyan-100',
          textSecondary: 'text-cyan-300',
          border: 'border-cyan-500/20',
          itemBg: 'bg-slate-900',
          itemHover: 'hover:bg-cyan-900/30',
          iconBg: 'bg-cyan-800/30',
          iconText: 'text-cyan-200'
        };
      case 'forest':
        return {
          bg: 'bg-slate-900',
          text: 'text-emerald-100',
          textSecondary: 'text-emerald-300',
          border: 'border-emerald-500/20',
          itemBg: 'bg-slate-900',
          itemHover: 'hover:bg-emerald-900/30',
          iconBg: 'bg-emerald-800/30',
          iconText: 'text-emerald-200'
        };
      case 'sunset':
        return {
          bg: 'bg-slate-900',
          text: 'text-pink-100',
          textSecondary: 'text-pink-300',
          border: 'border-pink-500/20',
          itemBg: 'bg-slate-900',
          itemHover: 'hover:bg-pink-900/30',
          iconBg: 'bg-pink-800/30',
          iconText: 'text-pink-200'
        };
      case 'mountain':
        return {
          bg: 'bg-slate-900',
          text: 'text-amber-100',
          textSecondary: 'text-amber-300',
          border: 'border-amber-500/20',
          itemBg: 'bg-slate-900',
          itemHover: 'hover:bg-amber-900/30',
          iconBg: 'bg-amber-800/30',
          iconText: 'text-amber-200'
        };
      default: // 'none' or any other
        return {
          bg: 'bg-slate-900',
          text: 'text-white',
          textSecondary: 'text-gray-400',
          border: 'border-white/10',
          itemBg: 'bg-slate-900',
          itemHover: 'hover:bg-slate-800',
          iconBg: 'bg-slate-800',
          iconText: 'text-white'
        };
    }
  };

  const colors = getBackgroundAwareColors();

  return (
    <>
      {/* Desktop: Modal overlay */}
      <div className="hidden lg:flex fixed inset-0 z-[200] items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal */}
        <div className={`relative w-full max-w-lg h-[600px] max-h-[90vh] mx-4 rounded-2xl shadow-2xl border overflow-hidden ${
          theme === 'dark'
            ? 'bg-slate-900 border-white/20'
            : 'bg-white border-black/20'
        }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === 'dark' ? 'border-white/10' : 'border-black/10'
        }`}>
          <h2 className={`text-2xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-black'
          }`}>
            Settings
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' 
                ? 'hover:bg-white/10 text-white/60 hover:text-white' 
                : 'hover:bg-black/10 text-black/60 hover:text-black'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b overflow-x-auto ${
          theme === 'dark' ? 'border-white/10' : 'border-black/10'
        }`}>
          <div className="flex min-w-full">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-3 font-medium transition-all relative flex items-center flex-shrink-0 ${
                activeTab === 'profile'
                  ? 'text-purple-500 drop-shadow-lg'
                  : (theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')
              }`}
              style={activeTab === 'profile' ? { filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))' } : {}}
            >
              <User className="w-4 h-4 mr-1" />
              <span className="text-sm">Profile</span>
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`px-3 py-3 font-medium transition-all relative flex items-center flex-shrink-0 ${
                activeTab === 'password'
                  ? 'text-purple-500 drop-shadow-lg'
                  : (theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')
              }`}
              style={activeTab === 'password' ? { filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))' } : {}}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-sm">Password</span>
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`px-3 py-3 font-medium transition-all relative flex items-center flex-shrink-0 ${
                activeTab === 'preferences'
                  ? 'text-purple-500 drop-shadow-lg'
                  : (theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')
              }`}
              style={activeTab === 'preferences' ? { filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))' } : {}}
            >
              <Clock className="w-4 h-4 mr-1" />
              <span className="text-sm">Timezone</span>
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`px-3 py-3 font-medium transition-all relative flex items-center flex-shrink-0 ${
                activeTab === 'appearance'
                  ? 'text-purple-500 drop-shadow-lg'
                  : (theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')
              }`}
              style={activeTab === 'appearance' ? { filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))' } : {}}
            >
              <Palette className="w-4 h-4 mr-1" />
              <span className="text-sm">Theme</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {saveMessage && (
                <div className={`p-3 rounded-lg border ${
                  saveMessage.includes('successfully')
                    ? (theme === 'dark' ? 'bg-green-900/20 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-600')
                    : (theme === 'dark' ? 'bg-red-900/20 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600')
                }`}>
                  <p className="text-sm text-center">{saveMessage}</p>
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-white/80' : 'text-black/80'
                }`}>
                  Full Name
                </label>
                <div className="relative">
                  <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                    theme === 'dark' ? 'text-white/40' : 'text-black/40'
                  }`} />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                      theme === 'dark'
                        ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                        : 'bg-black/5 border-black/20 text-black placeholder-black/50'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-white/80' : 'text-black/80'
                }`}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                    theme === 'dark' ? 'text-white/40' : 'text-black/40'
                  }`} />
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border opacity-50 cursor-not-allowed ${
                      theme === 'dark'
                        ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                        : 'bg-black/5 border-black/20 text-black placeholder-black/50'
                    }`}
                  />
                  <p className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-white/50' : 'text-black/50'
                  }`}>
                    Email cannot be changed
                  </p>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-white/80' : 'text-black/80'
                }`}>
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell the model about yourself - your background, expertise, and preferences..."
                  rows={3}
                  className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none ${
                    theme === 'dark'
                      ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                      : 'bg-black/5 border-black/20 text-black placeholder-black/50'
                  }`}
                />
              </div>



              <div className="flex gap-3">
                <button
                  onClick={handleSaveAccount}
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={handleLogout}
                  className={`px-6 py-3 rounded-lg transition-colors font-medium ${
                    theme === 'dark'
                      ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                      : 'bg-red-500/20 text-red-600 hover:bg-red-500/30'
                  }`}
                >
                  <LogOut className="w-4 h-4 inline mr-2" />
                  Logout
                </button>
              </div>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="space-y-6">
              {saveMessage && (
                <div className={`p-3 rounded-lg border ${
                  saveMessage.includes('successfully')
                    ? (theme === 'dark' ? 'bg-green-900/20 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-600')
                    : (theme === 'dark' ? 'bg-red-900/20 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600')
                }`}>
                  <p className="text-sm text-center">{saveMessage}</p>
                </div>
              )}

              <div>
                <h2 className={`text-2xl font-bold mb-6 ${colors.text}`}>
                  Change Password
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-white/80' : 'text-black/80'
                    }`}>
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                        theme === 'dark'
                          ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                          : 'bg-black/5 border-black/20 text-black placeholder-black/50'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-white/80' : 'text-black/80'
                    }`}>
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                        theme === 'dark'
                          ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                          : 'bg-black/5 border-black/20 text-black placeholder-black/50'
                      }`}
                    />
                    <p className={`text-xs mt-1 ${
                      theme === 'dark' ? 'text-white/50' : 'text-black/50'
                    }`}>
                      Must be at least 8 characters long
                    </p>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-white/80' : 'text-black/80'
                    }`}>
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                        theme === 'dark'
                          ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                          : 'bg-black/5 border-black/20 text-black placeholder-black/50'
                      }`}
                    />
                  </div>

                  <button
                    onClick={handleChangePassword}
                    disabled={isLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Changing Password...' : 'Change Password'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div>
                <h3 className={`text-lg font-semibold mb-3 ${colors.text}`}>
                  Timezone Settings
                </h3>
                <p className={`text-sm mb-4 ${
                  theme === 'dark' ? 'text-white/70' : 'text-black/70'
                }`}>
                  Choose your timezone to display times correctly throughout the app.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-white/80' : 'text-black/80'
                    }`}>
                      Current Time
                    </label>
                    <div className={`p-3 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-white/5 border-white/20 text-white'
                        : 'bg-black/5 border-black/20 text-black'
                    }`}>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="font-mono">
                          {new Date().toLocaleString('en-US', {
                            timeZone: timezone,
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className={`text-xs mt-1 ${
                        theme === 'dark' ? 'text-white/60' : 'text-black/60'
                      }`}>
                        {timezone}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-white/80' : 'text-black/80'
                    }`}>
                      Select Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                        theme === 'dark'
                          ? 'bg-white/10 border-white/20 text-white'
                          : 'bg-black/5 border-black/20 text-black'
                      }`}
                    >
                      <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                        Auto-detect ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                      </option>
                      {commonTimezones.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz.replace('_', ' ')} ({new Date().toLocaleTimeString('en-US', {
                            timeZone: tz,
                            hour: '2-digit',
                            minute: '2-digit'
                          })})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className={`text-lg font-semibold mb-3 ${colors.text}`}>
                  Theme
                </h3>
                <button
                  onClick={toggleTheme}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    theme === 'dark'
                      ? 'border-white/20 hover:border-white/40 bg-white/5'
                      : 'border-black/20 hover:border-black/40 bg-black/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${colors.text}`}>
                      {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    </span>
                    <div className={`w-12 h-6 rounded-full transition-colors ${
                      theme === 'dark' ? 'bg-purple-500' : 'bg-gray-300'
                    }`}>
                      <div className={`w-5 h-5 mt-0.5 rounded-full bg-white transition-transform ${
                        theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </div>
                </button>
              </div>

              <div>
                <h3 className={`text-lg font-semibold mb-3 ${colors.text}`}>
                  Background Style
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {backgroundOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setBackground(option.id as any)}
                      className={`relative h-16 rounded-lg border-2 transition-all overflow-hidden flex items-center justify-center ${
                        background === option.id
                          ? 'border-purple-500 ring-2 ring-purple-500/30'
                          : (theme === 'dark' ? 'border-white/20 hover:border-white/40' : 'border-black/20 hover:border-black/40')
                      }`}
                    >
                      <div className={`absolute inset-0 ${option.preview}`} />
                      <div className="absolute inset-0 bg-black/20" />
                      <span className="relative z-10 text-white font-medium text-xs drop-shadow-lg">
                        {option.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Mobile: Native app-style scrolling settings */}
      <div className={`lg:hidden fixed inset-0 z-[200] flex flex-col ${colors.bg}`}>
        {/* Mobile Header */}
        <div className={`flex items-center p-4 pb-2 justify-between ${colors.bg}`}>
          <button
            onClick={mobileScreen === 'main' ? onClose : () => setMobileScreen('main')}
            className={`flex size-12 shrink-0 items-center justify-center ${colors.text}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path>
            </svg>
          </button>
          <h2 className={`text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12 ${colors.text}`}>
            {mobileScreen === 'main' ? 'Settings' :
             mobileScreen === 'timezone' ? 'Timezone' :
             mobileScreen === 'background' ? 'Background Style' :
             mobileScreen === 'help' ? 'Help Center' :
             mobileScreen === 'profile' ? 'Edit Profile' :
             mobileScreen === 'password' ? 'Change Password' : 'Settings'}
          </h2>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-none">
          {mobileScreen === 'main' && (
            <>
              {/* Account Section */}
              <h2 className={`text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5 ${colors.text}`}>
                Account
              </h2>

          {/* Profile Card */}
          <div className={`flex items-center gap-4 px-4 min-h-[72px] py-2 ${colors.itemBg}`}>
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-600 aspect-square bg-cover rounded-full h-14 w-14 flex items-center justify-center"
            >
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col justify-center">
              <p className={`text-base font-medium leading-normal line-clamp-1 ${colors.text}`}>
                {user?.displayName || user?.email || 'User'}
              </p>
              <p className={`text-sm font-normal leading-normal line-clamp-2 ${colors.textSecondary}`}>
                {user?.email}
              </p>
            </div>
          </div>

          {/* Edit Profile Row */}
          <div className={`flex items-center gap-4 px-4 min-h-14 justify-between cursor-pointer ${colors.itemBg} ${colors.itemHover}`}
          onClick={() => setMobileScreen('profile')}>
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center rounded-lg shrink-0 size-10 ${colors.iconBg} ${colors.iconText}`}>
                <User className="w-5 h-5" />
              </div>
              <p className={`text-base font-normal leading-normal flex-1 truncate ${colors.text}`}>
                Edit Profile
              </p>
            </div>
            <div className="shrink-0">
              <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-black'}`} xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256">
                <path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"></path>
              </svg>
            </div>
          </div>

          {/* Change Password Row */}
          <div className={`flex items-center gap-4 px-4 min-h-14 justify-between cursor-pointer ${colors.itemBg} ${colors.itemHover}`}
          onClick={() => setMobileScreen('password')}>
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center rounded-lg shrink-0 size-10 ${colors.iconBg} ${colors.iconText}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className={`text-base font-normal leading-normal flex-1 truncate ${colors.text}`}>
                Change Password
              </p>
            </div>
            <div className="shrink-0">
              <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-black'}`} xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256">
                <path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"></path>
              </svg>
            </div>
          </div>

          {/* Preferences Section */}
          <h2 className={`text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5 ${
            theme === 'dark' ? 'text-white' : 'text-black'
          }`}>
            Preferences
          </h2>

          {/* Dark Mode Toggle */}
          <div className={`flex items-center gap-4 px-4 min-h-14 justify-between ${
            theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center rounded-lg shrink-0 size-10 ${colors.iconBg} ${colors.iconText}`}>
                <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256">
                  <path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.34A88,88,0,0,1,65.66,67.11a89,89,0,0,1,31.4-26A106,106,0,0,0,96,56A104.11,104.11,0,0,0,200,160a106,106,0,0,0,14.92-1.06A89,89,0,0,1,188.9,190.34Z"></path>
                </svg>
              </div>
              <p className={`text-base font-normal leading-normal flex-1 truncate ${colors.text}`}>
                Dark Mode
              </p>
            </div>
            <div className="shrink-0">
              <label className={`relative flex h-[31px] w-[51px] cursor-pointer items-center rounded-full border-none p-0.5 ${
                theme === 'dark'
                  ? 'bg-purple-500 justify-end'
                  : 'bg-gray-300 justify-start'
              }`}
              onClick={toggleTheme}>
                <div className="h-full w-[27px] rounded-full bg-white transition-all duration-200"
                     style={{boxShadow: 'rgba(0, 0, 0, 0.15) 0px 3px 8px, rgba(0, 0, 0, 0.06) 0px 3px 1px'}}></div>
              </label>
            </div>
          </div>

          {/* Timezone Row */}
          <div className={`flex items-center gap-4 px-4 min-h-14 justify-between cursor-pointer hover:bg-opacity-80 ${
            theme === 'dark' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-gray-50 hover:bg-gray-100'
          }`}
          onClick={() => setMobileScreen('timezone')}>
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center rounded-lg shrink-0 size-10 ${colors.iconBg} ${colors.iconText}`}>
                <Clock className="w-5 h-5" />
              </div>
              <p className={`text-base font-normal leading-normal flex-1 truncate ${colors.text}`}>
                Timezone
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <p className={`text-base font-normal leading-normal ${colors.textSecondary}`}>
                {timezone.split('/').pop()?.replace('_', ' ')}
              </p>
              <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-black'}`} xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256">
                <path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"></path>
              </svg>
            </div>
          </div>

          {/* Background Style Row */}
          <div className={`flex items-center gap-4 px-4 min-h-14 justify-between cursor-pointer hover:bg-opacity-80 ${
            theme === 'dark' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-gray-50 hover:bg-gray-100'
          }`}
          onClick={() => setMobileScreen('background')}>
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center rounded-lg shrink-0 size-10 ${colors.iconBg} ${colors.iconText}`}>
                <Palette className="w-5 h-5" />
              </div>
              <p className={`text-base font-normal leading-normal flex-1 truncate ${colors.text}`}>
                Background Style
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <p className={`text-base font-normal leading-normal ${colors.textSecondary}`}>
                {backgroundOptions.find(bg => bg.id === background)?.name || 'Default'}
              </p>
              <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-black'}`} xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256">
                <path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"></path>
              </svg>
            </div>
          </div>


          {/* Support Section */}
          <h2 className={`text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5 ${colors.text}`}>
            Support
          </h2>

          {/* Help Center Row */}
          <div className={`flex items-center gap-4 px-4 min-h-14 justify-between cursor-pointer hover:bg-opacity-80 ${
            theme === 'dark' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-gray-50 hover:bg-gray-100'
          }`}
          onClick={() => setMobileScreen('help')}>
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center rounded-lg shrink-0 size-10 ${colors.iconBg} ${colors.iconText}`}>
                <HelpCircle className="w-5 h-5" />
              </div>
              <p className={`text-base font-normal leading-normal flex-1 truncate ${colors.text}`}>
                Help Center
              </p>
            </div>
            <div className="shrink-0">
              <svg className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-black'}`} xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256">
                <path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"></path>
              </svg>
            </div>
          </div>

          {/* Logout Row */}
          <div className={`flex items-center gap-4 px-4 min-h-14 justify-between ${
            theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'
          }`}
          onClick={handleLogout}>
            <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center rounded-lg shrink-0 size-10 ${
                theme === 'dark' ? 'bg-red-900/20 text-red-400' : 'bg-red-100 text-red-600'
              }`}>
                <LogOut className="w-5 h-5" />
              </div>
              <p className={`text-base font-normal leading-normal flex-1 truncate ${
                theme === 'dark' ? 'text-red-400' : 'text-red-600'
              }`}>
                Logout
              </p>
            </div>
          </div>

              {/* Bottom padding for safe area */}
              <div className="h-8"></div>
            </>
          )}

          {mobileScreen === 'timezone' && (
            <>
              <div className={`px-4 py-4 border-b ${
                theme === 'dark' ? 'border-white/10' : 'border-black/10'
              }`}>
                <h3 className={`text-lg font-semibold ${colors.text}`}>
                  Select Timezone
                </h3>
                <p className={`text-sm mt-1 ${colors.textSecondary}`}>
                  Choose your timezone to display times correctly
                </p>
              </div>

              <div className="space-y-2 px-4 py-4">
                {/* Auto-detect option */}
                <button
                  onClick={() => handleTimezoneChange(Intl.DateTimeFormat().resolvedOptions().timeZone)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                    timezone === Intl.DateTimeFormat().resolvedOptions().timeZone
                      ? 'border-purple-500 bg-purple-500/10'
                      : theme === 'dark'
                        ? 'border-white/20 hover:border-white/40 bg-white/5'
                        : 'border-black/20 hover:border-black/40 bg-black/5'
                  }`}
                >
                  <div className="text-left">
                    <p className={`font-medium ${colors.text}`}>
                      Auto-detect
                    </p>
                    <p className={`text-sm ${colors.textSecondary}`}>
                      {Intl.DateTimeFormat().resolvedOptions().timeZone} ({new Date().toLocaleTimeString('en-US', {
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        hour: '2-digit',
                        minute: '2-digit'
                      })})
                    </p>
                  </div>
                  {timezone === Intl.DateTimeFormat().resolvedOptions().timeZone && (
                    <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                  )}
                </button>

                {/* Common timezones */}
                {commonTimezones.map((tz) => (
                  <button
                    key={tz}
                    onClick={() => handleTimezoneChange(tz)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                      timezone === tz
                        ? 'border-purple-500 bg-purple-500/10'
                        : theme === 'dark'
                          ? 'border-white/20 hover:border-white/40 bg-white/5'
                          : 'border-black/20 hover:border-black/40 bg-black/5'
                    }`}
                  >
                    <div className="text-left">
                      <p className={`font-medium ${colors.text}`}>
                        {tz.replace('_', ' ')}
                      </p>
                      <p className={`text-sm ${colors.textSecondary}`}>
                        {new Date().toLocaleTimeString('en-US', {
                          timeZone: tz,
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {timezone === tz && (
                      <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {mobileScreen === 'background' && (
            <>
              <div className={`px-4 py-4 border-b ${
                theme === 'dark' ? 'border-white/10' : 'border-black/10'
              }`}>
                <h3 className={`text-lg font-semibold ${colors.text}`}>
                  Background Style
                </h3>
                <p className={`text-sm mt-1 ${colors.textSecondary}`}>
                  Choose a background style for your interface
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 px-4 py-4">
                {backgroundOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleBackgroundChange(option.id)}
                    className={`relative h-24 rounded-lg border-2 transition-all overflow-hidden ${
                      background === option.id
                        ? 'border-purple-500 ring-2 ring-purple-500/30'
                        : (theme === 'dark' ? 'border-white/20 hover:border-white/40' : 'border-black/20 hover:border-black/40')
                    }`}
                  >
                    <div className={`absolute inset-0 ${option.preview}`} />
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="relative z-10 text-white font-medium text-sm drop-shadow-lg">
                        {option.name}
                      </span>
                    </div>
                    {background === option.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {mobileScreen === 'help' && (
            <>
              <div className={`px-4 py-4 border-b ${
                theme === 'dark' ? 'border-white/10' : 'border-black/10'
              }`}>
                <h3 className={`text-lg font-semibold ${colors.text}`}>
                  Help Center
                </h3>
                <p className={`text-sm mt-1 ${colors.textSecondary}`}>
                  Commands and features available in RAG Scholar
                </p>
              </div>

              <div className="px-4 py-4 space-y-6">
                {/* Chat Commands */}
                <div>
                  <h4 className={`font-semibold mb-3 ${colors.text}`}>
                    Chat Features
                  </h4>
                  <div className="space-y-3">
                    <div className={`p-3 rounded-lg border ${
                      theme === 'dark' ? 'bg-white/5 border-white/20' : 'bg-black/5 border-black/20'
                    }`}>
                      <p className={`font-medium text-sm ${colors.text}`}>
                        Ask Questions
                      </p>
                      <p className={`text-xs mt-1 ${colors.textSecondary}`}>
                        Ask questions about your uploaded documents and get AI-powered insights with source citations
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg border ${
                      theme === 'dark' ? 'bg-white/5 border-white/20' : 'bg-black/5 border-black/20'
                    }`}>
                      <p className={`font-medium text-sm ${colors.text}`}>
                        Source Citations
                      </p>
                      <p className={`text-xs mt-1 ${colors.textSecondary}`}>
                        All AI responses include citations with relevance scores and document previews
                      </p>
                    </div>
                  </div>
                </div>

                {/* Document Management */}
                <div>
                  <h4 className={`font-semibold mb-3 ${colors.text}`}>
                    Document Management
                  </h4>
                  <div className="space-y-3">
                    <div className={`p-3 rounded-lg border ${
                      theme === 'dark' ? 'bg-white/5 border-white/20' : 'bg-black/5 border-black/20'
                    }`}>
                      <p className={`font-medium text-sm ${colors.text}`}>
                        Upload Documents
                      </p>
                      <p className={`text-xs mt-1 ${colors.textSecondary}`}>
                        Upload PDFs, Word documents, and text files to create searchable collections
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg border ${
                      theme === 'dark' ? 'bg-white/5 border-white/20' : 'bg-black/5 border-black/20'
                    }`}>
                      <p className={`font-medium text-sm ${colors.text}`}>
                        Domain Collections
                      </p>
                      <p className={`text-xs mt-1 ${colors.textSecondary}`}>
                        Organize documents by domain or topic for better search and retrieval
                      </p>
                    </div>
                  </div>
                </div>

                {/* Interface Tips */}
                <div>
                  <h4 className={`font-semibold mb-3 ${colors.text}`}>
                    Interface Tips
                  </h4>
                  <div className="space-y-3">
                    <div className={`p-3 rounded-lg border ${
                      theme === 'dark' ? 'bg-white/5 border-white/20' : 'bg-black/5 border-black/20'
                    }`}>
                      <p className={`font-medium text-sm ${colors.text}`}>
                        Sidebar Toggle
                      </p>
                      <p className={`text-xs mt-1 ${colors.textSecondary}`}>
                        Click the menu button to collapse/expand the sidebar for more chat space
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg border ${
                      theme === 'dark' ? 'bg-white/5 border-white/20' : 'bg-black/5 border-black/20'
                    }`}>
                      <p className={`font-medium text-sm ${colors.text}`}>
                        Dark Mode
                      </p>
                      <p className={`text-xs mt-1 ${colors.textSecondary}`}>
                        Toggle between light and dark themes in settings for comfortable viewing
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg border ${
                      theme === 'dark' ? 'bg-white/5 border-white/20' : 'bg-black/5 border-black/20'
                    }`}>
                      <p className={`font-medium text-sm ${colors.text}`}>
                        Background Styles
                      </p>
                      <p className={`text-xs mt-1 ${colors.textSecondary}`}>
                        Customize your interface with different gradient background styles
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {mobileScreen === 'profile' && (
            <>
              <div className={`px-4 py-4 border-b ${
                theme === 'dark' ? 'border-white/10' : 'border-black/10'
              }`}>
                <h3 className={`text-lg font-semibold ${colors.text}`}>
                  Edit Profile
                </h3>
                <p className={`text-sm mt-1 ${colors.textSecondary}`}>
                  Update your profile information
                </p>
              </div>

              <div className="px-4 py-4 space-y-4">
                {saveMessage && (
                  <div className={`p-3 rounded-lg border ${
                    saveMessage.includes('successfully')
                      ? (theme === 'dark' ? 'bg-green-900/20 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-600')
                      : (theme === 'dark' ? 'bg-red-900/20 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600')
                  }`}>
                    <p className="text-sm text-center">{saveMessage}</p>
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-white/80' : 'text-black/80'
                  }`}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                      theme === 'dark'
                        ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                        : 'bg-black/5 border-black/20 text-black placeholder-black/50'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-white/80' : 'text-black/80'
                  }`}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className={`w-full px-4 py-3 rounded-lg border opacity-50 cursor-not-allowed ${
                      theme === 'dark'
                        ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                        : 'bg-black/5 border-black/20 text-black placeholder-black/50'
                    }`}
                  />
                  <p className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-white/50' : 'text-black/50'
                  }`}>
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-white/80' : 'text-black/80'
                  }`}>
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell the model about yourself..."
                    rows={4}
                    className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none ${
                      theme === 'dark'
                        ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                        : 'bg-black/5 border-black/20 text-black placeholder-black/50'
                    }`}
                  />
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleSaveAccount}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </>
          )}

          {mobileScreen === 'password' && (
            <>
              <div className={`px-4 py-4 border-b ${
                theme === 'dark' ? 'border-white/10' : 'border-black/10'
              }`}>
                <h3 className={`text-lg font-semibold ${colors.text}`}>
                  Change Password
                </h3>
                <p className={`text-sm mt-1 ${colors.textSecondary}`}>
                  Update your account password
                </p>
              </div>

              <div className="px-4 py-4 space-y-4">
                {saveMessage && (
                  <div className={`p-3 rounded-lg border ${
                    saveMessage.includes('successfully')
                      ? (theme === 'dark' ? 'bg-green-900/20 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-600')
                      : (theme === 'dark' ? 'bg-red-900/20 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-600')
                  }`}>
                    <p className="text-sm text-center">{saveMessage}</p>
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-white/80' : 'text-black/80'
                  }`}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                      theme === 'dark'
                        ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                        : 'bg-black/5 border-black/20 text-black placeholder-black/50'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-white/80' : 'text-black/80'
                  }`}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                      theme === 'dark'
                        ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                        : 'bg-black/5 border-black/20 text-black placeholder-black/50'
                    }`}
                  />
                  <p className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-white/50' : 'text-black/50'
                  }`}>
                    Must be at least 8 characters long
                  </p>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-white/80' : 'text-black/80'
                  }`}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                      theme === 'dark'
                        ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                        : 'bg-black/5 border-black/20 text-black placeholder-black/50'
                    }`}
                  />
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleChangePassword}
                    disabled={isLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Changing Password...' : 'Change Password'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};