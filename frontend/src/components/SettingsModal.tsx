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
  const { user, logout } = useUser();
  const [activeTab, setActiveTab] = useState<'account' | 'appearance'>('account');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const backgroundOptions = [
    { id: 'none', name: 'Default', preview: 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50' },
    { id: 'mountain', name: 'Mountain', preview: 'bg-gradient-to-br from-green-100 via-blue-50 to-purple-100' },
    { id: 'ocean', name: 'Ocean', preview: 'bg-gradient-to-br from-blue-100 via-cyan-50 to-teal-100' },
    { id: 'sunset', name: 'Sunset', preview: 'bg-gradient-to-br from-orange-100 via-pink-50 to-purple-100' },
    { id: 'forest', name: 'Forest', preview: 'bg-gradient-to-br from-green-100 via-emerald-50 to-cyan-100' },
  ];

  if (!isOpen) return null;

  const handleSaveAccount = () => {
    // TODO: Update user info in context/backend
    console.log('Saving account info:', formData);
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-2xl mx-4 rounded-2xl shadow-2xl border ${
        theme === 'dark' 
          ? 'bg-slate-900/95 border-white/20 backdrop-blur-lg' 
          : 'bg-white/95 border-black/20 backdrop-blur-lg'
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
          <button
            onClick={() => setActiveTab('account')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'account'
                ? (theme === 'dark' ? 'text-white border-b-2 border-purple-400' : 'text-black border-b-2 border-purple-500')
                : (theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Account
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'appearance'
                ? (theme === 'dark' ? 'text-white border-b-2 border-purple-400' : 'text-black border-b-2 border-purple-500')
                : (theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black')
            }`}
          >
            <Palette className="w-4 h-4 inline mr-2" />
            Appearance
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'account' && (
            <div className="space-y-6">
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
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                      theme === 'dark'
                        ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                        : 'bg-black/5 border-black/20 text-black placeholder-black/50'
                    }`}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveAccount}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Save Changes
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
                <div className="grid grid-cols-2 gap-3">
                  {backgroundOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setBackground(option.id as any)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        background === option.id
                          ? 'border-purple-500'
                          : (theme === 'dark' ? 'border-white/20 hover:border-white/40' : 'border-black/20 hover:border-black/40')
                      }`}
                    >
                      <div className={`w-full h-8 rounded mb-2 ${option.preview}`} />
                      <span className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-black'
                      }`}>
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