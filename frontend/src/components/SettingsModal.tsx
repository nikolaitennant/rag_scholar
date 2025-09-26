import React, { useState, useEffect, useRef } from 'react';
import { X, User, Mail, LogOut, Palette, Clock, Shield, Sparkles, Bell, Globe, Moon, Sun, Settings, Key, Cpu, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, themeMode, toggleTheme, background, setBackground } = useTheme();
  const { user, userProfile, logout, updateUserProfile, resetPassword, refreshUser } = useUser();
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
  });
  const [timezone, setTimezone] = useState(() => {
    return localStorage.getItem('userTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
  });
  const [activeTab, setActiveTab] = useState<'general' | 'advanced'>('general');
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isResetPasswordMode, setIsResetPasswordMode] = useState(false);
  const [showAdvancedParams, setShowAdvancedParams] = useState(false);

  // Model dropdown state
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [modelDropdownPosition, setModelDropdownPosition] = useState<{top: number, left: number, width: number} | null>(null);
  const modelButtonRef = useRef<HTMLButtonElement>(null);

  // Timezone dropdown state
  const [timezoneDropdownOpen, setTimezoneDropdownOpen] = useState(false);
  const [timezoneDropdownPosition, setTimezoneDropdownPosition] = useState<{top: number, left: number, width: number} | null>(null);
  const timezoneButtonRef = useRef<HTMLButtonElement>(null);

  // Advanced settings state
  const [apiSettings, setApiSettings] = useState({
    apiKey: localStorage.getItem('api_key') || '',
    model: localStorage.getItem('preferred_model') || 'gpt-5-mini',
    temperature: parseFloat(localStorage.getItem('model_temperature') || '0.7'),
    maxTokens: parseInt(localStorage.getItem('max_tokens') || '2000'),
  });

  const backgroundOptions = [
    { id: 'classic', name: 'Default', color: 'from-gray-900 to-gray-100' },
    { id: 'gradient', name: 'Gradient', color: 'from-blue-500 to-purple-600' },
    { id: 'mountain', name: 'Mountain', color: 'from-orange-500 to-amber-600' },
    { id: 'ocean', name: 'Ocean', color: 'from-blue-500 to-cyan-600' },
    { id: 'sunset', name: 'Sunset', color: 'from-orange-500 to-pink-600' },
    { id: 'forest', name: 'Forest', color: 'from-green-500 to-emerald-600' },
  ];

  useEffect(() => {
    localStorage.setItem('userTimezone', timezone);
  }, [timezone]);

  // Auto-save profile changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.name !== user?.displayName) {
        try {
          // Update display name if changed
          if (user) {
            await (user as any).updateProfile({ displayName: formData.name });
            await refreshUser(); // Refresh user state to trigger re-render
          }
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, 1000); // Auto-save after 1 second of no changes

    return () => clearTimeout(timer);
  }, [formData.name, user]);

  useEffect(() => {
    localStorage.setItem('api_key', apiSettings.apiKey);
    localStorage.setItem('preferred_model', apiSettings.model);
    localStorage.setItem('model_temperature', apiSettings.temperature.toString());
    localStorage.setItem('max_tokens', apiSettings.maxTokens.toString());
  }, [apiSettings]);

  // Detect provider and get available models based on API key format
  const getProviderAndModels = () => {
    const apiKey = apiSettings.apiKey.trim();

    if (!apiKey) {
      return { provider: null, models: [] };
    }

    // OpenAI API keys start with 'sk-'
    if (apiKey.startsWith('sk-') && !apiKey.startsWith('sk-ant-')) {
      return {
        provider: "OpenAI",
        models: [
          { value: "gpt-5", label: "GPT-5" },
          { value: "gpt-5-mini", label: "GPT-5 Mini" },
          { value: "gpt-5-nano", label: "GPT-5 Nano" },
          { value: "gpt-4.1", label: "GPT-4.1" },
          { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
          { value: "gpt-4.1-nano", label: "GPT-4.1 Nano" }
        ]
      };
    }

    // Anthropic API keys start with 'sk-ant-'
    if (apiKey.startsWith('sk-ant-')) {
      return {
        provider: "Anthropic",
        models: [
          { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
          { value: "claude-3-opus", label: "Claude 3 Opus" },
          { value: "claude-3-sonnet", label: "Claude 3 Sonnet" },
          { value: "claude-3-haiku", label: "Claude 3 Haiku" }
        ]
      };
    }

    // Google API keys start with 'AIza'
    if (apiKey.startsWith('AIza')) {
      return {
        provider: "Google",
        models: [
          { value: "gemini-pro", label: "Gemini Pro" },
          { value: "gemini-ultra", label: "Gemini Ultra" }
        ]
      };
    }

    // Meta API keys (example pattern, might vary)
    if (apiKey.startsWith('meta-') || apiKey.includes('llama')) {
      return {
        provider: "Meta",
        models: [
          { value: "llama-3-70b", label: "Llama 3 70B" },
          { value: "llama-3-8b", label: "Llama 3 8B" }
        ]
      };
    }

    // Unknown key format
    return {
      provider: "Unknown",
      models: []
    };
  };

  if (!isOpen) return null;


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
      <div className={`relative w-full max-w-4xl mx-4 rounded-2xl shadow-2xl overflow-hidden ${
        theme === 'dark'
          ? 'bg-black/20 backdrop-blur-2xl border border-white/10'
          : 'bg-white/40 backdrop-blur-2xl border border-black/5'
      }`}>

        {/* Header */}
        <div className={`p-6 border-b ${
          theme === 'dark' ? 'border-white/10' : 'border-black/10'
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
              className={`p-2 rounded-3xl transition-all duration-200 ${
                theme === 'dark'
                  ? 'hover:bg-white/10 text-gray-400 hover:text-white'
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`px-6 border-b ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`}>
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-3 px-4 text-sm font-medium transition-all ${
                activeTab === 'general'
                  ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-600')
                  : (theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                General
              </div>
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`py-3 px-4 text-sm font-medium transition-all ${
                activeTab === 'advanced'
                  ? (theme === 'dark' ? 'text-blue-400' : 'text-blue-600')
                  : (theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900')
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Advanced
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto scrollbar-none" style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
          {activeTab === 'general' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Account Section (First) */}
          <div className={`p-6 rounded-3xl border ${
            theme === 'dark'
              ? 'bg-black/5 backdrop-blur-lg border-white/5'
              : 'bg-white/20 backdrop-blur-lg border-black/5'
          }`}>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Account
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Your profile and security settings
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
                  className={`w-full px-4 py-2.5 text-sm rounded-2xl border transition-all duration-200 ${
                    theme === 'dark'
                      ? 'bg-black/30 border-white/20 text-white/90 placeholder-gray-400 focus:border-blue-400 hover:bg-black/40'
                      : 'bg-black/10 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-blue-500 hover:bg-white/25'
                  } focus:outline-none`}
                />
              </div>

              <div className={`p-4 rounded-2xl border ${
                theme === 'dark' ? 'bg-black/10 border-white/10' : 'bg-white/20 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Email
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {user?.email}
                    </p>
                  </div>
                </div>
              </div>

              {!isResetPasswordMode && (
                <button
                  onClick={() => setIsResetPasswordMode(true)}
                  className={`w-full flex items-center justify-center space-x-2 p-3 rounded-2xl border-2 transition-all duration-200 ${
                    theme === 'dark'
                      ? 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                      : 'border-blue-300/50 bg-blue-100/30 text-blue-700 hover:bg-blue-200/50'
                  }`}
                >
                  <Key className="w-4 h-4" />
                  <span className="font-medium">Reset Password</span>
                </button>
              )}

              {isResetPasswordMode && (
                <div className="space-y-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Reset Password
                    </h4>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Send password reset email to your account
                    </p>
                  </div>

                  <div>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className={`w-full px-4 py-2.5 text-sm rounded-2xl border cursor-not-allowed opacity-60 ${
                        theme === 'dark'
                          ? 'bg-black/30 border-white/20 text-gray-400'
                          : 'bg-black/10 border-gray-300/50 text-gray-500'
                      }`}
                    />
                  </div>

                  {saveMessage && (
                    <div className={`p-3 rounded-2xl border text-center text-sm ${
                      saveMessage.includes('sent')
                        ? theme === 'dark'
                          ? 'bg-green-900/20 border-green-500/30 text-green-400'
                          : 'bg-green-50 border-green-200 text-green-600'
                        : theme === 'dark'
                          ? 'bg-red-900/20 border-red-500/30 text-red-400'
                          : 'bg-red-50 border-red-200 text-red-600'
                    }`}>
                      {saveMessage}
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      onClick={async () => {
                        if (user?.email) {
                          try {
                            setIsLoading(true);
                            await resetPassword(user.email);
                            setSaveMessage('Password reset email sent! Check your inbox.');
                            setTimeout(() => setSaveMessage(null), 5000);
                          } catch (error) {
                            setSaveMessage('Failed to send reset email');
                            setTimeout(() => setSaveMessage(null), 5000);
                          } finally {
                            setIsLoading(false);
                          }
                        }
                      }}
                      disabled={isLoading}
                      className={`flex-1 font-medium py-3 rounded-2xl transition-all duration-200 disabled:opacity-50 ${
                        theme === 'dark'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
                          : 'bg-gradient-to-r from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600 text-white'
                      }`}
                    >
                      {isLoading ? 'Sending...' : 'Send Reset Email'}
                    </button>

                    <button
                      onClick={() => {
                        setIsResetPasswordMode(false);
                        setSaveMessage(null);
                      }}
                      className={`flex-1 border-2 font-medium py-3 rounded-2xl transition-all duration-200 ${
                        theme === 'dark'
                          ? 'border-white/20 text-white hover:bg-black/10'
                          : 'border-gray-200 text-gray-700 hover:bg-white/20'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleLogout}
                className={`w-full flex items-center justify-center space-x-2 p-3 rounded-2xl border-2 transition-all duration-200 ${
                  theme === 'dark'
                    ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    : 'border-red-300/50 bg-red-100/30 text-red-700 hover:bg-red-200/50'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>

          {/* Appearance Section */}
          <div className={`p-6 rounded-3xl border ${
            theme === 'dark'
              ? 'bg-black/5 backdrop-blur-lg border-white/5'
              : 'bg-white/20 backdrop-blur-lg border-black/5'
          }`}>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-3xl flex items-center justify-center">
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
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 ${
                    theme === 'dark'
                      ? 'border-white/20 hover:border-white/40 bg-black/10'
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

              {/* Background Style - Modern Version */}
              <div>
                <label className={`block text-sm font-medium mb-3 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Background
                </label>
                <div className="flex gap-2 flex-wrap">
                  {backgroundOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setBackground(option.id as any)}
                      className={`px-3 py-1.5 text-xs rounded-full border-2 transition-all duration-200 ${
                        background === option.id
                          ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                          : theme === 'dark'
                            ? 'border-white/20 bg-black/10 text-white/70 hover:bg-black/20 hover:border-white/30'
                            : 'border-gray-300/50 bg-white/20 text-gray-700 hover:bg-white/40 hover:border-gray-400/60'
                      }`}
                    >
                      {option.name}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* API Section */}
          <div className={`p-6 rounded-3xl border ${
            theme === 'dark'
              ? 'bg-black/5 backdrop-blur-lg border-white/5'
              : 'bg-white/20 backdrop-blur-lg border-black/5'
          }`}>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-3xl flex items-center justify-center">
                <Key className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  API Configuration
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Configure your API key and provider
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  API Key
                </label>
                <form onSubmit={(e) => e.preventDefault()}>
                  <input
                    type="password"
                    name="apiKey"
                    autoComplete="off"
                    value={apiSettings.apiKey}
                    onChange={(e) => setApiSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder={apiSettings.apiKey ? '••••••••••••••••••••' : 'sk-... (OpenAI) | sk-ant-... (Anthropic)'}
                    className={`w-full px-4 py-2.5 text-sm rounded-2xl border transition-all duration-200 ${
                      theme === 'dark'
                        ? 'bg-black/30 border-white/20 text-white/90 placeholder-gray-400 focus:border-green-400 hover:bg-black/40'
                        : 'bg-black/10 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-green-500 hover:bg-white/25'
                    } focus:outline-none`}
                  />
                </form>
                {getProviderAndModels().provider && (
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                    ✓ Detected: {getProviderAndModels().provider}
                  </p>
                )}
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Your API key is stored securely in your browser
                </p>
              </div>

              <div className={`p-4 rounded-2xl border ${
                theme === 'dark' ? 'bg-black/3 border-white/10' : 'bg-white/10 border-black/5'
              }`}>
                <div className="flex items-start space-x-3">
                  <Shield className={`w-4 h-4 mt-0.5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <div>
                    <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Secure Integration
                    </h4>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Your key never leaves your browser and provides unlimited usage
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timezone Section */}
          <div className={`p-6 rounded-3xl border ${
            theme === 'dark'
              ? 'bg-black/5 backdrop-blur-lg border-white/5'
              : 'bg-white/20 backdrop-blur-lg border-black/5'
          }`}>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-600 rounded-3xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Timezone
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Regional time settings
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
                <button
                  ref={timezoneButtonRef}
                  onClick={() => {
                    if (!timezoneDropdownOpen && timezoneButtonRef.current) {
                      const rect = timezoneButtonRef.current.getBoundingClientRect();
                      setTimezoneDropdownPosition({
                        top: rect.bottom + window.scrollY,
                        left: rect.left + window.scrollX,
                        width: rect.width
                      });
                    }
                    setTimezoneDropdownOpen(!timezoneDropdownOpen);
                  }}
                  className={`w-full px-3 py-1.5 text-sm text-left flex items-center justify-between transition-all rounded-full ${
                    theme === 'dark'
                      ? 'bg-white/10 text-white/90 hover:bg-white/15'
                      : 'bg-black/10 text-gray-900 hover:bg-white/25 border border-gray-300/50'
                  }`}
                >
                  <span className="truncate">
                    {timezone === Intl.DateTimeFormat().resolvedOptions().timeZone ? 'Auto-detect' :
                     timezone === 'America/New_York' ? 'Eastern Time' :
                     timezone === 'America/Chicago' ? 'Central Time' :
                     timezone === 'America/Denver' ? 'Mountain Time' :
                     timezone === 'America/Los_Angeles' ? 'Pacific Time' :
                     timezone === 'Europe/London' ? 'London' :
                     timezone === 'Europe/Paris' ? 'Paris' :
                     timezone === 'Asia/Tokyo' ? 'Tokyo' : timezone}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${
                    timezoneDropdownOpen ? 'rotate-90' : 'rotate-0'
                  } ${
                    theme === 'dark' ? 'text-white/50' : 'text-gray-400'
                  }`} />
                </button>

                {timezoneDropdownOpen && timezoneDropdownPosition && createPortal(
                  <>
                    <div
                      className="fixed inset-0 z-[9998]"
                      onClick={() => setTimezoneDropdownOpen(false)}
                    />
                    <div className={`dropdown-container fixed rounded-2xl shadow-2xl z-[9999] overflow-hidden backdrop-blur-2xl ${
                      theme === 'dark'
                        ? 'bg-black/30 border-white/20'
                        : 'bg-white/10 border-black/20'
                    }`} style={{
                      top: timezoneDropdownPosition.top + 2,
                      left: timezoneDropdownPosition.left,
                      width: timezoneDropdownPosition.width,
                      backdropFilter: 'blur(20px) saturate(120%) brightness(0.9)',
                      WebkitBackdropFilter: 'blur(20px) saturate(120%) brightness(0.9)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    }}>
                      <div className="relative z-10">
                        <button
                          onClick={() => {
                            setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
                            setTimezoneDropdownOpen(false);
                          }}
                          className={`w-full px-2.5 py-1 text-sm text-left transition-colors ${
                            theme === 'dark'
                              ? 'text-white/90 hover:bg-black/20'
                              : 'text-gray-900/90 hover:bg-white/20'
                          }`}
                        >
                          Auto-detect
                        </button>
                        <button
                          onClick={() => {
                            setTimezone('America/New_York');
                            setTimezoneDropdownOpen(false);
                          }}
                          className={`w-full px-2.5 py-1 text-sm text-left transition-colors ${
                            theme === 'dark'
                              ? 'text-white/90 hover:bg-black/20'
                              : 'text-gray-900/90 hover:bg-white/20'
                          }`}
                        >
                          Eastern Time
                        </button>
                        <button
                          onClick={() => {
                            setTimezone('America/Chicago');
                            setTimezoneDropdownOpen(false);
                          }}
                          className={`w-full px-2.5 py-1 text-sm text-left transition-colors ${
                            theme === 'dark'
                              ? 'text-white/90 hover:bg-black/20'
                              : 'text-gray-900/90 hover:bg-white/20'
                          }`}
                        >
                          Central Time
                        </button>
                        <button
                          onClick={() => {
                            setTimezone('America/Denver');
                            setTimezoneDropdownOpen(false);
                          }}
                          className={`w-full px-2.5 py-1 text-sm text-left transition-colors ${
                            theme === 'dark'
                              ? 'text-white/90 hover:bg-black/20'
                              : 'text-gray-900/90 hover:bg-white/20'
                          }`}
                        >
                          Mountain Time
                        </button>
                        <button
                          onClick={() => {
                            setTimezone('America/Los_Angeles');
                            setTimezoneDropdownOpen(false);
                          }}
                          className={`w-full px-2.5 py-1 text-sm text-left transition-colors ${
                            theme === 'dark'
                              ? 'text-white/90 hover:bg-black/20'
                              : 'text-gray-900/90 hover:bg-white/20'
                          }`}
                        >
                          Pacific Time
                        </button>
                        <button
                          onClick={() => {
                            setTimezone('Europe/London');
                            setTimezoneDropdownOpen(false);
                          }}
                          className={`w-full px-2.5 py-1 text-sm text-left transition-colors ${
                            theme === 'dark'
                              ? 'text-white/90 hover:bg-black/20'
                              : 'text-gray-900/90 hover:bg-white/20'
                          }`}
                        >
                          London
                        </button>
                        <button
                          onClick={() => {
                            setTimezone('Europe/Paris');
                            setTimezoneDropdownOpen(false);
                          }}
                          className={`w-full px-2.5 py-1 text-sm text-left transition-colors ${
                            theme === 'dark'
                              ? 'text-white/90 hover:bg-black/20'
                              : 'text-gray-900/90 hover:bg-white/20'
                          }`}
                        >
                          Paris
                        </button>
                        <button
                          onClick={() => {
                            setTimezone('Asia/Tokyo');
                            setTimezoneDropdownOpen(false);
                          }}
                          className={`w-full px-2.5 py-1 text-sm text-left transition-colors ${
                            theme === 'dark'
                              ? 'text-white/90 hover:bg-black/20'
                              : 'text-gray-900/90 hover:bg-white/20'
                          }`}
                        >
                          Tokyo
                        </button>
                      </div>
                    </div>
                  </>,
                  document.body
                )}
              </div>

              <div className={`p-4 rounded-2xl border ${
                theme === 'dark' ? 'bg-black/3 border-white/10' : 'bg-white/10 border-black/5'
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
        </div>
        ) : activeTab === 'advanced' ? (
            // Advanced Tab Content
            <div className="space-y-6">
              {/* Model Parameters Section */}
              <div className={`p-6 rounded-3xl border ${
                theme === 'dark'
                  ? 'bg-black/5 backdrop-blur-lg border-white/5'
                  : 'bg-white/20 backdrop-blur-lg border-black/5'
              }`}>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-3xl flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Model Parameters
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Customize AI model behavior and performance
                    </p>
                  </div>
                </div>

                {!showAdvancedParams ? (
                  <div className={`p-6 rounded-2xl border text-center ${
                    theme === 'dark' ? 'bg-black/3 border-white/10' : 'bg-white/10 border-black/5'
                  }`}>
                    <div className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Default
                    </div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                      Model parameters are currently using default settings
                    </p>
                    <button
                      onClick={() => setShowAdvancedParams(true)}
                      className={`px-6 py-2 rounded-2xl border-2 transition-all duration-200 ${
                        theme === 'dark'
                          ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
                          : 'border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100'
                      }`}
                    >
                      Customize Parameters
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Model Parameters
                      </h4>
                      <button
                        onClick={() => setShowAdvancedParams(false)}
                        className={`text-sm px-3 py-1 rounded-2xl transition-all ${
                          theme === 'dark'
                            ? 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                        }`}
                      >
                        Use Default
                      </button>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Model
                      </label>
                      <button
                        ref={modelButtonRef}
                        onClick={() => {
                          if (!modelDropdownOpen && modelButtonRef.current && getProviderAndModels().models.length > 0) {
                            const rect = modelButtonRef.current.getBoundingClientRect();
                            setModelDropdownPosition({
                              top: rect.bottom + window.scrollY,
                              left: rect.left + window.scrollX,
                              width: rect.width
                            });
                          }
                          setModelDropdownOpen(!modelDropdownOpen);
                        }}
                        disabled={getProviderAndModels().models.length === 0}
                        className={`w-full px-3 py-1.5 text-sm text-left flex items-center justify-between transition-all rounded-full ${
                          getProviderAndModels().models.length === 0
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        } ${
                          theme === 'dark'
                            ? 'bg-white/10 text-white/90 hover:bg-white/15'
                            : 'bg-black/10 text-gray-900 hover:bg-white/25 border border-gray-300/50'
                        }`}
                      >
                        <span className="truncate">
                          {getProviderAndModels().models.length === 0
                            ? 'Add API key to enable model selection'
                            : getProviderAndModels().models.find(m => m.value === apiSettings.model)?.label || 'Select Model'
                          }
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${
                          modelDropdownOpen ? 'rotate-90' : 'rotate-0'
                        } ${
                          theme === 'dark' ? 'text-white/50' : 'text-gray-400'
                        }`} />
                      </button>

                      {modelDropdownOpen && modelDropdownPosition && getProviderAndModels().models.length > 0 && createPortal(
                        <>
                          <div
                            className="fixed inset-0 z-[9998]"
                            onClick={() => setModelDropdownOpen(false)}
                          />
                          <div className={`dropdown-container fixed rounded-2xl shadow-2xl z-[9999] overflow-hidden backdrop-blur-2xl ${
                            theme === 'dark'
                              ? 'bg-black/30 border-white/20'
                              : 'bg-white/10 border-black/20'
                          }`} style={{
                            top: modelDropdownPosition.top + 2,
                            left: modelDropdownPosition.left,
                            width: modelDropdownPosition.width,
                            backdropFilter: 'blur(20px) saturate(120%) brightness(0.9)',
                            WebkitBackdropFilter: 'blur(20px) saturate(120%) brightness(0.9)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                          }}>
                            <div className="relative z-10">
                              {getProviderAndModels().models.map(({ value, label }) => (
                                <button
                                  key={value}
                                  onClick={() => {
                                    setApiSettings(prev => ({ ...prev, model: value }));
                                    setModelDropdownOpen(false);
                                  }}
                                  className={`w-full px-2.5 py-1 text-sm text-left transition-colors ${
                                    theme === 'dark'
                                      ? 'text-white/90 hover:bg-black/20'
                                      : 'text-gray-900/90 hover:bg-white/20'
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>,
                        document.body
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Temperature ({apiSettings.temperature})
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={apiSettings.temperature}
                          onChange={(e) => setApiSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                          className={`w-full h-2 rounded-full appearance-none cursor-pointer transition-all duration-200 ${
                            theme === 'dark'
                              ? 'bg-black/20 [&::-webkit-slider-thumb]:bg-purple-400 [&::-webkit-slider-thumb]:border-white/20'
                              : 'bg-white/40 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:border-black/10'
                          } [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200 hover:[&::-webkit-slider-thumb]:scale-110 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full`}
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Focused</span>
                          <span>Creative</span>
                        </div>
                      </div>

                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Max Tokens ({apiSettings.maxTokens})
                        </label>
                        <input
                          type="range"
                          min="100"
                          max="4000"
                          step="100"
                          value={apiSettings.maxTokens}
                          onChange={(e) => setApiSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                          className={`w-full h-2 rounded-full appearance-none cursor-pointer transition-all duration-200 ${
                            theme === 'dark'
                              ? 'bg-black/20 [&::-webkit-slider-thumb]:bg-purple-400 [&::-webkit-slider-thumb]:border-white/20'
                              : 'bg-white/40 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:border-black/10'
                          } [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200 hover:[&::-webkit-slider-thumb]:scale-110 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full`}
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>100</span>
                          <span>4000</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className={`mx-6 mb-6 p-4 rounded-2xl border ${
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