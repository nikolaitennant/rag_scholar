import React, { useState } from 'react';
import { X, User, Mail, Image, LogOut, Palette } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, toggleTheme, background, setBackground } = useTheme();
  const { user, logout, updateUser, changePassword } = useUser();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'appearance'>('profile');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.profile?.bio || '',
  });
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

      await updateUser(updateData);
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
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-lg h-[600px] mx-4 rounded-2xl shadow-2xl border overflow-hidden ${
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
        <div className={`flex border-b ${
          theme === 'dark' ? 'border-white/10' : 'border-black/10'
        }`}>
          <div className="flex flex-1 justify-center">
            <div className="flex">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-3 font-medium transition-all relative flex items-center ${
                  activeTab === 'profile'
                    ? 'text-purple-500 drop-shadow-lg' 
                    : (theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')
                }`}
                style={activeTab === 'profile' ? { filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))' } : {}}
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`px-4 py-3 font-medium transition-all relative flex items-center ${
                  activeTab === 'password'
                    ? 'text-purple-500 drop-shadow-lg'
                    : (theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')
                }`}
                style={activeTab === 'password' ? { filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))' } : {}}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Password
              </button>
              <button
                onClick={() => setActiveTab('appearance')}
                className={`px-4 py-3 font-medium transition-all relative flex items-center ${
                  activeTab === 'appearance'
                    ? 'text-purple-500 drop-shadow-lg'
                    : (theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')
                }`}
                style={activeTab === 'appearance' ? { filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))' } : {}}
              >
                <Palette className="w-4 h-4 mr-2" />
                Appearance
              </button>
            </div>
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
                <h2 className={`text-2xl font-bold mb-6 ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>
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

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className={`text-lg font-semibold mb-3 ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>
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
                    <span className={`font-medium ${
                      theme === 'dark' ? 'text-white' : 'text-black'
                    }`}>
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
                <h3 className={`text-lg font-semibold mb-3 ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>
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
  );
};