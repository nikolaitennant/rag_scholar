import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, LogOut, Palette, Clock, Shield, Globe, Moon, Sun, Settings, Key, Cpu, ChevronRight, HelpCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { apiService } from '../services/api';
import { ProfilePage } from './ProfilePage';
import { ProfileImageModal } from './ProfileImageModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFeedback?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onOpenFeedback }) => {
  const { theme, themeMode, toggleTheme, background, setBackground } = useTheme();
  const { user, userProfile, logout, updateUserProfile, resetPassword, refreshUser, updateDisplayName } = useUser();

  // Check if device is mobile
  const isMobile = window.innerWidth <= 768;
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
  });
  const [timezone, setTimezone] = useState(() => {
    return localStorage.getItem('userTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
  });
  const [currentView, setCurrentView] = useState<'main' | 'account' | 'appearance' | 'api' | 'timezone' | 'advanced' | 'help' | 'profile'>('main');

  const [showProfileImageModal, setShowProfileImageModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isResetPasswordMode, setIsResetPasswordMode] = useState(false);
  const [showAdvancedParams, setShowAdvancedParams] = useState(true);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    apiKey: '',
    model: 'gpt-5-mini',
    temperature: 0.0,
    maxTokens: 2000,
  });
  const [initialApiSettings, setInitialApiSettings] = useState({
    apiKey: '',
    model: 'gpt-5-mini',
    temperature: 0.0,
    maxTokens: 2000,
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

  const backgroundOptions = [
    { id: 'classic', name: 'Default', color: 'from-gray-900 to-gray-100' },
    { id: 'gradient', name: 'Slate', color: 'from-blue-500 to-purple-600' },
    { id: 'mountain', name: 'Mountain', color: 'from-orange-500 to-amber-600' },
    { id: 'ocean', name: 'Ocean', color: 'from-blue-500 to-cyan-600' },
    { id: 'sunset', name: 'Sunset', color: 'from-orange-500 to-pink-600' },
    { id: 'forest', name: 'Forest', color: 'from-green-500 to-emerald-600' },
  ];

  // Load API settings from cloud when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadApiSettings();
    } else if (!isOpen) {
      // Reset the flag when modal closes
      setHasLoadedSettings(false);
    }
  }, [isOpen, user]);

  // Don't prevent body scroll - allow background to scroll

  const loadApiSettings = async () => {
    try {
      setIsLoadingSettings(true);
      const settings = await apiService.getAPISettings();
      const loadedSettings = {
        apiKey: settings.api_key || '',
        model: settings.preferred_model || 'gpt-5-mini',
        temperature: settings.temperature || 0.0,
        maxTokens: settings.max_tokens || 2000,
      };
      setApiSettings(loadedSettings);
      setInitialApiSettings(loadedSettings); // Store initial state
      setHasLoadedSettings(true);
    } catch (error) {
      console.error('Failed to load API settings:', error);
      // Keep default values on error
      setHasLoadedSettings(true);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const saveApiSettings = async () => {
    try {
      setIsLoading(true);
      await apiService.updateAPISettings({
        api_key: apiSettings.apiKey,
        preferred_model: apiSettings.model,
        temperature: apiSettings.temperature,
        max_tokens: apiSettings.maxTokens,
        timezone: timezone
      });
      // Update initial state to match current state after successful save
      setInitialApiSettings({ ...apiSettings });
      setSaveMessage('API settings saved successfully');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save API settings:', error);
      setSaveMessage('Failed to save API settings');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('userTimezone', timezone);
  }, [timezone]);

  // Auto-save profile changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.name !== user?.displayName && formData.name.trim() !== '') {
        try {
          // Update display name if changed
          await updateDisplayName(formData.name);
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, 1000); // Auto-save after 1 second of no changes

    return () => clearTimeout(timer);
  }, [formData.name]);

  // Auto-save API settings to cloud when they change (with debounce)
  useEffect(() => {
    if (!isLoadingSettings && user && hasLoadedSettings) {
      // Check if settings have actually changed
      const hasChanged =
        apiSettings.apiKey !== initialApiSettings.apiKey ||
        apiSettings.model !== initialApiSettings.model ||
        apiSettings.temperature !== initialApiSettings.temperature ||
        apiSettings.maxTokens !== initialApiSettings.maxTokens;

      if (hasChanged) {
        const timer = setTimeout(() => {
          saveApiSettings();
        }, 1000); // Auto-save after 1 second of no changes

        return () => clearTimeout(timer);
      }
    }
  }, [apiSettings, isLoadingSettings, user, hasLoadedSettings, initialApiSettings]);

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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setSaveMessage('Please select a valid image file');
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage('Image size must be less than 5MB');
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    try {
      setIsUploadingImage(true);

      // Convert to base64 for preview (or upload to your storage service)
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageDataUrl = e.target?.result as string;

        try {
          // Update the user's profile_image
          console.log('Updating profile image...');
          await updateUserProfile({ profile_image: imageDataUrl });
          console.log('Profile updated, refreshing user data...');
          await refreshUser();
          console.log('User data refreshed successfully');

          setSaveMessage('Profile image updated successfully');
          setTimeout(() => setSaveMessage(null), 3000);
        } catch (error) {
          console.error('Failed to update profile image:', error);
          setSaveMessage('Failed to update profile image');
          setTimeout(() => setSaveMessage(null), 5000);
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to upload image:', error);
      setSaveMessage('Failed to upload image');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsUploadingImage(false);
    }
  };

  if (!isOpen) return null;



  const renderMainView = () => (
    <div className="flex flex-col h-full" style={{ minHeight: '120vh' }}>
      {/* User Profile Section */}
      <div className="px-6 py-6 border-b border-white/10">
        <button
          onClick={() => setCurrentView('profile')}
          className="w-full flex items-center justify-between space-x-4 active:bg-white/5 transition-colors rounded-xl p-2 -m-2"
        >
          <div className="flex items-center space-x-4">
            {/* Profile Image */}
            <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-300">
              <img
                src={userProfile?.profile?.profile_image || user?.photoURL || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face"}
                alt="Profile"
                className="w-full h-full object-cover"
                key={userProfile?.profile?.profile_image || user?.photoURL}
              />
            </div>

            {/* Name and subtitle */}
            <div className="flex-1 text-left">
              <h3 className="text-white text-xl font-semibold">
                {user?.displayName || user?.email || 'User'}
              </h3>
              <p className="text-white/60 text-sm">View profile</p>
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight className="w-5 h-5 text-white/40" />
        </button>
      </div>

      {/* Settings List */}
      <div className="flex-1 px-4 py-1">
        <div className="space-y-0">
          <button
            onClick={() => setCurrentView('account')}
            className="w-full flex items-center justify-between px-4 py-4 active:bg-white/5 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="w-6 h-6 text-white/70">
                <Key className="w-6 h-6" />
              </div>
              <span className="text-white text-base font-normal">Account</span>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40" />
          </button>

          <button
            onClick={() => setCurrentView('appearance')}
            className="w-full flex items-center justify-between px-4 py-4 active:bg-white/5 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="w-6 h-6 text-white/70">
                <Palette className="w-6 h-6" />
              </div>
              <span className="text-white text-base font-normal">Appearance</span>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40" />
          </button>

          <button
            onClick={() => setCurrentView('api')}
            className="w-full flex items-center justify-between px-4 py-4 active:bg-white/5 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="w-6 h-6 text-white/70">
                <Cpu className="w-6 h-6" />
              </div>
              <span className="text-white text-base font-normal">AI Configuration</span>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40" />
          </button>


          <button
            onClick={() => setCurrentView('timezone')}
            className="w-full flex items-center justify-between px-4 py-4 active:bg-white/5 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="w-6 h-6 text-white/70">
                <Clock className="w-6 h-6" />
              </div>
              <span className="text-white text-base font-normal">Timezone</span>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40" />
          </button>

          <button
            onClick={() => setCurrentView('advanced')}
            className="w-full flex items-center justify-between px-4 py-4 active:bg-white/5 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="w-6 h-6 text-white/70">
                <Settings className="w-6 h-6" />
              </div>
              <span className="text-white text-base font-normal">Advanced</span>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40" />
          </button>

          <button
            onClick={() => setCurrentView('help')}
            className="w-full flex items-center justify-between px-4 py-4 active:bg-white/5 transition-colors"
          >
            <div className="flex items-center space-x-4">
              <div className="w-6 h-6 text-white/70">
                <HelpCircle className="w-6 h-6" />
              </div>
              <span className="text-white text-base font-normal">Help</span>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40" />
          </button>

          {/* Logout Button - Below Help with extra spacing */}
          <div className="px-4 pt-24 pb-4 flex justify-center">
            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="rounded-full px-6 py-3 active:scale-98 transition-all duration-200"
              style={{
                background: 'linear-gradient(to right, #3B82F6, #8B5CF6)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              }}
            >
              <span className="text-white text-base font-bold">Log Out</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );

  const renderAccountView = () => (
    <div className="p-4 space-y-6" style={{ paddingTop: '16px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
      <div className="space-y-4">

        <div>
          <p className="ios-body text-white font-medium mb-2">Email</p>
          <div className="rounded-full p-4"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            }}>
            <p className="ios-caption text-white/60">{user?.email}</p>
          </div>
        </div>

        <div className="text-center">
          {!isResetPasswordMode && (
            <button
              onClick={() => setIsResetPasswordMode(true)}
              className="text-purple-400 text-sm font-medium hover:text-purple-300 transition-colors"
            >
              Reset Password
            </button>
          )}
        </div>

        {isResetPasswordMode && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="ios-caption text-white/60">Send password reset email to your account</p>
            </div>

            {saveMessage && (
              <div className={`rounded-full p-4 text-center ${
                saveMessage.includes('sent')
                  ? 'bg-green-500/20 border border-green-500/30'
                  : 'bg-red-500/20 border border-red-500/30'
              }`}>
                <p className={`ios-caption ${
                  saveMessage.includes('sent') ? 'text-green-400' : 'text-red-400'
                }`}>{saveMessage}</p>
              </div>
            )}

            <div className="flex justify-center gap-3">
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
                className="rounded-full px-4 py-2 active:scale-98 transition-all duration-200 disabled:opacity-50"
                style={{
                  background: 'rgba(168, 85, 247, 0.15)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                }}
              >
                <span className="ios-caption text-purple-400 font-medium">
                  {isLoading ? 'Sending...' : 'Send Reset Email'}
                </span>
              </button>

              <button
                onClick={() => {
                  setIsResetPasswordMode(false);
                  setSaveMessage(null);
                }}
                className="rounded-full px-4 py-2 bg-white/10 hover:bg-white/15 text-white transition-all duration-200"
              >
                <span className="ios-caption font-medium">Cancel</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderAppearanceView = () => (
    <div className="p-4 space-y-6" style={{ paddingTop: '16px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
      <div className="space-y-4">
        <button
          onClick={toggleTheme}
          className="w-full ios-list-item p-4 active:scale-98 transition-all duration-200"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {theme === 'dark' ? (
                <Moon className="w-6 h-6 text-purple-400" />
              ) : (
                <Sun className="w-6 h-6 text-orange-500" />
              )}
              <div className="text-left">
                <p className="ios-body text-white font-medium">Theme</p>
                <p className="ios-caption text-white/60">
                  {themeMode === 'auto' ? `Auto (${theme})` : theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </p>
              </div>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors duration-200 ${
              theme === 'dark' ? 'bg-gradient-to-r from-blue-500 to-purple-600' : 'bg-gray-300'
            }`}>
              <div className={`w-5 h-5 mt-0.5 rounded-full bg-white transition-transform duration-200 ${
                theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </div>
          </div>
        </button>

        <div className="ios-list-item p-4"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}>
          <div className="space-y-3">
            <p className="ios-body text-white font-medium">Background</p>
            <div className="flex gap-2 flex-wrap">
              {backgroundOptions.map((option) => {
                const getOptionColors = () => {
                  if (background === option.id) {
                    switch (option.id) {
                      case 'classic':
                        return 'border-gray-300 bg-gray-300/20 text-gray-300';
                      case 'gradient':
                        return 'border-slate-400 bg-slate-400/20 text-slate-400';
                      case 'mountain':
                        return 'border-orange-500 bg-orange-500/20 text-orange-400';
                      case 'ocean':
                        return 'border-blue-500 bg-blue-500/20 text-blue-400';
                      case 'sunset':
                        return 'border-pink-500 bg-pink-500/20 text-pink-400';
                      case 'forest':
                        return 'border-green-500 bg-green-500/20 text-green-400';
                      default:
                        return 'border-purple-500 bg-purple-500/20 text-purple-400';
                    }
                  }
                  return 'border-white/20 bg-black/10 text-white/70 hover:bg-black/20 hover:border-white/30';
                };

                return (
                  <button
                    key={option.id}
                    onClick={() => setBackground(option.id as any)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-200 ${getOptionColors()}`}
                  >
                    {option.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderApiView = () => (
    <div className="p-4 space-y-6" style={{ paddingTop: '16px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
      <div className="space-y-4">
        <div>
          <label className="block ios-caption text-white/70 mb-2 ml-1">
            API Key
          </label>
          <input
            type="password"
            name="apiKey"
            autoComplete="off"
            value={apiSettings.apiKey}
            onChange={(e) => setApiSettings(prev => ({ ...prev, apiKey: e.target.value }))}
            placeholder={apiSettings.apiKey ? '••••••••••••••••••••' : 'sk-... (OpenAI) | sk-ant-... (Anthropic)'}
            disabled={isLoadingSettings}
            className="w-full border-none outline-none bg-transparent rounded-full px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/50 transition-all duration-200 disabled:opacity-50"
            style={{
              fontSize: '16px',
              background: 'rgba(255, 255, 255, 0.08)',
            }}
          />
          {getProviderAndModels().provider && (
            <p className="ios-caption text-green-400 mt-1 ml-1">
              ✓ Detected: {getProviderAndModels().provider}
            </p>
          )}
        </div>

        <div className="ios-list-item p-4"
          style={{
            background: 'rgba(34, 197, 94, 0.15)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          }}>
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <h4 className="ios-body text-white font-medium">Secure Integration</h4>
              <p className="ios-caption text-white/60 mt-1">
                Your key is encrypted and stored securely in the cloud, providing unlimited usage across all devices
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTimezoneView = () => (
    <div className="p-4 space-y-6" style={{ paddingTop: '16px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
      <div className="space-y-4">
        <div>
          <label className="block ios-caption text-white/70 mb-2 ml-1">
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
            className="w-full ios-input text-left flex items-center justify-between"
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
            <ChevronRight className={`w-4 h-4 transition-transform ${
              timezoneDropdownOpen ? 'rotate-90' : 'rotate-0'
            } text-white/50`} />
          </button>

          {timezoneDropdownOpen && timezoneDropdownPosition && createPortal(
            <>
              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => setTimezoneDropdownOpen(false)}
              />
              <div className="fixed rounded-2xl shadow-2xl z-[9999] overflow-hidden"
                style={{
                  top: timezoneDropdownPosition.top + 2,
                  left: timezoneDropdownPosition.left,
                  width: timezoneDropdownPosition.width,
                  background: 'rgba(28, 28, 30, 0.85)',
                  backdropFilter: 'blur(20px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                }}>
                <div className="space-y-0">
                  {[
                    { value: Intl.DateTimeFormat().resolvedOptions().timeZone, label: 'Auto-detect', isAutoDetect: true },
                    { value: 'America/New_York', label: 'Eastern Time' },
                    { value: 'America/Chicago', label: 'Central Time' },
                    { value: 'America/Denver', label: 'Mountain Time' },
                    { value: 'America/Los_Angeles', label: 'Pacific Time' },
                    { value: 'Europe/London', label: 'London' },
                    { value: 'Europe/Paris', label: 'Paris' },
                    { value: 'Asia/Tokyo', label: 'Tokyo' },
                  ].map((tz) => {
                    const isSelected = tz.isAutoDetect
                      ? timezone === Intl.DateTimeFormat().resolvedOptions().timeZone
                      : timezone === tz.value && timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone;

                    return (
                      <button
                        key={tz.value}
                        onClick={() => {
                          setTimezone(tz.value);
                          setTimezoneDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-sm text-left transition-all duration-150 active:scale-[0.97] ${
                          isSelected
                            ? 'bg-gradient-to-r from-purple-500/15 to-violet-500/15 text-white font-medium'
                            : 'text-white/90 hover:bg-white/8 hover:text-white'
                        }`}
                      >
                        {tz.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>,
            document.body
          )}
        </div>

        <div className="ios-list-item p-4"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}>
          <div className="flex items-center space-x-3">
            <Globe className="w-5 h-5 text-white/60" />
            <div>
              <p className="ios-body text-white font-medium">Current Time</p>
              <p className="ios-caption text-white/60">
                {new Date().toLocaleString(undefined, {
                  timeZone: timezone,
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdvancedView = () => (
    <div className="p-4 space-y-6" style={{ paddingTop: '16px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h4 className="ios-title text-white">Model Parameters</h4>
        </div>

        <div>
          <label className="block ios-caption text-white/70 mb-2 ml-1">
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
              disabled={getProviderAndModels().models.length === 0 || isLoadingSettings}
              className="w-full ios-input text-left flex items-center justify-between disabled:opacity-50"
            >
              <span className="truncate">
                {getProviderAndModels().models.length === 0
                  ? 'Add API key to enable model selection'
                  : getProviderAndModels().models.find(m => m.value === apiSettings.model)?.label || 'Select Model'
                }
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform ${
                modelDropdownOpen ? 'rotate-90' : 'rotate-0'
              } text-white/50`} />
            </button>

            {modelDropdownOpen && modelDropdownPosition && getProviderAndModels().models.length > 0 && createPortal(
              <>
                <div
                  className="fixed inset-0 z-[9998]"
                  onClick={() => setModelDropdownOpen(false)}
                />
                <div className="fixed rounded-2xl shadow-2xl z-[9999] overflow-hidden"
                  style={{
                    top: modelDropdownPosition.top + 2,
                    left: modelDropdownPosition.left,
                    width: modelDropdownPosition.width,
                    background: 'rgba(28, 28, 30, 0.85)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  }}>
                  <div className="space-y-0">
                    {getProviderAndModels().models.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => {
                          setApiSettings(prev => ({ ...prev, model: value }));
                          setModelDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-sm text-left transition-all duration-150 active:scale-[0.97] ${
                          apiSettings.model === value
                            ? 'bg-gradient-to-r from-purple-500/15 to-violet-500/15 text-white font-medium'
                            : 'text-white/90 hover:bg-white/8 hover:text-white'
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

          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block ios-caption text-white/70 mb-2 ml-1">
                Temperature ({apiSettings.temperature})
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={apiSettings.temperature}
                onChange={(e) => setApiSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                disabled={isLoadingSettings}
                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-purple-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200 hover:[&::-webkit-slider-thumb]:scale-110"
              />
              <div className="flex justify-between ios-caption text-white/50 mt-1">
                <span>Focused</span>
                <span>Creative</span>
              </div>
            </div>

            <div>
              <label className="block ios-caption text-white/70 mb-2 ml-1">
                Max Tokens ({apiSettings.maxTokens})
              </label>
              <input
                type="range"
                min="100"
                max="4000"
                step="100"
                value={apiSettings.maxTokens}
                onChange={(e) => setApiSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                disabled={isLoadingSettings}
                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/20 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-blue-500 [&::-webkit-slider-thumb]:to-purple-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200 hover:[&::-webkit-slider-thumb]:scale-110"
              />
              <div className="flex justify-between ios-caption text-white/50 mt-1">
                <span>100</span>
                <span>4000</span>
              </div>
            </div>
          </div>
        </div>
      </div>
  );

  const renderHelpView = () => (
    <div className="p-4 space-y-6" style={{ paddingTop: '16px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
      <div className="space-y-6">
        {/* Getting Started */}
        <div className="ios-list-item p-4"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}>
          <h4 className="ios-body text-white font-medium mb-4">Getting Started</h4>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-purple-400 text-xs font-semibold">1</span>
              </div>
              <div>
                <div className="ios-caption text-white font-medium">Upload documents</div>
                <div className="ios-caption text-white/60 mt-1">Add PDFs and text files in the Documents tab</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-400 text-xs font-semibold">2</span>
              </div>
              <div>
                <div className="ios-caption text-white font-medium">Create classes</div>
                <div className="ios-caption text-white/60 mt-1">Organize documents by subject or project</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-400 text-xs font-semibold">3</span>
              </div>
              <div>
                <div className="ios-caption text-white font-medium">Ask questions</div>
                <div className="ios-caption text-white/60 mt-1">Chat about your content with citations</div>
              </div>
            </div>
          </div>
        </div>

        {/* Special Commands */}
        <div className="ios-list-item p-4"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}>
          <h4 className="ios-caption text-white font-medium mb-3">Special Commands</h4>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <code className="ios-caption px-2 py-1 rounded bg-white/10 text-purple-400">/background</code>
              <span className="ios-caption text-white/70">General knowledge</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="ios-caption px-2 py-1 rounded bg-white/10 text-purple-400">/summarize</code>
              <span className="ios-caption text-white/70">Summarize documents</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="ios-caption px-2 py-1 rounded bg-white/10 text-purple-400">/explain</code>
              <span className="ios-caption text-white/70">Simple explanations</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="ios-caption px-2 py-1 rounded bg-white/10 text-purple-400">/search</code>
              <span className="ios-caption text-white/70">Search documents</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="ios-caption px-2 py-1 rounded bg-white/10 text-purple-400">/compare</code>
              <span className="ios-caption text-white/70">Compare concepts</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="ios-caption px-2 py-1 rounded bg-white/10 text-purple-400">/cite</code>
              <span className="ios-caption text-white/70">Find citations</span>
            </div>
          </div>
        </div>

        {/* Need Help Section */}
        <div className="ios-list-item p-4"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}>
          <h4 className="ios-caption text-white font-medium mb-3">Need Help?</h4>

          <div className="space-y-3 flex flex-col items-center">
            <button
              onClick={() => {
                if (onOpenFeedback) {
                  onOpenFeedback();
                  onClose(); // Close settings modal when opening feedback
                }
              }}
              className="rounded-full p-3 px-4 active:scale-98 transition-all duration-200"
              style={{
                background: 'rgba(168, 85, 247, 0.15)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
              }}
            >
              <div className="flex items-center justify-center space-x-2 whitespace-nowrap">
                <Mail className="w-4 h-4 text-purple-400" />
                <span className="ios-caption text-purple-400 font-medium">Send Feedback</span>
              </div>
            </button>

            <div className="ios-caption text-white/60 text-center">
              Questions or suggestions? We'd love to hear from you!
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`fixed z-[40] ${isMobile ? 'inset-0' : 'inset-0 flex items-center justify-center'}`}
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
        overflow: 'hidden'
      }}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 ${isMobile ? 'bg-black/40' : 'bg-black/60 backdrop-blur-lg'}`}
        onClick={onClose}
      />

      {/* Additional backdrop for individual pages to prevent bleed-through */}
      {currentView !== 'main' && isMobile && (
        <div
          className="absolute inset-0 bg-black/60"
          style={{ zIndex: -1 }}
        />
      )}

      {/* COMPLETELY SEPARATE Frosted Glass Container - FIXED POSITION */}
      <div
        className={`fixed pointer-events-none ${
          isMobile
            ? 'inset-0 w-full h-full'
            : 'w-full max-w-md h-[85vh] rounded-3xl'
        }`}
        style={{
          background: isMobile ? (
            background === 'classic' ? 'rgb(35, 35, 37)' :
            background === 'gradient' ? 'rgb(37, 42, 54)' :
            background === 'mountain' ? 'rgb(42, 37, 32)' :
            background === 'ocean' ? 'rgb(32, 42, 52)' :
            background === 'sunset' ? 'rgb(52, 32, 42)' :
            background === 'forest' ? 'rgb(27, 47, 37)' :
            'rgb(35, 35, 37)'
          ) : 'rgba(28, 28, 30, 0.95)',
          backdropFilter: isMobile ? 'none' : 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: isMobile ? 'none' : 'blur(20px) saturate(180%)',
          border: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
          transition: 'background 0.3s ease-out',
          left: isMobile ? '0' : '50%',
          transform: isMobile ? 'none' : 'translateX(-50%)',
          top: isMobile ? '0' : '50%',
          marginTop: isMobile ? '0' : '-42.5vh',
          zIndex: 50
        }}
        key={`frosted-${background}`}
      />

      {/* Modal Content Container - Fixed Position, No Background */}
      <div className={`fixed shadow-2xl flex flex-col ${
        isMobile
          ? 'inset-0 w-full h-full'
          : 'w-full max-w-md h-[85vh] rounded-3xl'
      }`}
        style={{
          paddingBottom: isMobile ? '80px' : '0',
          backgroundColor: 'transparent',
          left: isMobile ? '0' : '50%',
          transform: isMobile ? 'none' : 'translateX(-50%)',
          top: isMobile ? '0' : '50%',
          marginTop: isMobile ? '0' : '-42.5vh',
          zIndex: 51,
          overflow: 'hidden'
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 flex-shrink-0" style={{
          paddingTop: currentView !== 'main'
            ? (isMobile ? 'max(64px, env(safe-area-inset-top))' : '64px')
            : (isMobile ? 'max(48px, env(safe-area-inset-top))' : '48px')
        }}>
          {currentView !== 'main' && (
            <button
              onClick={() => setCurrentView('main')}
              className="p-2 rounded-full active:scale-90 transition-all duration-200 text-white/60"
              style={{ marginTop: '36px' }}
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
          )}

          {currentView !== 'main' && (
            <h2 className="text-white text-xl font-semibold flex-1 text-left ml-2" style={{ marginTop: '36px' }}>
              {currentView === 'account' ? 'Account' :
               currentView === 'appearance' ? 'Appearance' :
               currentView === 'api' ? 'AI Configuration' :
               currentView === 'timezone' ? 'Timezone' :
               currentView === 'advanced' ? 'Advanced' :
               currentView === 'help' ? 'Help' :
               currentView === 'profile' ? 'Profile' : 'Settings'}
            </h2>
          )}

          {currentView !== 'main' && (
            <div className="w-9"></div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-none" style={{
          WebkitOverflowScrolling: 'touch'
        }}>
          {currentView === 'main' && renderMainView()}
          {currentView === 'account' && renderAccountView()}
          {currentView === 'appearance' && renderAppearanceView()}
          {currentView === 'api' && renderApiView()}
          {currentView === 'timezone' && renderTimezoneView()}
          {currentView === 'advanced' && renderAdvancedView()}
          {currentView === 'help' && renderHelpView()}
          {currentView === 'profile' && <ProfilePage onBack={() => setCurrentView('main')} />}
        </div>

        {/* Save Message */}
        {saveMessage && currentView !== 'account' && (
          <div className="absolute bottom-[150px] left-1/2 transform -translate-x-1/2">
            <div className={`px-4 py-2 rounded-full text-center whitespace-nowrap ${
              saveMessage.includes('successfully')
                ? 'bg-green-500/20 border border-green-500/30'
                : 'bg-red-500/20 border border-red-500/30'
            }`}>
              <p className={`ios-caption font-medium ${
                saveMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'
              }`}>{saveMessage}</p>
            </div>
          </div>
        )}

        {/* Profile Image Modal */}
        <ProfileImageModal
          isOpen={showProfileImageModal}
          onClose={() => setShowProfileImageModal(false)}
          imageUrl={userProfile?.profile?.profile_image || user?.photoURL || ''}
          userName={user?.displayName || user?.email || 'User'}
          showChangeButton={false}
        />
      </div> {/* End Modal Content Container */}
    </div>
  );
};