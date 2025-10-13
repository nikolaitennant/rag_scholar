import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, MessageSquare, Home, Upload, Settings, X, HelpCircle, Plus, BookOpen, User, Heart, Edit, Edit2, Star, Award, Zap, Trophy, Target, MessageCircle, Sparkles, LogOut, Key, Palette, Clock, Shield, Cpu, ChevronRight, Globe, Moon, Sun, Send, ChevronDown, Trash2, ArrowLeft, FileText, Circle, Disc, CircleDot, Bell, ArrowUpDown } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { MobileChatInterface } from './components/MobileChatInterface';
import { Sidebar } from './components/Sidebar';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { LoginPage } from './components/LoginPage';
import { ThemeToggle } from './components/ThemeToggle';
import { SettingsModal } from './components/SettingsModal';
import { SplashScreen } from './components/SplashScreen';
import { AchievementNotification } from './components/AchievementNotification';
import { CommandSuggestions } from './components/CommandSuggestions';
import { TopNavigationBar } from './components/TopNavigationBar';
import { ClassSwitcherDropdown } from './components/ClassSwitcherDropdown';
import { GlobalSearchOverlay } from './components/GlobalSearchOverlay';
import { ClassOnboarding } from './components/ClassOnboarding';
import { useAchievements } from './hooks/useAchievements';
import { apiService } from './services/api';
import { getCommandSuggestions } from './utils/commandParser';
import { Message, DomainType, Document, UserClass } from './types';
import { DOMAIN_TYPE_INFO } from './constants/domains';
import { SwipeableList, SwipeableListItem, SwipeAction, TrailingActions } from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';
import { Keyboard, KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';


const AppContent: React.FC = () => {
  const { theme, themeMode, background, toggleTheme, setBackground, getBackgroundClass } = useTheme();
  const { user, userProfile, login, signUp, logout, resetPassword, refreshUserProfile, refreshUser, updateDisplayName, isAuthenticated, loading } = useUser();
  const { achievements, newlyUnlocked, dismissNotification, checkForNewAchievements } = useAchievements();

  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [userClasses, setUserClasses] = useState<UserClass[]>([]);
  const [activeClass, setActiveClass] = useState<UserClass | null>(null);
  const [sessionChatHistory, setSessionChatHistory] = useState<Record<string, Message[]>>({});
  const [documents, setDocuments] = useState<Document[]>([]);
  const [chatSessionId] = useState<string>(() =>
    Math.random().toString(36).substring(2) + Date.now().toString(36)
  );

  // UI state
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState<Set<string>>(new Set());
  const [apiError, setApiError] = useState<string | null>(null);

  // Comprehensive app loading state (ChatGPT style)
  const [appLoading, setAppLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [backgroundCommandCount, setBackgroundCommandCount] = useState(1);
  const [mobilePage, setMobilePage] = useState<'chat' | 'home' | 'docs' | 'rewards' | 'settings'>('home');
  const [settingsPage, setSettingsPage] = useState<'main' | 'account' | 'appearance' | 'api' | 'advanced' | 'help' | 'timezone'>('main');
  const [mobileRewardsTab, setMobileRewardsTab] = useState<'achievements' | 'store'>('achievements');
  const [previousRewardsTab, setPreviousRewardsTab] = useState<'achievements' | 'store'>('achievements');
  const [showMobileClassForm, setShowMobileClassForm] = useState(false);
  const [mobileFormStep, setMobileFormStep] = useState<'class' | 'docs'>('class');
  const [editingMobileClass, setEditingMobileClass] = useState<UserClass | null>(null);
  const [mobileEditingClassDocs, setMobileEditingClassDocs] = useState<string[]>([]);
  const [mobileClassFormData, setMobileClassFormData] = useState({ name: '', type: null as DomainType | null, description: '' });
  const [isEditingMobileClass, setIsEditingMobileClass] = useState(false);
  const [mobileInput, setMobileInput] = useState('');
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const [mobileDocumentFilter, setMobileDocumentFilter] = useState<string | null>(() => {
    try {
      return localStorage.getItem('mobileDocumentFilter') || null;
    } catch {
      return null;
    }
  });
  const [mobileFilterDropdownOpen, setMobileFilterDropdownOpen] = useState(false);
  const [mobileDropdownPosition, setMobileDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const mobileFilterRef = useRef<HTMLDivElement>(null);
  const mobileFilterButtonRef = useRef<HTMLButtonElement>(null);
  const feedbackDropdownButtonRef = useRef<HTMLButtonElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    type: 'general' as 'bug' | 'feature' | 'general',
    message: '',
    email: ''
  });
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [feedbackDropdownOpen, setFeedbackDropdownOpen] = useState(false);
  const [feedbackDropdownPosition, setFeedbackDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [themeToggleVisible, setThemeToggleVisible] = useState(true);
  const [isNewChatSession, setIsNewChatSession] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionName, setEditingSessionName] = useState('');
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [editingDocumentName, setEditingDocumentName] = useState('');
  const isMobile = window.innerWidth < 768;

  // New navigation components state
  const [showClassSwitcher, setShowClassSwitcher] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Persist document filter to localStorage
  useEffect(() => {
    try {
      if (mobileDocumentFilter) {
        localStorage.setItem('mobileDocumentFilter', mobileDocumentFilter);
      } else {
        localStorage.removeItem('mobileDocumentFilter');
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [mobileDocumentFilter]);

  // Sync docs filter when active class changes (from home tab) or when navigating to docs
  useEffect(() => {
    if (activeClass && (mobilePage === 'home' || mobilePage === 'docs')) {
      // Update filter when class is selected on home OR when navigating to docs with an active class
      setMobileDocumentFilter(activeClass.id);
    }
  }, [activeClass, mobilePage]);

  // Provider detection helper
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

  // Mobile settings state
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
  });
  const [timezone, setTimezone] = useState(() => {
    return localStorage.getItem('userTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
  });
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'advanced' | 'help'>('general');
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isResetPasswordMode, setIsResetPasswordMode] = useState(false);
  const [showAdvancedParams, setShowAdvancedParams] = useState(false);
  const [apiSettings, setApiSettings] = useState({
    apiKey: localStorage.getItem('api_key') || '',
    model: localStorage.getItem('preferred_model') || 'gpt-5-mini',
    temperature: parseFloat(localStorage.getItem('model_temperature') || '0.0'),
    maxTokens: parseInt(localStorage.getItem('max_tokens') || '2000'),
  });
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Mobile settings useEffect hooks
  useEffect(() => {
    localStorage.setItem('userTimezone', timezone);
  }, [timezone]);


  useEffect(() => {
    localStorage.setItem('api_key', apiSettings.apiKey);
    localStorage.setItem('preferred_model', apiSettings.model);
    localStorage.setItem('model_temperature', apiSettings.temperature.toString());
    localStorage.setItem('max_tokens', apiSettings.maxTokens.toString());
  }, [apiSettings]);

  // Persist active class to localStorage
  useEffect(() => {
    if (activeClass) {
      localStorage.setItem('activeClassId', activeClass.id);
    } else {
      localStorage.removeItem('activeClassId');
    }
  }, [activeClass]);

  // Load active class from localStorage and show onboarding if no classes
  useEffect(() => {
    if (!isAuthenticated || userClasses.length === 0) return;

    const savedActiveClassId = localStorage.getItem('activeClassId');

    // If there's a saved class, try to restore it
    if (savedActiveClassId) {
      const savedClass = userClasses.find(c => c.id === savedActiveClassId);
      if (savedClass) {
        setActiveClass(savedClass);
        return;
      }
    }

    // Otherwise, auto-select the first class
    if (userClasses.length > 0 && !activeClass) {
      setActiveClass(userClasses[0]);
    }
  }, [isAuthenticated, userClasses]);

  // Show onboarding if no classes exist
  useEffect(() => {
    if (!isAuthenticated || appLoading) return;

    if (userClasses.length === 0 && !showOnboarding) {
      setShowOnboarding(true);
    }
  }, [isAuthenticated, userClasses, appLoading]);

  // Configure Capacitor StatusBar for fullscreen appearance
  useEffect(() => {
    const configureStatusBar = async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');

        // Set status bar style to light content (white text/icons)
        await StatusBar.setStyle({ style: Style.Light });

        // Make status bar background transparent so gradient shows through
        await StatusBar.setBackgroundColor({ color: '#00000000' });

        // Ensure status bar overlays the webview for fullscreen effect
        await StatusBar.setOverlaysWebView({ overlay: true });

        console.log('StatusBar configured for fullscreen appearance');
      } catch (error) {
        // StatusBar plugin not available (likely in web environment)
        // Silently handle - this is expected in web mode

        // Fallback for web - update meta tag
        const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if (statusBarMeta) statusBarMeta.setAttribute('content', 'black-translucent');
      }
    };

    configureStatusBar();
  }, []);

  // Configure Capacitor Keyboard
  useEffect(() => {
    const configureKeyboard = async () => {
      try {
        const { Keyboard } = await import('@capacitor/keyboard');

        // 1. Stop WKWebView from resizing abruptly
        await Keyboard.setResizeMode({ mode: KeyboardResize.None });

        // 2. Hide that annoying accessory bar (arrows/check)
        await Keyboard.setAccessoryBarVisible({ isVisible: false });

        // 3. Set keyboard style to match app theme (dark mode for frosted glass effect)
        await Keyboard.setStyle({ style: theme === 'dark' ? KeyboardStyle.Dark : KeyboardStyle.Light });

        // 4. Track keyboard height for smooth motion and hide/show dock
        const keyboardWillShow = (info: any) => {
          document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);

          // Hide dock when keyboard appears
          const dockElement = document.querySelector('div[style*="bottom: -10px"]');
          if (dockElement) {
            (dockElement as HTMLElement).style.display = 'none';
          }
        };

        const keyboardWillHide = () => {
          document.body.style.setProperty('--keyboard-height', '0px');

          // Show dock when keyboard disappears
          const dockElement = document.querySelector('div[style*="bottom: -10px"]');
          if (dockElement) {
            (dockElement as HTMLElement).style.display = 'block';
          }
        };

        await Keyboard.addListener('keyboardWillShow', keyboardWillShow);
        await Keyboard.addListener('keyboardWillHide', keyboardWillHide);

        // Cleanup function
        return () => {
          Keyboard.removeAllListeners();
        };
      } catch (error) {
        // Keyboard plugin not available (likely in web environment)
        // Silently handle - this is expected in web mode
      }
    };

    configureKeyboard();
  }, [theme]);


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

  const handleLogout = () => {
    logout();
  };

  // Feedback handling
  const handleSubmitFeedback = async () => {
    if (!feedbackForm.message.trim()) return;

    setIsFeedbackLoading(true);
    try {
      const feedbackData = {
        type: feedbackForm.type,
        message: feedbackForm.message,
        email: feedbackForm.email.trim() || undefined
      };
      await apiService.sendFeedback(feedbackData);

      // Reset form and close modal
      setFeedbackForm({ type: 'general', message: '', email: '' });
      setShowFeedbackModal(false);
      // Show success message
      alert('Feedback sent successfully! Thank you for your input.');
    } catch (error) {
      console.error('Failed to send feedback:', error);
      alert(`Failed to send feedback: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFeedbackLoading(false);
    }
  };

  // NOTE: Document and session loading now handled by initializeApp coordinator

  // Load initial data
  const loadDocuments = useCallback(async () => {
    try {
      setLoadingStatus('Loading your documents...');
      const docs = await apiService.getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
      setDocuments([]);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      setLoadingStatus('Loading your chat history...');
      setLoadingSessions(true);

      const sessionsData = await apiService.getSessions();

      // Merge with any existing optimistic sessions, but clean up old ones
      setSessions(prev => {
        const optimisticSessions = prev.filter(s => s.isOptimistic);
        const realSessions = sessionsData;

        // Remove optimistic sessions older than 5 minutes to prevent accumulation
        const recentOptimisticSessions = optimisticSessions.filter(session => {
          const sessionAge = Date.now() - new Date(session.updated_at).getTime();
          return sessionAge < 5 * 60 * 1000; // 5 minutes
        });

        return [...recentOptimisticSessions, ...realSessions];
      });
    } catch (error: any) {
      console.error('Failed to load sessions:', error);
      console.error('Error details:', error.response?.data || error.message);
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, [isAuthenticated, user]);

  const loadUserClasses = useCallback(async () => {
    if (!user) return; // Don't load classes if user isn't authenticated

    try {
      setLoadingStatus('Loading your classes...');
      // Load classes from cloud API
      const classes = await apiService.getClasses();

      // Convert backend format to frontend format
      const formattedClasses = classes.map(cls => ({
        ...cls,
        domainType: cls.domain_type // Convert backend format
      }));

      setUserClasses(formattedClasses);
      // Only auto-select first class on initial app load, not when user deselects
      // This prevents overriding user's intentional deselection
    } catch (error) {
      console.error('Failed to load user classes from cloud:', error);
      // Fallback to empty array on error
      setUserClasses([]);
    }
  }, [user]); // Depend on user authentication

  const checkApiHealth = useCallback(async () => {
    try {
      setLoadingStatus('Checking API connection...');
      await apiService.health();
      setApiError(null);
    } catch (error) {
      console.error('API health check failed:', error);
      setApiError('Cannot connect to API. Please check if the backend is running.');
    }
  }, []);

  // Comprehensive loading coordinator - ChatGPT style
  const initializeApp = useCallback(async () => {
    try {
      setAppLoading(true);

      // Step 1: Check API health (doesn't require auth)
      await checkApiHealth();

      // Step 2: Load user classes (local storage)
      await loadUserClasses();

      // Step 3: If authenticated, load data from backend
      if (isAuthenticated && !loading) {
        await Promise.all([
          loadDocuments(),
          loadSessions()
        ]);
      }

      // Final step: Wait for sessions to be available in state
      setLoadingStatus('Finalizing...');

    } catch (error) {
      console.error('App initialization failed:', error);
      setLoadingStatus('Failed to load. Retrying...');
      // Retry after 2 seconds
      setTimeout(initializeApp, 2000);
    }
  }, [isAuthenticated, loading, checkApiHealth, loadUserClasses, loadDocuments, loadSessions]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Close mobile filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside both the button and the dropdown
      const target = event.target as Node;
      const isInButton = mobileFilterRef.current && mobileFilterRef.current.contains(target);
      const isInDropdown = target && (target as Element).closest('.dropdown-container');

      if (!isInButton && !isInDropdown) {
        setMobileFilterDropdownOpen(false);
      }
    };

    if (mobileFilterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileFilterDropdownOpen]);

  // Watch for when data is actually loaded and finish app loading
  useEffect(() => {
    if (appLoading && !loadingSessions && !isDocumentLoading) {
      // Only finish loading if we have sessions OR if we've waited long enough for empty state
      const hasActualSessions = sessions.length > 0;


      if (hasActualSessions) {
        // We have sessions, wait a bit longer to ensure they're rendered
        setTimeout(() => {
          setAppLoading(false);
        }, 2000);
      } else {
        // No sessions, wait much longer to be sure
        setTimeout(() => {
          setAppLoading(false);
        }, 8000);
      }
    }
  }, [appLoading, loadingSessions, isDocumentLoading, sessions.length, userClasses.length, documents.length]);

  // Auto-hide theme toggle after 2 seconds only on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setThemeToggleVisible(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []); // Only run once on mount


  // Show theme toggle on hover and hide after 200ms of no interaction
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleThemeToggleMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setThemeToggleVisible(true);
  };

  const handleThemeToggleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setThemeToggleVisible(false);
    }, 200);
    setHoverTimeout(timeout);
  };


  const handleDeleteSession = async (sessionId: string) => {
    try {
      await apiService.deleteSession(sessionId);
      setSessions(prev => prev.filter(session => session.id !== sessionId));


      // If deleting current session, clear messages
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete chat. Please try again.');
    }
  };

  const handleEditMobileSession = async (sessionId: string, newName: string) => {
    try {
      await apiService.updateSession(sessionId, { name: newName });
      setSessions(prev =>
        prev.map(session =>
          session.id === sessionId
            ? { ...session, name: newName }
            : session
        )
      );
      setEditingSessionId(null);
      setEditingSessionName('');
    } catch (error) {
      console.error('Failed to update session name:', error);
      alert('Failed to update chat name. Please try again.');
    }
  };

  const handleStartEditingMobileSession = (sessionId: string, currentName: string) => {
    setEditingSessionId(sessionId);
    setEditingSessionName(currentName);
  };

  const handleCancelEditingMobileSession = () => {
    setEditingSessionId(null);
    setEditingSessionName('');
  };

  const handleEditDocument = async (documentId: string, newName: string) => {
    try {
      await apiService.updateDocument(documentId, { filename: newName });
      setDocuments(prev =>
        prev.map(doc =>
          doc.id === documentId
            ? { ...doc, filename: newName }
            : doc
        )
      );
      setEditingDocumentId(null);
      setEditingDocumentName('');
    } catch (error) {
      console.error('Failed to update document name:', error);
      alert('Failed to update document name. Please try again.');
    }
  };

  const handleStartEditingDocument = (documentId: string, currentName: string) => {
    setEditingDocumentId(documentId);
    setEditingDocumentName(currentName);
  };

  const handleCancelEditingDocument = () => {
    setEditingDocumentId(null);
    setEditingDocumentName('');
  };

  const handleThemeToggleClick = () => {
    toggleTheme();
    // Keep visible after click, but don't set a timeout if hovering
    setThemeToggleVisible(true);
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
  };

  // Helper functions
  const getUserTimezone = () => {
    return localStorage.getItem('userTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  const formatLocalDate = (dateString: string | Date) => {
    try {
      const date = new Date(dateString);
      const timezone = getUserTimezone();
      return date.toLocaleDateString('en-US', { timeZone: timezone });
    } catch {
      return 'Invalid date';
    }
  };

  // Handlers
  const handleSendMessage = async (content: string) => {
    // Parse for special commands
    const { parseCommand, formatCommandForBackend } = await import('./utils/commandParser');
    const command = parseCommand(content);

    let messageToSend = content;

    if (command && command.isValid) {
      // Transform command into optimized prompt
      messageToSend = formatCommandForBackend(command);

      // Track background commands for existing logic
      if (command.type === 'background') {
        setBackgroundCommandCount(prev => prev + 1);
      }
    }

    // Check if it's a background command (legacy support)
    if (content.toLowerCase().startsWith('/background')) {
      setBackgroundCommandCount(prev => prev + 1);
    }

    // Clear new chat indicator when user sends first message
    if (isNewChatSession) {
      setIsNewChatSession(false);
    }

    const userMessage: Message = { role: 'user', content };
    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      // Cache messages for this session
      if (currentSessionId) {
        setSessionChatHistory(prevHistory => ({
          ...prevHistory,
          [currentSessionId]: newMessages
        }));
      }
      return newMessages;
    });

    setIsChatLoading(true);

    try {
      const response = await apiService.chat({
        query: messageToSend,
        session_id: currentSessionId || chatSessionId,
        class_id: activeClass?.id,
        class_name: activeClass?.name, // Send the human-readable class name
        domain_type: activeClass?.domainType, // Send the actual domain type (law, science, etc.)
        k: 5,
      });

      // Update current session ID if this was a new session
      if (response.session_id && response.session_id !== currentSessionId) {
        setCurrentSessionId(response.session_id);
      }

      // Update sessions list (ChatGPT-style)
      const sessionId = currentSessionId || chatSessionId;
      const existingSession = sessions.find(s => s.id === sessionId);

      if (!existingSession || isNewChatSession) {
        // Create new session in UI when AI responds (for new chats)
        const newSession = {
          id: sessionId,
          name: response.chat_name || content.slice(0, 50) + (content.length > 50 ? '...' : ''), // Use backend-generated name
          message_count: 1,
          updated_at: new Date().toISOString(),
          class_id: activeClass?.id || null,
          class_name: activeClass?.name || null,
          domain: activeClass?.domainType || null,
          preview: content.slice(0, 100) + (content.length > 100 ? '...' : '')
        };

        // Add the new session to the top of the list instantly
        setSessions(prev => [newSession, ...prev.filter(s => s.id !== sessionId)]);
        setIsNewChatSession(false);
      } else {
        // Update existing session and move to top (for continuing old chats)
        setSessions(prev => {
          const otherSessions = prev.filter(s => s.id !== sessionId);
          const updatedSession = {
            ...existingSession,
            name: response.chat_name || existingSession.name, // Update name if backend provides a better one
            message_count: (existingSession.message_count || 0) + 1,
            updated_at: new Date().toISOString(),
            preview: content.slice(0, 100) + (content.length > 100 ? '...' : '') // Update preview to latest message
          };
          // Move updated session to top of list
          return [updatedSession, ...otherSessions];
        });
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.response,
        citations: response.sources?.map(source => ({
          id: crypto.randomUUID(),
          source: source,
          preview: source,
          relevance_score: 1.0
        })) || [],
      };

      setMessages(prev => {
        const newMessages = [...prev, assistantMessage];
        // Cache messages for this session
        if (currentSessionId) {
          setSessionChatHistory(prevHistory => ({
            ...prevHistory,
            [currentSessionId]: newMessages
          }));
        }
        return newMessages;
      });

      // Check for new achievements and refresh user profile after chat (with small delay)
      setTimeout(async () => {
        await checkForNewAchievements();
        await refreshUserProfile();
      }, 1000);

      // No need to refresh sessions - we update them instantly above

    } catch (error) {
      // If this was an optimistic session that failed, remove it from the UI
      setSessions(prev => prev.filter(session =>
        !(session.id === currentSessionId && session.isOptimistic)
      ));

      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
      };
      setMessages(prev => {
        const newMessages = [...prev, errorMessage];
        // Cache error messages for this session too
        if (currentSessionId) {
          setSessionChatHistory(prevHistory => ({
            ...prevHistory,
            [currentSessionId]: newMessages
          }));
        }
        return newMessages;
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  // Create new chat session (ChatGPT style - just clear current chat)
  const handleNewChat = () => {
    // Generate new session ID but don't create session in UI yet
    const newSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);

    setCurrentSessionId(newSessionId);
    setMessages([]);
    setIsNewChatSession(true);

    // Note: We're starting a new chat session, so no need to clear anything
    // The new session ID will have its own cache entry

  };

  const handleClearChat = () => {
    handleNewChat();
  };

  const handleSelectSession = (sessionId: string) => {

    // Prevent double-clicks by checking if already loading this session
    if (currentSessionId === sessionId && !isNewChatSession) {
      return;
    }

    // Save current messages to cache before switching
    if (currentSessionId && messages.length > 0) {
      setSessionChatHistory(prev => ({
        ...prev,
        [currentSessionId]: messages
      }));
    }

    // Instantly switch UI to new session
    setCurrentSessionId(sessionId);
    setIsNewChatSession(false);

    // Check if we have cached messages (instant display like ChatGPT)
    const cachedMessages = sessionChatHistory[sessionId] || [];

    if (cachedMessages.length > 0) {
      // Show cached messages instantly (ChatGPT behavior)
      setMessages(cachedMessages);
    } else {
      // No cache - show empty state and load from Firestore (LangChain)
      setMessages([]);
      setIsChatLoading(true);

      // Use LangChain's FirestoreChatMessageHistory via our API
      apiService.getSessionMessages(sessionId)
        .then(sessionData => {
          // Remove the race condition check - always update if we get data
          const freshMessages = sessionData.messages || [];
          setMessages(freshMessages);
          // Cache for next time
          setSessionChatHistory(prev => ({
            ...prev,
            [sessionId]: freshMessages
          }));
        })
        .catch(error => console.error('Failed to load session:', error))
        .finally(() => setIsChatLoading(false));
    }

    // Note: activeClass is a user class, not a domain type
    // The caching by sessionId is what matters for fast switching

  };

  const handleRenameSession = async (sessionId: string, newName: string) => {
    try {
      await apiService.updateSession(sessionId, { name: newName });
      setSessions(prev => prev.map(session =>
        session.id === sessionId
          ? { ...session, name: newName }
          : session
      ));
    } catch (error) {
      console.error('Failed to rename session:', error);
    }
  };

  const handleUploadDocument = async (file: File) => {
    setIsDocumentLoading(true);
    try {
      // Always upload to 'database' collection so documents can be shared across classes
      const collection = 'database';
      const uploadResponse = await apiService.uploadDocument(file, collection);
      // Refresh document list
      await loadDocuments();

      // Check for new achievements and refresh user profile after document upload (with small delay)
      setTimeout(async () => {
        await checkForNewAchievements();
        await refreshUserProfile();
      }, 1000);

      // Auto-assign the uploaded document to the current active class
      if (activeClass && uploadResponse.id) {
        try {
          await handleAssignDocumentToClass(uploadResponse.id, uploadResponse.filename || file.name, activeClass.id, 'add');
        } catch (error) {
          console.error('Failed to auto-assign document to class:', error);
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDocumentLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('Delete this document? This action cannot be undone.')) {
      return;
    }

    try {
      await apiService.deleteDocument(documentId);
      await loadDocuments();

      // Remove from all classes
      const updatedClasses = userClasses.map(userClass => ({
        ...userClass,
        documents: userClass.documents.filter(id => id !== documentId)
      }));
      setUserClasses(updatedClasses);
      localStorage.setItem('userClasses', JSON.stringify(updatedClasses));

      // Update active class if needed
      if (activeClass?.documents.includes(documentId)) {
        setActiveClass(prev => prev ? {
          ...prev,
          documents: prev.documents.filter(id => id !== documentId)
        } : null);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleReindexCollection = async () => {
    setIsDocumentLoading(true);
    try {
      // Since we don't have reindex API, just reload documents
      await loadDocuments();
    } catch (error) {
      console.error('Reindex failed:', error);
    } finally {
      setIsDocumentLoading(false);
    }
  };

  // Class management
  const handleCreateClass = async (name: string, domainType: DomainType, description?: string, selectedDocuments?: string[]) => {
    try {
      // Create class in cloud
      const newClass = await apiService.createClass({
        name,
        domain_type: domainType,
        description: description || ''
      });

      // Update local state with cloud data
      const updatedClasses = [...userClasses, {
        ...newClass,
        domainType: newClass.domain_type, // Convert backend format
        documents: selectedDocuments || []
      }];
      setUserClasses(updatedClasses);

      // If documents were selected, assign them to the class in the backend
      if (selectedDocuments && selectedDocuments.length > 0) {
        try {
          for (const documentId of selectedDocuments) {
            const document = documents.find(doc => doc.id === documentId);
            if (document) {
              await handleAssignDocumentToClass(documentId, document.filename, newClass.id, 'add');
            }
          }
        } catch (error) {
          console.error('Failed to assign documents to class:', error);
        }
      }

      // Auto-select the newly created class
      handleSelectClass(newClass);
    } catch (error) {
      console.error('Failed to create class in cloud:', error);
      // Show user-friendly error message
      alert('Failed to create class. Please try again.');
    }
  };

  const handleSelectClass = (userClass: UserClass) => {

    // Check if we should deselect (same class clicked)
    const shouldDeselect = activeClass && activeClass.id === userClass.id;

    if (shouldDeselect) {
      setActiveClass(null);
      setMessages([]);
      setCurrentSessionId(null);
      setIsNewChatSession(false);
    } else {
      setActiveClass(userClass);
      setMessages([]);
      setCurrentSessionId(null);
      setIsNewChatSession(false);
    }

    // Add a small delay and verify the state change
    setTimeout(() => {
    }, 100);
  };

  const handleEditClass = async (classId: string, name: string, domainType: DomainType, description?: string) => {
    try {
      // Update class in cloud
      await apiService.updateClass(classId, {
        name,
        domain_type: domainType,
        description: description || ''
      });

      // Update local state
      const updatedClasses = userClasses.map(userClass =>
        userClass.id === classId
          ? { ...userClass, name, domainType, description: description || '' }
          : userClass
      );
      setUserClasses(updatedClasses);

      if (activeClass?.id === classId) {
        setActiveClass(prev => prev ? { ...prev, name, domainType, description: description || '' } : null);
      }
    } catch (error) {
      console.error('Failed to update class in cloud:', error);
      alert('Failed to update class. Please try again.');
    }
  };

  const handleDeleteClass = async (classId: string) => {
    const userClass = userClasses.find(c => c.id === classId);
    if (!window.confirm(`Delete "${userClass?.name}" class? This will also delete all related chat sessions and remove class tags from documents.`)) {
      return;
    }

    try {

      // Find all sessions related to this class
      const sessionsToDelete = sessions.filter(session => session.class_id === classId);

      // Delete all related sessions from database
      const sessionDeletionPromises = sessionsToDelete.map(session =>
        apiService.deleteSession(session.id).catch(error => {
          console.error(`Failed to delete session ${session.id}:`, error);
          return null; // Don't fail the whole operation for one session
        })
      );

      await Promise.all(sessionDeletionPromises);

      // Find all documents that have this class assigned
      const documentsWithClass = documents.filter(doc =>
        doc.assigned_classes && doc.assigned_classes.includes(classId)
      );

      // Remove class tags from all documents
      const documentUpdatePromises = documentsWithClass.map(doc =>
        apiService.assignDocumentToClass(doc.id, doc.filename, classId, 'remove').catch(error => {
          console.error(`Failed to remove class from document ${doc.id}:`, error);
          return null; // Don't fail the whole operation for one document
        })
      );

      await Promise.all(documentUpdatePromises);

      // Update local documents state - remove the deleted class ID from assigned_classes
      setDocuments(prevDocs =>
        prevDocs.map(doc => ({
          ...doc,
          assigned_classes: doc.assigned_classes?.filter(id => id !== classId) || []
        }))
      );

      // Delete class from cloud
      await apiService.deleteClass(classId);

      // Update local state - remove the class
      const updatedClasses = userClasses.filter(userClass => userClass.id !== classId);
      setUserClasses(updatedClasses);

      // Update local sessions state - remove deleted sessions
      setSessions(prevSessions =>
        prevSessions.filter(session => session.class_id !== classId)
      );

      // Clear session cache for deleted sessions
      setSessionChatHistory(prevHistory => {
        const newHistory = { ...prevHistory };
        sessionsToDelete.forEach(session => {
          delete newHistory[session.id];
        });
        return newHistory;
      });

      // If deleting active class, switch to first available or clear
      if (activeClass?.id === classId) {
        if (updatedClasses.length > 0) {
          handleSelectClass(updatedClasses[0]);
        } else {
          setActiveClass(null);
          setMessages([]);
          setCurrentSessionId(null);
        }
      }

    } catch (error) {
      console.error('Failed to delete class and related data:', error);
      alert('Failed to delete class and related data. Please try again.');
    }
  };

  // Handlers for new navigation components
  const handleOnboardingCreateClass = async (name: string, type: DomainType, description: string) => {
    await handleCreateClass(name, type, description);
    setShowOnboarding(false);
  };

  const handleSearchSelectDocument = (documentId: string) => {
    // Navigate to docs page
    setMobilePage('docs');
    // Optionally scroll to document or highlight it
  };

  const handleSearchSelectChat = (sessionId: string) => {
    // Navigate to chat and load that session
    setMobilePage('chat');
    // Load the session messages
    handleSelectSession(sessionId);
  };

  const handleAssignDocuments = async (classId: string, documentIds: string[]) => {
    const updatedClasses = userClasses.map(userClass =>
      userClass.id === classId
        ? { ...userClass, documents: documentIds }
        : userClass
    );
    setUserClasses(updatedClasses);
    localStorage.setItem('userClasses', JSON.stringify(updatedClasses));

    if (activeClass?.id === classId) {
      setActiveClass(prev => prev ? { ...prev, documents: documentIds } : null);
    }

    // Sync document assignments with backend
    try {
      const userClass = userClasses.find(c => c.id === classId);
      const oldDocumentIds = userClass?.documents || [];

      // Find documents to add (in new list but not in old list)
      const documentsToAdd = documentIds.filter(id => !oldDocumentIds.includes(id));

      // Find documents to remove (in old list but not in new list)
      const documentsToRemove = oldDocumentIds.filter(id => !documentIds.includes(id));

      // Add new documents to class
      for (const documentId of documentsToAdd) {
        const document = documents.find(doc => doc.id === documentId);
        if (document) {
          await handleAssignDocumentToClass(documentId, document.filename, classId, 'add');
        }
      }

      // Remove documents from class
      for (const documentId of documentsToRemove) {
        const document = documents.find(doc => doc.id === documentId);
        if (document) {
          try {
            await handleAssignDocumentToClass(documentId, document.filename, classId, 'remove');
          } catch (error) {
            console.error(`Failed to remove document ${document.filename}:`, error);
          }
        }
      }

    } catch (error) {
      console.error('Failed to sync document assignments with backend:', error);
    }
  };

  const handleAssignDocumentToClass = async (documentId: string, documentSource: string, classId: string, operation: 'add' | 'remove') => {
    setLoadingDocuments(prev => {
      const newSet = new Set(prev);
      newSet.add(documentId);
      return newSet;
    });
    try {
      await apiService.assignDocumentToClass(documentId, documentSource, classId, operation);

      // Update local documents state (for assigned_classes)
      setDocuments(prevDocs =>
        prevDocs.map(doc => {
          if (doc.id === documentId) {
            const updatedClasses = operation === 'add'
              ? doc.assigned_classes.includes(classId)
                ? doc.assigned_classes // Already exists, don't add duplicate
                : [...doc.assigned_classes, classId] // Add only if not exists
              : doc.assigned_classes.filter(id => id !== classId);
            return { ...doc, assigned_classes: updatedClasses };
          }
          return doc;
        })
      );

      // Update userClasses state (for document counts and edit form highlighting)
      setUserClasses(prevClasses =>
        prevClasses.map(userClass => {
          if (userClass.id === classId) {
            const currentDocuments = userClass.documents || [];
            const updatedDocuments = operation === 'add'
              ? currentDocuments.includes(documentId)
                ? currentDocuments // Already included
                : [...currentDocuments, documentId]
              : currentDocuments.filter(id => id !== documentId);
            return { ...userClass, documents: updatedDocuments };
          }
          return userClass;
        })
      );

      // Update localStorage
      const updatedClasses = userClasses.map(userClass => {
        if (userClass.id === classId) {
          const currentDocuments = userClass.documents || [];
          const updatedDocuments = operation === 'add'
            ? currentDocuments.includes(documentId)
              ? currentDocuments
              : [...currentDocuments, documentId]
            : currentDocuments.filter(id => id !== documentId);
          return { ...userClass, documents: updatedDocuments };
        }
        return userClass;
      });
      localStorage.setItem('userClasses', JSON.stringify(updatedClasses));

      // Update active class if it's the one being modified
      if (activeClass?.id === classId) {
        setActiveClass(prev => {
          if (!prev) return null;
          const currentDocuments = prev.documents || [];
          const updatedDocuments = operation === 'add'
            ? currentDocuments.includes(documentId)
              ? currentDocuments
              : [...currentDocuments, documentId]
            : currentDocuments.filter(id => id !== documentId);
          return { ...prev, documents: updatedDocuments };
        });
      }

    } catch (error) {
      console.error('Class assignment failed:', error);
    } finally {
      setLoadingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  const getUserMessageCount = () => {
    return messages.filter(msg => msg.role === 'user').length;
  };

  // Mobile page renderer
  const renderMobilePage = () => {
    switch (mobilePage) {
      case 'chat':
        return (
          <MobileChatInterface
            messages={messages}
            mobileInput={mobileInput}
            setMobileInput={setMobileInput}
            showCommandSuggestions={showCommandSuggestions}
            setShowCommandSuggestions={setShowCommandSuggestions}
            isChatLoading={isChatLoading}
            activeClass={activeClass}
            handleNewChat={handleNewChat}
            handleSendMessage={handleSendMessage}
          />
        );

      case 'home':
        return (
          <div className="relative" style={{
            height: '100vh',
            minHeight: '100vh',
            zIndex: 10,
            paddingTop: 'calc(56px + env(safe-area-inset-top))' // Account for top navigation bar (56px)
          }}>
            {/* Greeting Section */}
            <div className="px-5 pt-4 pb-6">
              <h1 className="text-[28px] font-semibold tracking-tight text-white" style={{
                lineHeight: '1.1'
              }}>
                {(() => {
                  const hour = new Date().getHours();
                  const userName = user?.displayName || user?.email?.split('@')[0] || 'User';
                  if (hour < 12) return `Good morning, ${userName}`;
                  if (hour < 17) return `Good afternoon, ${userName}`;
                  return `Good evening, ${userName}`;
                })()}&nbsp;
                <Heart className="w-6 h-6 text-[#AF52DE] animate-pulse inline-block ml-1" style={{ verticalAlign: 'middle', transform: 'translateY(-2px)' }} />
              </h1>
              <p className="text-sm text-gray-400/90 mt-1">
                Ready to explore your documents?
              </p>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto pb-40 relative" style={{
              height: `calc(100vh - env(safe-area-inset-top) - ${(() => {
                const userName = user?.displayName || user?.email?.split('@')[0] || 'User';
                const isLongName = userName.length > 12;
                return isLongName ? '140px' : '120px';
              })()})`,
              minHeight: `calc(100vh - env(safe-area-inset-top) - ${(() => {
                const userName = user?.displayName || user?.email?.split('@')[0] || 'User';
                const isLongName = userName.length > 12;
                return isLongName ? '140px' : '120px';
              })()})`,
              marginTop: `calc(env(safe-area-inset-top) + ${(() => {
                const userName = user?.displayName || user?.email?.split('@')[0] || 'User';
                const isLongName = userName.length > 12;
                return isLongName ? '80px' : '60px';
              })()})`,
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              zIndex: 10,
              paddingTop: '20px',
              mask: 'linear-gradient(to bottom, transparent 0px, black 15px, black 100%)',
              WebkitMask: 'linear-gradient(to bottom, transparent 0px, black 15px, black 100%)'
            }}>

              <div className="space-y-4 px-5">
              {/* Learning Progress Card */}
              <button
                className="w-full px-4 py-3 animate-slide-in-bottom bg-[#1C1C1E]/50 backdrop-blur-xl border border-white/10 rounded-2xl text-left transition-all duration-200 active:scale-[0.98] shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
                style={{
                  animationDelay: '0.1s',
                  animationFillMode: 'both',
                  WebkitTapHighlightColor: 'transparent'
                }}
                onClick={() => setMobilePage('rewards')}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white/80">
                    Learning Progress
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Star className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_4px_rgba(255,255,0,0.3)]" />
                    <span className="text-lg font-semibold text-white">
                      {userProfile?.stats?.total_points || 610} pts
                    </span>
                  </div>
                </div>

                {/* Progress toward next achievement or current stats */}
                {(() => {
                  const inProgress = achievements.filter(a => a.unlocked_at === null && (a.progress || 0) > 0);
                  const nextGoal = inProgress.length > 0 ? inProgress[0] : null;
                  const completed = achievements.filter(a => a.unlocked_at !== null).length;
                  const total = achievements.length;

                  if (nextGoal) {
                    const progress = ((nextGoal.progress || 0) / (nextGoal.target || 1)) * 100;
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-gray-400">
                            Next: {nextGoal.name}
                          </span>
                          <span className="text-sm text-gray-400">
                            {nextGoal.progress}/{nextGoal.target}
                          </span>
                        </div>
                        <div className="ios-progress-bar">
                          <div
                            className="ios-progress-fill"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex items-center justify-between">
                        <span className="ios-text-caption text-white/70">
                          Achievements unlocked
                        </span>
                        <div className="flex items-center space-x-1">
                          <Trophy className="w-4 h-4 text-purple-400" />
                          <span className="ios-text-caption text-white/70">
                            {completed} of {total}
                          </span>
                        </div>
                      </div>
                    );
                  }
                })()}
              </button>

              {/* Classes section removed - now accessed via top navigation */}

              {/* Create Class Form - Keep this for backward compatibility with existing create class flow */}
              {showMobileClassForm && createPortal(
                  <>
                    {/* Soft overlay behind form - covers entire screen */}
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-md animate-fade-in" style={{ zIndex: 999 }} />

                    {/* Form container - centered */}
                    <div
                      className="fixed inset-0 flex items-center justify-center p-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-6"
                      style={{
                        zIndex: 1000,
                        height: '100vh',
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0
                      }}>
                      <div
                        className="w-full max-w-sm rounded-[20px] border border-white/10 animate-slide-in-bottom duration-500 ease-out"
                        style={{
                          background: 'rgba(28, 28, 30, 0.4)',
                          backdropFilter: 'blur(20px) saturate(120%)',
                          WebkitBackdropFilter: 'blur(20px) saturate(120%)',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                          padding: '20px 24px'
                        }}
                      >
                      <div className="space-y-4">
                        {mobileFormStep === 'class' ? (
                          <div className="space-y-4">
                            <div className="text-center pb-2">
                              <h3 className="text-lg font-medium text-white mb-1">{editingMobileClass ? 'Edit Class' : 'Create New Class'}</h3>
                              <p className="text-gray-400 text-sm">Choose a name and subject type</p>
                            </div>
                            <input
                              type="text"
                              value={mobileClassFormData.name}
                              onChange={(e) => setMobileClassFormData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Class name (e.g., History 101)"
                              className="w-full px-4 py-3 rounded-full text-sm bg-[#2C2C2E]/70 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/60 caret-purple-500 backdrop-blur-sm transition-all duration-200"
                              autoFocus
                            />
                            <div className="grid grid-cols-3 gap-2">
                              {Object.entries(DOMAIN_TYPE_INFO).map(([type, info]) => {
                                const Icon = info.icon;
                                return (
                                  <button
                                    key={type}
                                    onClick={() => {
                                      // Use immediate state update for better responsiveness
                                      setMobileClassFormData(prev => ({ ...prev, type: type as DomainType }));
                                    }}
                                    className={`aspect-square p-1.5 rounded-3xl transition-[background-color,transform,box-shadow] duration-100 ease-out flex flex-col items-center justify-center gap-0.5 active:scale-95 focus:outline-none ${
                                      mobileClassFormData.type === type
                                        ? 'bg-gradient-to-r from-purple-500/20 to-violet-500/20 shadow-lg text-white'
                                        : 'bg-[#2C2C2E]/20 text-white/60 backdrop-blur-sm'
                                    }`}
                                  >
                                    <Icon className="w-[20px] h-[20px]" />
                                    <span className="text-[13px] font-medium text-center leading-tight">{info.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="text-center pb-2">
                              <h4 className="text-lg font-medium text-white mb-1">Add Documents</h4>
                              <p className="text-gray-400 text-sm">Upload or select documents for your class</p>
                            </div>

                            {/* Upload new document button - pill style */}
                            <div className="flex justify-center">
                              <button
                                onClick={() => {
                                  // Trigger file input (we'll need to add a hidden input)
                                  const fileInput = document.createElement('input');
                                  fileInput.type = 'file';
                                  fileInput.accept = '.pdf,.txt,.md,.doc,.docx';
                                  fileInput.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) {
                                      // Handle file upload
                                      console.log('File selected:', file.name);
                                      // You can implement actual upload logic here
                                    }
                                  };
                                  fileInput.click();
                                }}
                                className="py-2.5 px-6 rounded-full transition-all duration-200 active:scale-[0.95] bg-purple-500/10 border border-purple-500/30 backdrop-blur-sm flex items-center justify-center gap-2"
                                style={{
                                  WebkitTapHighlightColor: 'transparent'
                                }}
                              >
                                <Plus className="w-4 h-4 text-purple-400" />
                                <span className="text-sm font-medium text-purple-400">Upload Document</span>
                              </button>
                            </div>

                            {/* Existing documents */}
                            {documents.length > 0 ? (
                              <div>
                                <div className="text-sm font-medium text-white mb-3">Existing Documents</div>
                                <div className="space-y-2 scrollbar-none" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                  {documents.map((doc) => (
                                    <button
                                      key={doc.id}
                                      type="button"
                                      onClick={() => {
                                        setMobileEditingClassDocs(prev =>
                                          prev.includes(doc.id)
                                            ? prev.filter(id => id !== doc.id)
                                            : [...prev, doc.id]
                                        );
                                      }}
                                      className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-all duration-200 active:scale-95 ${
                                        mobileEditingClassDocs.includes(doc.id)
                                          ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/20 text-white border-2 border-purple-500/60 ring-1 ring-purple-500/30'
                                          : 'bg-white/8 text-white/90 hover:bg-white/12'
                                      }`}
                                      style={{
                                        WebkitTapHighlightColor: 'transparent'
                                      }}
                                    >
                                      <div className="flex items-center space-x-3 min-w-0">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                          mobileEditingClassDocs.includes(doc.id)
                                            ? 'bg-purple-500/30'
                                            : 'bg-gray-600/50'
                                        }`}>
                                          <FileText className={`w-5 h-5 ${
                                            mobileEditingClassDocs.includes(doc.id)
                                              ? 'text-purple-400'
                                              : 'text-gray-400'
                                          }`} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="text-sm font-medium truncate">{doc.filename}</div>
                                          <div className="text-xs text-gray-400">Document</div>
                                        </div>
                                      </div>
                                      {mobileEditingClassDocs.includes(doc.id) && (
                                        <div className="w-3 h-3 rounded-full bg-purple-400 flex-shrink-0"></div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <div className="text-gray-400 text-sm">No documents available</div>
                                <div className="text-gray-500 text-xs mt-1">Upload your first document above</div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex space-x-3 pt-2">
                          {mobileFormStep === 'class' ? (
                            <>
                              <button
                                onClick={() => {
                                  if (mobileClassFormData.name.trim() && mobileClassFormData.type) {
                                    setMobileFormStep('docs');
                                  }
                                }}
                                disabled={!mobileClassFormData.name.trim() || !mobileClassFormData.type}
                                className="flex-1 py-3 px-4 rounded-full font-medium text-sm transition-all duration-200 active:scale-95 text-white"
                                style={{
                                  background: (mobileClassFormData.name.trim() && mobileClassFormData.type)
                                    ? 'linear-gradient(135deg, #007AFF 0%, #AF52DE 100%)'
                                    : 'rgba(147, 51, 234, 0.3)',
                                  boxShadow: 'none'
                                }}
                              >
                                Next
                              </button>
                              <button
                                onClick={() => {
                                  setShowMobileClassForm(false);
                                  setMobileFormStep('class');
                                  setMobileClassFormData({ name: '', type: null, description: '' });
                                  setEditingMobileClass(null);
                                  setMobileEditingClassDocs([]);
                                }}
                                className="px-4 py-3 rounded-full text-white/70 hover:text-white text-sm font-medium transition-all duration-200 active:scale-95 bg-white/5 backdrop-blur-sm"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setMobileFormStep('class')}
                                className="px-4 py-3 rounded-full text-white/70 hover:text-white text-sm font-medium transition-all duration-200 active:scale-95 bg-white/5 backdrop-blur-sm"
                              >
                                Back
                              </button>
                              <button
                                onClick={async () => {
                                  if (mobileClassFormData.name.trim() && !isEditingMobileClass) {
                                    setIsEditingMobileClass(true);
                                    try {
                                      if (editingMobileClass) {
                                        handleEditClass(
                                          editingMobileClass.id,
                                          mobileClassFormData.name,
                                          mobileClassFormData.type!,
                                          mobileClassFormData.description
                                        );
                                        await new Promise(resolve => setTimeout(resolve, 100));
                                        handleAssignDocuments(editingMobileClass.id, mobileEditingClassDocs);
                                        await new Promise(resolve => setTimeout(resolve, 2000));
                                        setEditingMobileClass(null);
                                        setMobileEditingClassDocs([]);
                                      } else {
                                        handleCreateClass(
                                          mobileClassFormData.name,
                                          mobileClassFormData.type!,
                                          mobileClassFormData.description
                                        );
                                      }
                                      setMobileClassFormData({ name: '', type: null, description: '' });
                                      setShowMobileClassForm(false);
                                      setMobileFormStep('class');
                                    } finally {
                                      setIsEditingMobileClass(false);
                                    }
                                  }
                                }}
                                disabled={!mobileClassFormData.name.trim() || !mobileClassFormData.type || isEditingMobileClass}
                                className="flex-1 py-3 px-4 rounded-full font-medium text-sm transition-all duration-200 active:scale-95 text-white flex items-center justify-center gap-1"
                                style={{
                                  background: (mobileClassFormData.name.trim() && mobileClassFormData.type && !isEditingMobileClass)
                                    ? 'linear-gradient(135deg, #007AFF 0%, #AF52DE 100%)'
                                    : 'rgba(147, 51, 234, 0.3)',
                                  boxShadow: 'none'
                                }}
                              >
                                {isEditingMobileClass && (
                                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                                )}
                                {isEditingMobileClass
                                  ? (editingMobileClass ? 'Updating...' : 'Creating...')
                                  : (editingMobileClass ? 'Update' : 'Create')
                                }
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    </div>
                  </>,
                  document.body
                )}

              {/* Recent Chats - Show based on active class selection */}
              {(() => {
                // Filter sessions based on active class (same logic as desktop)
                const filteredSessions = activeClass
                  ? sessions.filter(session => session.class_id === activeClass.id)
                  : sessions.filter(session => !session.class_id || session.class_id === null);

                return (
                  <div className="flex flex-col flex-1 min-h-0 space-y-3 mt-2 animate-slide-in-bottom"
                    style={{
                      animationDelay: '0.2s',
                      animationFillMode: 'both'
                    }}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="ios-title text-white/80">
                        Recent Chats{activeClass ? ` - ${activeClass.name}` : ''}
                      </h3>
                      <button
                        className="w-9 h-9 min-w-9 rounded-full flex-shrink-0 bg-gradient-to-r from-[#6D5FFD] to-[#9E78FF] shadow-lg shadow-purple-500/30 flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95"
                        style={{
                          WebkitTapHighlightColor: 'transparent',
                          backdropFilter: 'blur(10px)'
                        }}
                        onClick={() => {
                          setCurrentSessionId(null);
                          setMessages([]);
                          setMobilePage('chat');
                        }}
                      >
                        <Plus className="w-5 h-5 text-white" />
                      </button>
                    </div>
                    <div className="space-y-3 flex-1 overflow-y-auto scrollbar-none">
                      {filteredSessions.length === 0 ? (
                        <div className="text-center py-4">
                          <div className={`w-10 h-10 mx-auto mb-3 rounded-full flex items-center justify-center ${
                            theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
                          }`}>
                            <MessageSquare className={`w-4 h-4 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`} />
                          </div>
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                            No chats yet
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredSessions.map((session) => (
                            <div
                              key={session.id}
                              className="px-4 py-2.5 transition-all duration-300 active:scale-[0.98] active:bg-white/5 hover:bg-white/8 rounded-2xl bg-[#1C1C1E]/30 backdrop-blur-md"
                              style={{
                                WebkitTapHighlightColor: 'transparent',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                              }}
                            >
                              <div className="flex items-center justify-between">
                                {editingSessionId === session.id ? (
                                  <div className="flex-1 flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={editingSessionName}
                                      onChange={(e) => setEditingSessionName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleEditMobileSession(session.id, editingSessionName);
                                        } else if (e.key === 'Escape') {
                                          handleCancelEditingMobileSession();
                                        }
                                      }}
                                      onBlur={(e) => {
                                        // Only cancel if we're not clicking on action buttons
                                        const relatedTarget = e.relatedTarget as HTMLElement;
                                        if (!relatedTarget || !relatedTarget.closest('[data-edit-action]')) {
                                          handleCancelEditingMobileSession();
                                        }
                                      }}
                                      className="flex-1 bg-white/8 text-white px-4 py-2.5 rounded-full text-sm outline-none ring-2 ring-violet-500/50 caret-violet-500 transition-all duration-300 placeholder-white/50"
                                      style={{
                                        WebkitTapHighlightColor: 'transparent',
                                        fontSize: '16px', // Prevent iOS zoom
                                        caretColor: '#A855F7',
                                        '--tw-ring-color': 'rgba(139, 92, 246, 0.5)',
                                        boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.5)',
                                        outline: 'none',
                                        border: 'none',
                                        WebkitAppearance: 'none',
                                        MozAppearance: 'none'
                                      } as React.CSSProperties}
                                      placeholder="Chat name..."
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => handleEditMobileSession(session.id, editingSessionName)}
                                      className="w-7 h-7 min-w-7 rounded-full flex-shrink-0 bg-green-500/15 flex items-center justify-center text-green-400 hover:bg-green-500/25 transition-all duration-200 active:scale-95"
                                      style={{ WebkitTapHighlightColor: 'transparent' }}
                                      data-edit-action="save"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={handleCancelEditingMobileSession}
                                      className="w-7 h-7 min-w-7 rounded-full flex-shrink-0 bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 transition-all duration-200 active:scale-95"
                                      style={{ WebkitTapHighlightColor: 'transparent' }}
                                      data-edit-action="cancel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        handleSelectSession(session.id);
                                        setMobilePage('chat');
                                      }}
                                      className="flex-1 text-left min-w-0 flex items-center"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <h4 className="ios-title text-white truncate">
                                          {session.name}
                                        </h4>
                                        <p className="text-xs text-gray-400 mt-1">
                                          {formatLocalDate(session.updated_at)}
                                        </p>
                                      </div>
                                      <ChevronRight className="w-4 h-4 text-white/40 ml-3 flex-shrink-0" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartEditingMobileSession(session.id, session.name);
                                      }}
                                      className="w-7 h-7 min-w-7 rounded-full flex-shrink-0 bg-white/5 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-all duration-200 active:scale-95 ml-2"
                                      style={{
                                        WebkitTapHighlightColor: 'transparent'
                                      }}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSession(session.id);
                                      }}
                                      className="w-7 h-7 min-w-7 rounded-full flex-shrink-0 bg-white/5 flex items-center justify-center text-white/70 hover:text-red-400 hover:bg-red-500/15 transition-all duration-200 active:scale-95 ml-2"
                                      style={{
                                        WebkitTapHighlightColor: 'transparent'
                                      }}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>
          </div>
        );
      case 'docs':
        return (
          <div className="relative" style={{
            height: '100vh',
            paddingTop: 'calc(56px + env(safe-area-inset-top))', // Account for top navigation bar (56px)
            zIndex: 10
          }}>
            {/* Header */}
            <div
              className="px-5 flex items-center justify-between"
              style={{
                paddingTop: '8px',
                paddingBottom: '16px',
                background: 'transparent',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 20
              }}>
              <div>
                <h2 className="ios-large-title text-white">
                  Documents
                </h2>
                <p className="ios-subtitle text-white mt-2">
                  {(() => {
                    const filteredCount = mobileDocumentFilter
                      ? documents.filter(doc => doc.assigned_classes?.includes(mobileDocumentFilter)).length
                      : documents.length;
                    const totalCount = documents.length;
                    if (mobileDocumentFilter && filteredCount !== totalCount) {
                      return `${filteredCount} of ${totalCount} documents`;
                    }
                    return `${totalCount} document${totalCount !== 1 ? 's' : ''} uploaded`;
                  })()}
                </p>
              </div>
              {/* iOS-Style Upload Button */}
              <label className="w-12 h-12 rounded-full bg-gradient-to-r from-[#6D5FFD] to-[#9E78FF] shadow-lg shadow-purple-500/30 flex items-center justify-center cursor-pointer transition-all duration-150 hover:scale-105 active:scale-[0.92] hover:shadow-purple-500/40"
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}>
                <Plus className="w-6 h-6 text-white" />
                <input
                  type="file"
                  accept=".pdf,.txt,.md,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleUploadDocument(file);
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>


            {/* Scrollable Documents Area */}
            <div
              className="overflow-y-scroll"
              style={{
                height: '100%',
                paddingTop: '120px', // Space for fixed header
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'auto',
                scrollSnapType: 'y mandatory',
                mask: 'linear-gradient(to bottom, transparent 0px, black 40px, black 100%)',
                WebkitMask: 'linear-gradient(to bottom, transparent 0px, black 40px, black 100%)'
              }}>
              {/* Content with scroll snap for perfect return */}
              <div style={{
                minHeight: 'calc(100% + 40px)',
                paddingBottom: '40px',
                scrollSnapAlign: 'start'
              }}>
              {/* Documents Content Area */}
              <div className="space-y-4 px-5">
              {/* Class Filter - Clean */}
              {userClasses.length > 0 && (
                <div className="relative" ref={mobileFilterRef}>
                    <button
                      ref={mobileFilterButtonRef}
                      onClick={() => {
                        if (!mobileFilterDropdownOpen && mobileFilterButtonRef.current) {
                          const rect = mobileFilterButtonRef.current.getBoundingClientRect();
                          setMobileDropdownPosition({
                            top: rect.bottom + window.scrollY,
                            left: rect.left + window.scrollX,
                            width: rect.width
                          });
                        }
                        setMobileFilterDropdownOpen(!mobileFilterDropdownOpen);
                      }}
                      className="w-full px-5 py-3.5 rounded-full text-sm bg-[#1C1C1E]/30 backdrop-blur-md border border-white/10 text-white focus:outline-none focus:bg-[#1C1C1E]/40 transition-all duration-150 flex items-center justify-between active:scale-[0.97] hover:bg-[#1C1C1E]/35 ios-body"
                      style={{
                        WebkitTapHighlightColor: 'transparent',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                        touchAction: 'manipulation'
                      }}
                    >
                      <span>
                        {mobileDocumentFilter
                          ? userClasses.find(cls => cls.id === mobileDocumentFilter)?.name || 'All Documents'
                          : 'All Documents'
                        }
                      </span>
                      <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${
                        mobileFilterDropdownOpen ? 'rotate-90' : 'rotate-0'
                      }`} />
                    </button>

                    {mobileFilterDropdownOpen && mobileDropdownPosition && createPortal(
                      <>
                        <div
                          className="fixed inset-0 z-[9998]"
                          onClick={() => setMobileFilterDropdownOpen(false)}
                        />
                        <div className="dropdown-container fixed rounded-3xl shadow-2xl z-[9999] overflow-hidden backdrop-blur-2xl bg-[#1C1C1E]/40 animate-slide-in-bottom" style={{
                          top: mobileDropdownPosition.top + 2,
                          left: mobileDropdownPosition.left,
                          width: mobileDropdownPosition.width,
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)',
                          animationDuration: '0.2s',
                          animationFillMode: 'both'
                        }}>
                          <div className="relative z-10">
                            <button
                              onClick={() => {
                                setMobileDocumentFilter(null);
                                setMobileFilterDropdownOpen(false);
                              }}
                              className={`w-full px-5 py-3.5 text-base text-left transition-all duration-150 active:scale-[0.97] ios-body ${
                                !mobileDocumentFilter
                                  ? 'bg-gradient-to-r from-purple-500/15 to-violet-500/15 text-white font-medium'
                                  : 'text-white/90 hover:bg-white/8 hover:text-white'
                              }`}
                              style={{
                                WebkitTapHighlightColor: 'transparent',
                                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif'
                              }}
                            >
                              All Documents
                            </button>
                            {userClasses.map((cls) => (
                              <button
                                key={cls.id}
                                onClick={() => {
                                  setMobileDocumentFilter(cls.id);
                                  setMobileFilterDropdownOpen(false);
                                }}
                                className={`w-full px-5 py-3.5 text-base text-left transition-all duration-150 active:scale-[0.97] ios-body ${
                                  mobileDocumentFilter === cls.id
                                    ? 'bg-gradient-to-r from-purple-500/15 to-violet-500/15 text-white font-medium'
                                    : 'text-white/90 hover:bg-white/8 hover:text-white'
                                }`}
                                style={{
                                  WebkitTapHighlightColor: 'transparent',
                                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif'
                                }}
                              >
                                {cls.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>,
                      document.body
                    )}
                </div>
              )}

              {/* Loading State */}
              {isDocumentLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="relative w-6 h-6">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <div
                        key={i}
                        className={`absolute w-1.5 h-1.5 rounded-full ${
                          theme === 'dark' ? 'bg-white/60' : 'bg-black/60'
                        }`}
                        style={{
                          top: '50%',
                          left: '50%',
                          transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-12px)`,
                          animation: `dotSpinner 1.2s ease-in-out infinite`,
                          animationDelay: `${i * 0.15}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Documents List */}
              {documents.filter(doc => !mobileDocumentFilter || doc.assigned_classes?.includes(mobileDocumentFilter)).length === 0 && !isDocumentLoading ? (
                <div className="text-center py-8 space-y-2 animate-fade-in">
                  <div className="w-10 h-10 mx-auto rounded-full bg-white/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-white/60" />
                  </div>
                  <div>
                    <p className="ios-title text-white">
                      {mobileDocumentFilter ? 'No documents in this class' : 'No documents yet'}
                    </p>
                    <p className="ios-subtitle text-white/70 mt-1">
                      {mobileDocumentFilter
                        ? 'Upload documents to this class or select a different class'
                        : 'Upload your first document to get started'
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents
                    .filter(doc => !mobileDocumentFilter || doc.assigned_classes?.includes(mobileDocumentFilter))
                    .map((doc, index) => (
                    <div
                      key={doc.id}
                      className="p-4 transition-transform duration-150 ease-out rounded-2xl bg-[#1C1C1E]/40 backdrop-blur-md border border-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.25)] hover:bg-[#1C1C1E]/50 cursor-pointer"
                      style={{
                        WebkitTapHighlightColor: 'transparent',
                        touchAction: 'manipulation'
                      }}
                      onTouchStart={(e) => {
                        // Don't spring if touching interactive elements
                        const target = e.target as HTMLElement;
                        if (target.closest('button, input, [contenteditable]')) {
                          return;
                        }
                        const element = e.currentTarget;
                        element.style.transform = 'scale(0.98)';
                      }}
                      onTouchEnd={(e) => {
                        const element = e.currentTarget;
                        element.style.transform = 'scale(1)';
                      }}
                      onTouchCancel={(e) => {
                        const element = e.currentTarget;
                        element.style.transform = 'scale(1)';
                      }}
                      onMouseDown={(e) => {
                        // Don't spring if clicking interactive elements
                        const target = e.target as HTMLElement;
                        if (target.closest('button, input, [contenteditable]')) {
                          return;
                        }
                        const element = e.currentTarget;
                        element.style.transform = 'scale(0.98)';
                      }}
                      onMouseUp={(e) => {
                        const element = e.currentTarget;
                        element.style.transform = 'scale(1)';
                      }}
                      onMouseLeave={(e) => {
                        const element = e.currentTarget;
                        element.style.transform = 'scale(1)';
                      }}
                      onClick={(e) => {
                        // Only trigger if not clicking on interactive elements
                        const target = e.target as HTMLElement;
                        if (!target.closest('button, input, [contenteditable]')) {
                          console.log(`Clicked document: ${doc.filename}`);
                        }
                      }}>
                      <div className="flex items-start justify-between">
                        {editingDocumentId === doc.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editingDocumentName}
                              onChange={(e) => setEditingDocumentName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleEditDocument(doc.id, editingDocumentName);
                                } else if (e.key === 'Escape') {
                                  handleCancelEditingDocument();
                                }
                              }}
                              onBlur={(e) => {
                                // Only cancel if we're not clicking on action buttons
                                const relatedTarget = e.relatedTarget as HTMLElement;
                                if (!relatedTarget || !relatedTarget.closest('[data-edit-action]')) {
                                  handleCancelEditingDocument();
                                }
                              }}
                              className="flex-1 bg-white/8 text-white px-4 py-2.5 rounded-full text-sm outline-none ring-2 ring-violet-500/50 caret-violet-500 transition-all duration-300 placeholder-white/50"
                              style={{
                                WebkitTapHighlightColor: 'transparent',
                                fontSize: '16px', // Prevent iOS zoom
                                caretColor: '#A855F7',
                                '--tw-ring-color': 'rgba(139, 92, 246, 0.5)',
                                boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.5)',
                                outline: 'none',
                                border: 'none',
                                WebkitAppearance: 'none',
                                MozAppearance: 'none'
                              } as React.CSSProperties}
                              placeholder="Document name..."
                              autoFocus
                            />
                            <button
                              onClick={() => handleEditDocument(doc.id, editingDocumentName)}
                              className="w-7 h-7 min-w-7 rounded-full flex-shrink-0 bg-green-500/15 flex items-center justify-center text-green-400 hover:bg-green-500/25 transition-all duration-200 active:scale-95"
                              style={{ WebkitTapHighlightColor: 'transparent' }}
                              data-edit-action="save"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={handleCancelEditingDocument}
                              className="w-7 h-7 min-w-7 rounded-full flex-shrink-0 bg-white/5 flex items-center justify-center text-white/60 hover:bg-white/10 transition-all duration-200 active:scale-95"
                              style={{ WebkitTapHighlightColor: 'transparent' }}
                              data-edit-action="cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <h4 className="ios-title text-white truncate">
                                {doc.filename}
                              </h4>
                              <div className="flex items-center flex-wrap gap-2 mt-2">
                                {doc.assigned_classes && doc.assigned_classes.length > 0 && (
                                  doc.assigned_classes.map(classId => {
                                    const userClass = userClasses.find(cls => cls.id === classId);
                                    return userClass ? (
                                      <span key={classId} className="ios-caption px-2 py-1 rounded-full bg-white/5 text-white/70">
                                        {userClass.name}
                                      </span>
                                    ) : null;
                                  })
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleStartEditingDocument(doc.id, doc.filename)}
                                className="w-7 h-7 min-w-7 rounded-full flex-shrink-0 bg-white/5 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-all duration-200 active:scale-95"
                                style={{
                                  WebkitTapHighlightColor: 'transparent'
                                }}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="w-7 h-7 min-w-7 rounded-full flex-shrink-0 bg-white/5 flex items-center justify-center text-white/70 hover:text-red-400 hover:bg-red-500/15 transition-all duration-200 active:scale-95"
                                style={{
                                  WebkitTapHighlightColor: 'transparent'
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>
            </div>
          </div>
        );

      case 'rewards':
        return (
          <div className="h-full flex flex-col" style={{
            paddingTop: 'calc(56px + env(safe-area-inset-top))' // Account for top navigation bar (56px)
          }}>
            {/* Header */}
            <div
              className="px-5 flex items-center justify-between"
              style={{
                paddingTop: '8px',
                paddingBottom: '16px'
              }}>
              <div>
                <h2 className="ios-large-title text-white">
                  Rewards
                </h2>
                <p className="ios-subtitle text-white mt-2">
                  {mobileRewardsTab === 'achievements' ? 'Track your learning progress' : 'Redeem your points for rewards'}
                </p>
              </div>
              <div className="rounded-full px-2 py-0 flex items-center gap-2 whitespace-nowrap bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border border-yellow-400/40">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="font-bold text-sm text-yellow-400">
                  {userProfile?.stats?.total_points || 0} pts
                </span>
              </div>
            </div>

            {/* Fixed Segmented Control */}
            <div className="px-5 pb-4">
              <div className={`flex p-1 rounded-2xl ${
                theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
              }`}>
                {[
                  { key: 'achievements', label: 'Achievements' },
                  { key: 'store', label: 'Store' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setPreviousRewardsTab(mobileRewardsTab);
                      setMobileRewardsTab(key as any);
                    }}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-xl transition-all duration-150 active:scale-95 ${
                      mobileRewardsTab === key
                        ? 'bg-white text-black shadow-sm'
                        : 'text-white/70'
                    }`}
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Content */}
            <div
              className="flex-1 overflow-y-auto"
              style={{
                overscrollBehavior: 'auto',
                WebkitOverflowScrolling: 'touch',
                mask: 'linear-gradient(to bottom, transparent 0px, black 20px, black 100%)',
                WebkitMask: 'linear-gradient(to bottom, transparent 0px, black 20px, black 100%)'
              }}
            >
              <div className="px-5 space-y-4 pt-4 pb-40">
              {mobileRewardsTab === 'achievements' ? (
                <div
                  key="achievements-content"
                  className={
                    previousRewardsTab === 'store'
                      ? 'animate-slide-in-left'
                      : ''
                  }>
              {/* In Progress Section */}
              {achievements.filter(a => a.unlocked_at === null).length > 0 && (
                <div className="space-y-3 mt-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-400" />
                    <h4 className={`text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      IN PROGRESS
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {achievements.filter(a => a.unlocked_at === null).map((achievement, index) => {
                      const getIcon = (type: string) => {
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

                      const getColor = (type: string) => {
                        const colorMap: { [key: string]: string } = {
                          first_chat: 'text-blue-400',
                          prolific_researcher: 'text-green-400',
                          document_uploader: 'text-orange-400',
                          early_adopter: 'text-yellow-400',
                          knowledge_seeker: 'text-indigo-400',
                          domain_explorer: 'text-purple-400',
                        };
                        return colorMap[type] || 'text-gray-400';
                      };

                      const Icon = getIcon(achievement.type);

                      return (
                        <div
                          key={achievement.id}
                          className={`p-3 rounded-lg animate-fade-in ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}
                          style={{
                            animationDelay: `${0.2 + index * 0.05}s`,
                            animationFillMode: 'both'
                          }}>
                          <div className="flex items-start justify-between mb-2">
                            <Icon className={`w-5 h-5 ${getColor(achievement.type)}`} />
                            <div className="bg-gradient-to-r from-blue-400/20 to-purple-400/20 border border-purple-400/40 rounded-full px-2 py-1 flex items-center gap-1 whitespace-nowrap">
                              <Zap className="w-3 h-3 text-purple-400" />
                              <span className="text-xs font-bold text-purple-400">
                                +{achievement.points} pts
                              </span>
                            </div>
                          </div>

                          <h4 className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                            {achievement.name}
                          </h4>

                          <p className={`text-xs mb-2 ${theme === 'dark' ? 'text-white/70' : 'text-black/70'}`}>
                            {achievement.description}
                          </p>

                          <div className="space-y-1">
                            <div className={`w-full rounded-full h-2 ${theme === 'dark' ? 'bg-white/10' : 'bg-black/10'}`}>
                              <div
                                className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${((achievement.progress || 0) / (achievement.target || 1)) * 100}%` }}
                              />
                            </div>
                            <div className="text-right">
                              <span className={`text-xs ${theme === 'dark' ? 'text-white/50' : 'text-black/50'}`}>
                                {achievement.progress || 0}/{achievement.target || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Unlocked Section */}
              {achievements.filter(a => a.unlocked_at !== null).length > 0 && (
                <div className="space-y-3 mt-8">
                  <div className="flex items-center gap-2">
                    <Trophy className={`w-4 h-4 ${
                      theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
                    }`} />
                    <h4 className={`text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      UNLOCKED
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {achievements.filter(a => a.unlocked_at !== null).map((achievement, index) => {
                      const getIcon = (type: string) => {
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

                      const getColor = (type: string) => {
                        const colorMap: { [key: string]: string } = {
                          first_chat: 'text-blue-400',
                          prolific_researcher: 'text-green-400',
                          document_uploader: 'text-orange-400',
                          early_adopter: 'text-yellow-400',
                          knowledge_seeker: 'text-indigo-400',
                          domain_explorer: 'text-purple-400',
                        };
                        return colorMap[type] || 'text-gray-400';
                      };

                      const Icon = getIcon(achievement.type);

                      return (
                        <div
                          key={achievement.id}
                          className={`relative p-3 rounded-lg animate-fade-in ${theme === 'dark' ? 'bg-white/10 shadow-lg' : 'bg-black/10 shadow-lg'}`}
                          style={{
                            animationDelay: `${0.2 + index * 0.05}s`,
                            animationFillMode: 'both'
                          }}>
                          <div className={`absolute inset-0 rounded-lg animate-pulse ${
                            theme === 'dark'
                              ? 'bg-gradient-to-r from-yellow-400/20 to-orange-400/20'
                              : 'bg-gradient-to-r from-yellow-300/40 to-amber-400/40'
                          }`} />

                          <div className="relative">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Icon className={`w-5 h-5 ${getColor(achievement.type)}`} />
                                <Award className={`w-4 h-4 ${
                                  theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
                                }`} />
                              </div>
                              <div className={`rounded-full px-2 py-1 flex items-center gap-1 whitespace-nowrap ${
                                theme === 'dark'
                                  ? 'bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border border-yellow-400/40'
                                  : 'bg-gradient-to-r from-yellow-300/50 to-amber-400/50 border border-amber-500/50'
                              }`}>
                                <Zap className={`w-3 h-3 ${
                                  theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
                                }`} />
                                <span className={`text-xs font-bold ${
                                  theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
                                }`}>
                                  +{achievement.points}
                                </span>
                              </div>
                            </div>

                            <h4 className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                              {achievement.name}
                            </h4>

                            <p className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-black/70'}`}>
                              {achievement.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

                  {/* Empty State */}
                  {achievements.length === 0 && (
                    <div className="text-center py-12">
                      <Trophy className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-white/30' : 'text-black/30'}`} />
                      <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                        No achievements yet
                      </p>
                      <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`}>
                        Start using RAG Scholar to unlock rewards!
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Store Tab Content */
                <div
                  key="store-content"
                  className={`space-y-4 ${
                    previousRewardsTab === 'achievements'
                      ? 'animate-slide-in-right'
                      : ''
                  }`}>
                  {/* Store Items with iOS Design */}
                  <div className="p-4 rounded-2xl transition-all duration-300 active:scale-[0.98] bg-[#1C1C1E]/40 backdrop-blur-md border border-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.25)] animate-fade-in"
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation',
                      animationDelay: '0.05s',
                      animationFillMode: 'both'
                    }}>
                    <div className="relative mb-3">
                      <div className="flex items-center gap-3 pr-14">
                        <div className="w-7 h-7 min-w-7 rounded-full flex-shrink-0 bg-[#6D5FFD] flex items-center justify-center">
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h4 className="ios-title text-white leading-tight">
                            Rounded Chat Input
                          </h4>
                          <p className="ios-caption text-white/70 mt-1">
                            Pill-shaped chat input with smooth corners
                          </p>
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 rounded-full px-2 py-0 bg-gradient-to-r from-purple-500/15 to-violet-500/15 border border-purple-400/20">
                        <span className="ios-caption font-semibold text-purple-400">
                          150 pts
                        </span>
                      </div>
                    </div>
                    <button
                      disabled={(userProfile?.stats?.total_points || 0) < 150}
                      className={`w-full py-2.5 rounded-full ios-body font-semibold transition-all duration-200 active:scale-[0.98] ${
                        (userProfile?.stats?.total_points || 0) >= 150
                          ? 'bg-gradient-to-r from-[#6D5FFD] to-[#9E78FF] text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/30'
                          : 'bg-white/5 border border-white/10 text-white/50 cursor-not-allowed'
                      }`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      {(userProfile?.stats?.total_points || 0) >= 150 ? 'Redeem' : `Need ${150 - (userProfile?.stats?.total_points || 0)} more points`}
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl transition-all duration-300 active:scale-[0.98] bg-[#1C1C1E]/40 backdrop-blur-md border border-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.25)] animate-fade-in"
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation',
                      animationDelay: '0.1s',
                      animationFillMode: 'both'
                    }}>
                    <div className="relative mb-3">
                      <div className="flex items-center gap-3 pr-14">
                        <div className="w-7 h-7 min-w-7 rounded-full flex-shrink-0 bg-purple-500 flex items-center justify-center">
                          <Star className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h4 className="ios-title text-white">
                            Space Theme
                          </h4>
                          <p className="ios-caption text-white/70 mt-1">
                            Deep space colors with starry gradients
                          </p>
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 rounded-full px-2 py-0 bg-gradient-to-r from-purple-500/15 to-violet-500/15 border border-purple-400/20">
                        <span className="ios-caption font-semibold text-purple-400">
                          250 pts
                        </span>
                      </div>
                    </div>
                    <button
                      disabled={(userProfile?.stats?.total_points || 0) < 250}
                      className={`w-full py-2.5 rounded-full ios-body font-semibold transition-all duration-200 active:scale-[0.98] ${
                        (userProfile?.stats?.total_points || 0) >= 250
                          ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/30'
                          : 'bg-white/5 border border-white/10 text-white/50 cursor-not-allowed'
                      }`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      {(userProfile?.stats?.total_points || 0) >= 250 ? 'Redeem' : `Need ${250 - (userProfile?.stats?.total_points || 0)} more points`}
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl transition-all duration-300 active:scale-[0.98] bg-[#1C1C1E]/40 backdrop-blur-md border border-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.25)] animate-fade-in"
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation',
                      animationDelay: '0.15s',
                      animationFillMode: 'both'
                    }}>
                    <div className="relative mb-3">
                      <div className="flex items-center gap-3 pr-14">
                        <div className="w-7 h-7 min-w-7 rounded-full flex-shrink-0 bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center">
                          <Heart className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h4 className="ios-title text-white">
                            Cherry Blossom Theme
                          </h4>
                          <p className="ios-caption text-white/70 mt-1">
                            Soft pink and white spring vibes
                          </p>
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 rounded-full px-2 py-0 bg-gradient-to-r from-pink-500/15 to-rose-500/15 border border-pink-400/20">
                        <span className="ios-caption font-semibold text-pink-400">
                          300 pts
                        </span>
                      </div>
                    </div>
                    <button
                      disabled={(userProfile?.stats?.total_points || 0) < 300}
                      className={`w-full py-2.5 rounded-full ios-body font-semibold transition-all duration-200 active:scale-[0.98] ${
                        (userProfile?.stats?.total_points || 0) >= 300
                          ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/25 hover:shadow-pink-500/30'
                          : 'bg-white/5 border border-white/10 text-white/50 cursor-not-allowed'
                      }`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      {(userProfile?.stats?.total_points || 0) >= 300 ? 'Redeem' : `Need ${300 - (userProfile?.stats?.total_points || 0)} more points`}
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl transition-all duration-300 active:scale-[0.98] bg-[#1C1C1E]/40 backdrop-blur-md border border-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.25)] animate-fade-in"
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation',
                      animationDelay: '0.2s',
                      animationFillMode: 'both'
                    }}>
                    <div className="relative mb-3">
                      <div className="flex items-center gap-3 pr-14">
                        <div className="w-7 h-7 min-w-7 rounded-full flex-shrink-0 bg-cyan-500 flex items-center justify-center">
                          <Award className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h4 className="ios-title text-white">
                            Cyberpunk Theme
                          </h4>
                          <p className="ios-caption text-white/70 mt-1">
                            Neon cyber colors with electric vibes
                          </p>
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 rounded-full px-2 py-0 bg-gradient-to-r from-cyan-500/15 to-teal-500/15 border border-cyan-400/20">
                        <span className="ios-caption font-semibold text-cyan-400">
                          400 pts
                        </span>
                      </div>
                    </div>
                    <button
                      disabled={(userProfile?.stats?.total_points || 0) < 400}
                      className={`w-full py-2.5 rounded-full ios-body font-semibold transition-all duration-200 active:scale-[0.98] ${
                        (userProfile?.stats?.total_points || 0) >= 400
                          ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/30'
                          : 'bg-white/5 border border-white/10 text-white/50 cursor-not-allowed'
                      }`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      {(userProfile?.stats?.total_points || 0) >= 400 ? 'Redeem' : `Need ${400 - (userProfile?.stats?.total_points || 0)} more points`}
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl transition-all duration-300 active:scale-[0.98] bg-[#1C1C1E]/40 backdrop-blur-md border border-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.25)] animate-fade-in"
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation',
                      animationDelay: '0.25s',
                      animationFillMode: 'both'
                    }}>
                    <div className="relative mb-3">
                      <div className="flex items-center gap-3 pr-14">
                        <div className="w-7 h-7 min-w-7 rounded-full flex-shrink-0 bg-green-500 flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h4 className="ios-title text-white">
                            Particle Effects
                          </h4>
                          <p className="ios-caption text-white/70 mt-1">
                            Floating sparkles and particle animations
                          </p>
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 rounded-full px-2 py-0 bg-gradient-to-r from-green-500/15 to-emerald-500/15 border border-green-400/20">
                        <span className="ios-caption font-semibold text-green-400">
                          500 pts
                        </span>
                      </div>
                    </div>
                    <button
                      disabled={(userProfile?.stats?.total_points || 0) < 500}
                      className={`w-full py-2.5 rounded-full ios-body font-semibold transition-all duration-200 active:scale-[0.98] ${
                        (userProfile?.stats?.total_points || 0) >= 500
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/30'
                          : 'bg-white/5 border border-white/10 text-white/50 cursor-not-allowed'
                      }`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      {(userProfile?.stats?.total_points || 0) >= 500 ? 'Redeem' : `Need ${500 - (userProfile?.stats?.total_points || 0)} more points`}
                    </button>
                  </div>
                </div>
              )}
              </div>
            </div>
            </div>
        );

      case 'settings':
        return (
          <SettingsModal isOpen={true} onClose={() => setMobilePage('home')} onOpenFeedback={() => setShowFeedbackModal(true)} />
        );

      default:
        return null;
    }
  };

  // Handle app initialization loading with premium splash screen
  if (loading) {
    return <SplashScreen isVisible={true} />;
  }

  // Handle transition from loading to login/main app
  if (!isAuthenticated) {
    return (
      <>
        <SplashScreen isVisible={false} />
        <LoginPage onLogin={login} onSignUp={signUp} onResetPassword={resetPassword} />
      </>
    );
  }

  // Show main UI immediately, with loading states in sidebar and chat

  return (
    <div className={`min-h-screen ${getBackgroundClass()}`} style={{
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)'
    }}>
      <div className="h-screen flex">
      {/* API Error Banner */}
      {apiError && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white p-2 text-center text-sm">
          <AlertCircle className="inline w-4 h-4 mr-2" />
          {apiError}
        </div>
      )}

      {/* Achievement Notifications */}
      {newlyUnlocked.map((achievement) => (
        <AchievementNotification
          key={`${achievement.id}-${achievement.unlocked_at}`}
          achievement={{
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            points: achievement.points,
            icon: achievement.icon
          }}
          onClose={() => dismissNotification(achievement.id)}
        />
      ))}

      {/* Theme Toggle with hover area - Desktop only */}
      {!isMobile && (
        <div
          className="fixed top-0 right-0 w-20 h-20 z-40 flex items-start justify-end p-4"
          onMouseEnter={handleThemeToggleMouseEnter}
          onMouseLeave={handleThemeToggleMouseLeave}
        >
        <div className={`transition-all duration-300 ${
          themeToggleVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}>
          <ThemeToggle
            theme={theme}
            themeMode={themeMode}
            onToggle={handleThemeToggleClick}
          />
        </div>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="hidden md:flex w-full">
        {/* Sidebar */}
        <Sidebar
          classes={userClasses}
          activeClass={activeClass}
          onCreateClass={handleCreateClass}
          onEditClass={handleEditClass}
          onSelectClass={handleSelectClass}
          onDeleteClass={handleDeleteClass}
          availableDocuments={documents.map(doc => ({ id: doc.id, filename: doc.filename }))}
          onAssignDocuments={handleAssignDocuments}
          sessionId={currentSessionId || chatSessionId}
          messageCount={getUserMessageCount()}
          onClearChat={handleClearChat}
          onNewSession={handleNewChat}
          onSelectSession={handleSelectSession}
          onRenameSession={handleRenameSession}
          onDeleteSession={handleDeleteSession}
          sessions={sessions}
          currentBackendSessionId={currentSessionId}
          isCollapsed={!sidebarOpen}
          documents={documents}
          onUpload={handleUploadDocument}
          onDeleteDocument={handleDeleteDocument}
          onReindex={handleReindexCollection}
          onAssignToClass={handleAssignDocumentToClass}
          isLoading={isDocumentLoading}
          loadingDocuments={loadingDocuments}
          onOpenSidebar={() => setSidebarOpen(true)}
          onCloseSidebar={() => setSidebarOpen(false)}
          backgroundCommandCount={backgroundCommandCount}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenFeedback={() => setShowFeedbackModal(true)}
          // Pass loading state to sidebar
          appLoading={appLoading}
          loadingStatus={loadingStatus}
        />

        <div className="flex-1 min-h-0 flex flex-col">
          {/* Desktop: Always show chat interface */}
          <div className="hidden md:block flex-1 min-h-0">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isChatLoading}
              currentDomain={activeClass?.domainType || DomainType.GENERAL}
              activeCollection="default"
              userName={user?.displayName || user?.email || 'User'}
              sidebarOpen={sidebarOpen}
            />
          </div>
          {/* Mobile: Show different pages based on active tab */}
          <div className="md:hidden flex-1">
            {renderMobilePage()}
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden w-full h-screen relative bg-transparent">
        {/* Top Navigation Bar - Only on mobile */}
        {isMobile && !showOnboarding && (
          <TopNavigationBar
            activeClass={activeClass}
            onClassSwitcherClick={() => setShowClassSwitcher(true)}
            onSearchClick={() => setShowGlobalSearch(true)}
            onSettingsClick={() => {
              setSettingsPage('main');
              setMobilePage('settings');
            }}
          />
        )}

        {renderMobilePage()}

        {/* Real WhatsApp-style Bottom Navigation Dock */}
        <div
          className="fixed left-0 right-0 z-50"
          style={{
            display: isMobile ? 'block' : 'none',
            bottom: '-10px',
            background: 'rgba(28, 28, 30, 0.6)',
            backdropFilter: 'blur(22px) saturate(160%)',
            WebkitBackdropFilter: 'blur(22px) saturate(160%)',
            borderTop: '0.5px solid rgba(255, 255, 255, 0.1)',
            transform: 'translateY(0)',
            transition: 'transform 0.3s ease-out',
            pointerEvents: 'auto'
          }}
        >
          <div
            className="flex justify-around items-end"
            style={{
              paddingTop: '4px',
              paddingBottom: 'calc(4px + env(safe-area-inset-bottom))',
              paddingLeft: 'env(safe-area-inset-left)',
              paddingRight: 'env(safe-area-inset-right)',
            }}
          >
            {[
              { page: 'home', icon: Home, label: 'Home' },
              { page: 'chat', icon: MessageSquare, label: 'Chat' },
              { page: 'docs', icon: Upload, label: 'Docs' },
              { page: 'rewards', icon: Trophy, label: 'Rewards' },
              { page: 'settings', icon: Settings, label: 'Settings' },
            ].map(({ page, icon: Icon, label }) => {
              const isActive = mobilePage === page;
              return (
                <button
                  key={page}
                  onClick={() => {
                    // Immediate state update for faster response
                    if (page === 'docs') {
                      setMobileDocumentFilter(null);
                      setMobileFilterDropdownOpen(false);
                    }
                    if (page === 'rewards') {
                      setMobileRewardsTab('achievements');
                    }
                    if (page === 'settings') {
                      setSettingsPage('main');
                    }
                    setMobilePage(page as any);
                  }}
                  className="flex flex-col items-center justify-end min-w-0 flex-1 pb-1 transition-opacity duration-200 active:opacity-60"
                  style={{
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <Icon
                    className="w-7 h-7 mb-1 mt-1 transition-colors duration-200"
                    style={{
                      color: isActive ? '#FFFFFF' : '#8E8E93',
                      fill: 'none',
                      stroke: 'currentColor',
                      strokeWidth: isActive ? '1.8' : '1.5',
                    }}
                  />
                  <span
                    className="text-xs leading-tight transition-colors duration-200"
                    style={{
                      color: isActive ? '#FFFFFF' : '#8E8E93',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                      fontWeight: isActive ? '500' : '400',
                      fontSize: '10px',
                    }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onOpenFeedback={() => setShowFeedbackModal(true)}
        />
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center">
          {/* Frosted glass backdrop */}
          <div
            className="absolute inset-0 bg-white/10"
            onClick={() => setShowFeedbackModal(false)}
            style={{
              backdropFilter: 'blur(60px) saturate(180%) brightness(0.3)',
              WebkitBackdropFilter: 'blur(60px) saturate(180%) brightness(0.3)'
            }}
          />

          {/* Modal */}
          <div
            className="relative rounded-3xl w-full max-w-sm mx-4 overflow-hidden shadow-2xl"
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
              background: 'rgba(28, 28, 30, 0.85)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-medium text-white">Send Feedback</h3>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Feedback Type - Improved Pills */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-3">
                  Feedback Type
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { id: 'general', name: 'General' },
                    { id: 'bug', name: 'Bug Report' },
                    { id: 'feature', name: 'Feature Request' }
                  ].map((option) => {
                    const isSelected = feedbackForm.type === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => setFeedbackForm(prev => ({ ...prev, type: option.id as any }))}
                        className={`px-4 py-2 text-sm rounded-full border transition-all duration-200 ${
                          isSelected
                            ? 'bg-gradient-to-r from-blue-500/20 to-purple-600/20 border-purple-500/60 text-purple-300 shadow-lg'
                            : 'border-white/20 text-white/70 hover:border-purple-500/40 hover:text-purple-300 hover:bg-white/5'
                        }`}
                      >
                        {option.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-3">
                  Message *
                </label>
                <textarea
                  value={feedbackForm.message}
                  onChange={(e) => setFeedbackForm(prev => ({
                    ...prev,
                    message: e.target.value
                  }))}
                  placeholder="Tell us about your experience, report a bug, or suggest a feature..."
                  rows={4}
                  className="w-full rounded-2xl border-0 bg-white/10 text-white placeholder-white/50 p-4 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-200"
                  style={{
                    fontSize: '16px',
                  }}
                />
              </div>

              {/* Email (optional) */}
              <div>
                <label className="block text-sm font-medium text-white/80 mb-3">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={feedbackForm.email}
                  onChange={(e) => setFeedbackForm(prev => ({
                    ...prev,
                    email: e.target.value
                  }))}
                  placeholder="your@email.com"
                  className="w-full rounded-full border-0 bg-white/10 text-white placeholder-white/50 p-4 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-200"
                  style={{
                    fontSize: '16px',
                  }}
                />
                <p className="text-xs text-white/50 mt-2">
                  We'll only use this to follow up on your feedback
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-4 border-t border-white/10">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="flex-1 py-2.5 px-4 bg-white/10 hover:bg-white/15 text-white rounded-full transition-all duration-200 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={!feedbackForm.message.trim() || isFeedbackLoading}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 text-white rounded-full transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium"
              >
                {isFeedbackLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : null}
                {isFeedbackLoading ? 'Sending...' : 'Send Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium splash screen for app loading state */}
      <SplashScreen
        isVisible={appLoading}
        onTransitionComplete={() => {
          // Optional: Add any cleanup after splash screen transition
        }}
      />

      {/* New Navigation Components - Mobile only */}
      {isMobile && (
        <>
          {/* Class Switcher Dropdown */}
          <ClassSwitcherDropdown
            isOpen={showClassSwitcher}
            onClose={() => setShowClassSwitcher(false)}
            activeClass={activeClass}
            userClasses={userClasses}
            onSelectClass={handleSelectClass}
            onCreateClass={() => {
              setShowClassSwitcher(false);
              setMobileClassFormData({ name: '', type: null, description: '' });
              setEditingMobileClass(null);
              setMobileEditingClassDocs([]);
              setMobileFormStep('class');
              setShowMobileClassForm(true);
            }}
          />

          {/* Global Search Overlay */}
          <GlobalSearchOverlay
            isOpen={showGlobalSearch}
            onClose={() => setShowGlobalSearch(false)}
            activeClass={activeClass}
            documents={documents}
            chatSessions={sessions}
            onSelectDocument={handleSearchSelectDocument}
            onSelectChat={handleSearchSelectChat}
          />

          {/* Class Onboarding */}
          {showOnboarding && (
            <ClassOnboarding
              onCreateClass={handleOnboardingCreateClass}
            />
          )}
        </>
      )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </ThemeProvider>
  );
};

export default App;