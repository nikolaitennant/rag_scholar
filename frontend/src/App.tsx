import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, MessageSquare, Home, Upload, Settings, X, HelpCircle, Plus, BookOpen, User, Heart, Edit, Edit2, Star, Award, Zap, Trophy, Target, MessageCircle, Sparkles, LogOut, Key, Palette, Clock, Shield, Cpu, ChevronRight, Globe, Moon, Sun, Send, ChevronDown, Trash2, ArrowLeft, FileText } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { Sidebar } from './components/Sidebar';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { LoginPage } from './components/LoginPage';
import { ThemeToggle } from './components/ThemeToggle';
import { SettingsModal } from './components/SettingsModal';
import { AchievementNotification } from './components/AchievementNotification';
import { CommandSuggestions } from './components/CommandSuggestions';
import { useAchievements } from './hooks/useAchievements';
import { apiService } from './services/api';
import { getCommandSuggestions } from './utils/commandParser';
import { Message, DomainType, Document, UserClass } from './types';
import { DOMAIN_TYPE_INFO } from './constants/domains';
import { SwipeableList, SwipeableListItem, SwipeAction, TrailingActions } from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';

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
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Comprehensive app loading state (ChatGPT style)
  const [appLoading, setAppLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [backgroundCommandCount, setBackgroundCommandCount] = useState(1);
  const [mobilePage, setMobilePage] = useState<'chat' | 'home' | 'docs' | 'rewards' | 'settings'>('home');
  const [settingsPage, setSettingsPage] = useState<'main' | 'account' | 'appearance' | 'advanced' | 'help'>('main');
  const [mobileRewardsTab, setMobileRewardsTab] = useState<'achievements' | 'store'>('achievements');
  const [showMobileClassForm, setShowMobileClassForm] = useState(false);
  const [mobileFormStep, setMobileFormStep] = useState<'class' | 'docs'>('class');
  const [editingMobileClass, setEditingMobileClass] = useState<UserClass | null>(null);
  const [mobileEditingClassDocs, setMobileEditingClassDocs] = useState<string[]>([]);
  const [mobileClassFormData, setMobileClassFormData] = useState({ name: '', type: null as DomainType | null, description: '' });
  const [isEditingMobileClass, setIsEditingMobileClass] = useState(false);
  const [mobileInput, setMobileInput] = useState('');
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const [mobileDocumentFilter, setMobileDocumentFilter] = useState<string | null>(null);
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
  const isMobile = window.innerWidth < 768;

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
    temperature: parseFloat(localStorage.getItem('model_temperature') || '0.7'),
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

  // Update iOS status bar style to always be transparent
  useEffect(() => {
    const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (statusBarMeta) statusBarMeta.setAttribute('content', 'black-translucent');
  }, []);

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

  // Keyboard detection for iOS to hide dock when keyboard opens
  useEffect(() => {
    const initialViewportHeight = window.visualViewport?.height || window.innerHeight;

    const handleViewportChange = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;

      // Consider keyboard open if viewport shrunk by more than 150px
      const keyboardOpen = heightDifference > 150;
      setIsKeyboardOpen(keyboardOpen);

      // Add/remove body class to prevent viewport resize
      if (keyboardOpen) {
        document.body.classList.add('keyboard-open');
      } else {
        document.body.classList.remove('keyboard-open');
      }
    };

    // Use visualViewport API for better keyboard detection on iOS
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
      };
    } else {
      // Fallback for browsers without visualViewport
      window.addEventListener('resize', handleViewportChange);
      return () => {
        window.removeEventListener('resize', handleViewportChange);
      };
    }
  }, []);

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
          <div className="h-full chat-container" style={{ display: 'flex', flexDirection: 'column' }}>
            {/* iOS-Style Mobile Chat Header - Sticky */}
            <div
              className="sticky top-0 px-4 z-50 flex-shrink-0"
              style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: '8px',
                background: 'rgba(28, 28, 30, 0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: '0.33px solid var(--ios-divider)',
                position: '-webkit-sticky'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="ios-title text-white">
                    {activeClass ? activeClass.name : 'Chat'}
                  </h1>
                  {activeClass && (
                    <p className="ios-caption text-white opacity-60 mt-1">
                      {DOMAIN_TYPE_INFO[activeClass.domainType]?.label || activeClass.domainType}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleNewChat}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center transition-all duration-150 active:scale-95"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <Plus className="w-4 h-4 text-white/70" />
                </button>
              </div>
            </div>

            {/* Mobile Chat Interface */}
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4" style={{
                paddingBottom: isKeyboardOpen ? '20px' : '160px'
              }}>
                {messages.length === 0 && !mobileInput.trim() ? (
                  /* Mobile welcome state - fades out when typing */
                  <div className={`flex flex-col justify-center h-full text-center transition-opacity duration-300 ${
                    mobileInput.trim() ? 'opacity-0' : 'opacity-100'
                  }`}>
                    <div className={`mb-8 ${theme === 'dark' ? 'text-white/70' : 'text-black/70'}`}>
                      <h2 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                        Welcome to RAG Scholar!
                      </h2>
                      <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                        Ask questions about your documents
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Messages */
                  <div className="space-y-6">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[85%] ${
                            message.role === 'user'
                              ? `px-4 py-2 rounded-2xl overflow-hidden backdrop-blur-2xl ${theme === 'dark' ? 'bg-black/10 text-white' : 'bg-white/10 text-black'}`
                              : `px-0 py-0 bg-transparent ${theme === 'dark' ? 'text-white' : 'text-black'}`
                          }`}
                          style={message.role === 'user' ? {
                            backdropFilter: 'blur(20px) saturate(120%) brightness(0.9)',
                            WebkitBackdropFilter: 'blur(20px) saturate(120%) brightness(0.9)'
                          } : {}}
                        >
                          <div className="prose prose-sm max-w-none text-sm prose-invert">
                            {message.content}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="flex justify-start">
                        <div className="flex space-x-1 p-3">
                          <div className={`w-2 h-2 rounded-full animate-bounce ${theme === 'dark' ? 'bg-white/60' : 'bg-black/60'}`}></div>
                          <div className={`w-2 h-2 rounded-full animate-bounce delay-75 ${theme === 'dark' ? 'bg-white/60' : 'bg-black/60'}`}></div>
                          <div className={`w-2 h-2 rounded-full animate-bounce delay-150 ${theme === 'dark' ? 'bg-white/60' : 'bg-black/60'}`}></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Fixed Bottom Input - iOS Style */}
              <div
                className="fixed left-0 right-0 p-4 z-50"
                style={{
                  bottom: isKeyboardOpen
                    ? 'max(env(safe-area-inset-bottom), 16px)'
                    : 'calc(76px + max(env(safe-area-inset-bottom), 8px))',
                  background: 'transparent',
                  transition: 'bottom 0.3s ease-in-out'
                }}
              >
                <div className="relative">
                  <CommandSuggestions
                    suggestions={getCommandSuggestions(mobileInput)}
                    onSelect={(command) => {
                      setMobileInput(command);
                      setShowCommandSuggestions(false);
                    }}
                    visible={showCommandSuggestions}
                  />
                  <form onSubmit={(e) => {
                  e.preventDefault();
                  if (mobileInput.trim() && !isChatLoading) {
                    handleSendMessage(mobileInput.trim());
                    setMobileInput('');
                    setShowCommandSuggestions(false);
                  }
                }}>
                    <input
                      type="text"
                      value={mobileInput}
                      onChange={(e) => {
                        const value = e.target.value;
                        setMobileInput(value);
                        setShowCommandSuggestions(value.startsWith('/'));
                      }}
                      placeholder="Ask anything..."
                      className="ios-input w-full text-base focus:outline-none transition-all duration-300 ease-in-out"
                      style={{
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                        fontSize: '16px',
                        WebkitTapHighlightColor: 'transparent',
                        border: 'none',
                        boxShadow: 'none'
                      }}
                      disabled={isChatLoading}
                      onFocus={(e) => {
                        // Prevent default scroll behavior for iOS overlay keyboard
                        e.preventDefault();
                      }}
                    />
                  </form>
                </div>
              </div>
            </div>
          </div>
        );

      case 'home':
        return (
          <div className="h-full overflow-y-scroll pb-20" style={{
            paddingTop: `calc(env(safe-area-inset-top) - 10px)`,
            WebkitOverflowScrolling: 'touch'
          }}>
            {/* iOS-Native Header */}
            <div className="px-5 animate-fade-in" style={{
              paddingBottom: '20px'
            }}>
              <h1 className="text-[28px] font-semibold tracking-tight text-white">
                {(() => {
                  const hour = new Date().getHours();
                  const userName = user?.displayName || user?.email?.split('@')[0] || 'User';
                  if (hour < 12) return `Good morning, ${userName}`;
                  if (hour < 17) return `Good afternoon, ${userName}`;
                  return `Good evening, ${userName}`;
                })()}
                <Heart className="w-6 h-6 text-[#AF52DE] animate-pulse inline-block ml-3" style={{ verticalAlign: 'middle', transform: 'translateY(-2px)' }} />
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Ready to explore your documents?
              </p>
            </div>

            <div className="space-y-4 px-5">
              {/* Learning Progress Card */}
              <button
                className="w-full p-5 animate-slide-in-bottom rounded-2xl text-left transition-all duration-200 active:scale-[0.98]"
                style={{
                  animationDelay: '0.1s',
                  animationFillMode: 'both',
                  background: 'rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(20px) saturate(120%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(120%)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
                  WebkitTapHighlightColor: 'transparent'
                }}
                onClick={() => setMobilePage('rewards')}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Learning Progress
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Star className="w-5 h-5 text-yellow-400" />
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

              {/* iOS-Style Classes Section */}
              <div className="space-y-4 animate-slide-in-bottom"
                style={{
                  animationDelay: '0.2s',
                  animationFillMode: 'both'
                }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">
                    Classes
                  </h2>
                  <button
                    onClick={() => setShowMobileClassForm(!showMobileClassForm)}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center transition-all duration-200 active:scale-95 ring-1 ring-purple-500/30"
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <Plus className="w-5 h-5 text-purple-400" />
                  </button>
                </div>

                {/* Create Class Form */}
                {showMobileClassForm && createPortal(
                  <>
                    {/* Soft overlay behind form - covers entire screen */}
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-md animate-fade-in" style={{ zIndex: 999 }} />

                    {/* Form container - centered */}
                    <div className="fixed inset-0 flex items-center justify-center p-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-6" style={{ zIndex: 1000 }}>
                      <div
                        className="w-full max-w-sm rounded-[20px] border border-white/10 animate-slide-in-bottom duration-500 ease-out"
                        style={{
                          background: 'rgba(28, 28, 30, 0.95)',
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
                              <h3 className="text-lg font-medium text-white mb-1">Create New Class</h3>
                              <p className="text-gray-400 text-sm">Choose a name and subject type</p>
                            </div>
                            <input
                              type="text"
                              value={mobileClassFormData.name}
                              onChange={(e) => setMobileClassFormData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Class name (e.g., History 101)"
                              className="w-full px-4 py-3 rounded-full text-sm bg-[#2C2C2E]/70 border border-white/10 text-white placeholder-white/50 focus:border-purple-500/60 focus:ring-4 focus:ring-purple-500/20 focus:outline-none backdrop-blur-sm transition-all duration-200"
                              autoFocus
                            />
                            <div className="grid grid-cols-3 gap-2">
                              {Object.entries(DOMAIN_TYPE_INFO).map(([type, info]) => {
                                const Icon = info.icon;
                                return (
                                  <button
                                    key={type}
                                    onClick={() => setMobileClassFormData(prev => ({ ...prev, type: type as DomainType }))}
                                    className={`aspect-square p-2 rounded-3xl transition-all duration-200 flex flex-col items-center justify-center gap-1 active:scale-95 hover:bg-white/5 ${
                                      mobileClassFormData.type === type
                                        ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 shadow-lg text-white'
                                        : 'bg-[#2C2C2E]/50 border border-white/10 text-white/60 backdrop-blur-sm'
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
                                <div className="space-y-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
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
                                  boxShadow: (mobileClassFormData.name.trim() && mobileClassFormData.type)
                                    ? '0 4px 12px rgba(0, 122, 255, 0.3)'
                                    : 'none'
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
                                  boxShadow: (mobileClassFormData.name.trim() && mobileClassFormData.type && !isEditingMobileClass)
                                    ? '0 4px 12px rgba(0, 122, 255, 0.3)'
                                    : 'none'
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

                {/* Classes List */}
                {userClasses.length === 0 && !showMobileClassForm ? (
                  <div className="text-center py-6 space-y-3 animate-fade-in">
                    <div className="w-10 h-10 mx-auto rounded-full bg-white/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-white/60" />
                    </div>
                    <div>
                      <p className="font-medium text-white mb-1">No classes yet</p>
                      <p className="text-gray-400 text-sm mb-3">Create your first class to get started</p>
                      <button
                        onClick={() => setShowMobileClassForm(true)}
                        className="px-5 py-2.5 rounded-full text-white font-medium transition-all duration-200 active:scale-95 inline-flex items-center gap-2 text-sm"
                        style={{
                          background: 'linear-gradient(135deg, #007AFF 0%, #AF52DE 100%)',
                          boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)'
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Create Class
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userClasses
                      .filter(userClass =>
                        // Hide class being edited until fully loaded
                        !(editingMobileClass && userClass.id === editingMobileClass.id && isEditingMobileClass)
                      )
                      .map((userClass) => {
                        const typeInfo = DOMAIN_TYPE_INFO[userClass.domainType];
                        const Icon = typeInfo?.icon;
                        const isActive = activeClass?.id === userClass.id;
                        const docCount = documents.filter(doc => doc.assigned_classes?.includes(userClass.id)).length;

                      return (
                        <div key={userClass.id} className={`p-5 transition-all duration-200 active:scale-[0.98] rounded-2xl relative ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 shadow-lg'
                            : ''
                        }`}
                        style={{
                          WebkitTapHighlightColor: 'transparent',
                          touchAction: 'manipulation',
                          background: isActive ? undefined : 'rgba(0, 0, 0, 0.4)',
                          backdropFilter: 'blur(20px) saturate(120%)',
                          WebkitBackdropFilter: 'blur(20px) saturate(120%)',
                          boxShadow: isActive ? undefined : '0 8px 32px rgba(0, 0, 0, 0.25)'
                        }}>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleSelectClass(userClass)}
                              className="flex items-center space-x-3 flex-1 min-w-0 text-left"
                            >
                              {Icon && <Icon className={`w-4 h-4 ${
                                isActive
                                  ? 'text-purple-400'
                                  : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                              }`} />}
                              <div className="flex-1 min-w-0">
                                <h4 className={`ios-title text-white truncate text-left ${
                                  isActive ? 'opacity-100' : 'opacity-90'
                                }`}>
                                  {userClass.name}
                                </h4>
                                <div className="flex items-center space-x-2 mt-2">
                                  {isActive && (
                                    <div className="relative">
                                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                                      <div className="absolute top-0 left-0 w-2 h-2 bg-purple-400 rounded-full animate-ping"></div>
                                    </div>
                                  )}
                                  <span className={`ios-caption px-2 py-1 rounded-full ${
                                    isActive
                                      ? 'bg-purple-500/20 text-purple-300'
                                      : 'bg-transparent text-white/70'
                                  }`}>
                                    {typeInfo?.label || userClass.domainType}
                                  </span>
                                  <span className={`ios-caption px-2 py-1 rounded-full ${
                                    isActive
                                      ? 'bg-purple-500/20 text-purple-300'
                                      : 'bg-transparent text-white/70'
                                  }`}>
                                    {docCount} doc{docCount !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                            </button>
                            <div className="flex space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingMobileClass(userClass);
                                  setMobileClassFormData({
                                    name: userClass.name,
                                    type: userClass.domainType,
                                    description: userClass.description || ''
                                  });
                                  setMobileEditingClassDocs(
                                    documents
                                      .filter(doc => doc.assigned_classes?.includes(userClass.id))
                                      .map(doc => doc.id)
                                  );
                                  setShowMobileClassForm(true);
                                }}
                                className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-all duration-200 active:scale-95"
                                style={{
                                  WebkitTapHighlightColor: 'transparent'
                                }}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClass(userClass.id);
                                }}
                                className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center text-white/70 hover:text-red-400 hover:bg-red-500/15 transition-all duration-200 active:scale-95"
                                style={{
                                  WebkitTapHighlightColor: 'transparent'
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent Chats - Show based on active class selection */}
              {(() => {
                // Filter sessions based on active class (same logic as desktop)
                const filteredSessions = activeClass
                  ? sessions.filter(session => session.class_id === activeClass.id)
                  : sessions.filter(session => !session.class_id || session.class_id === null);

                return (
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="ios-title text-white">
                        Recent Chats{activeClass ? ` - ${activeClass.name}` : ''}
                      </h3>
                      <button
                        className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center transition-all duration-200 active:scale-95"
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
                        <Plus className="w-5 h-5 text-blue-400" />
                      </button>
                    </div>
                    <div className="space-y-3 flex-1 overflow-y-auto scrollbar-none">
                      {filteredSessions.length === 0 ? (
                        <div className="text-center py-8">
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
                        <SwipeableList
                          style={{
                            backgroundColor: 'transparent',
                            overflow: 'visible'
                          }}
                        >
                            {filteredSessions.map((session) => {
                              const trailingActions = () => (
                                <TrailingActions>
                                  <SwipeAction
                                    onClick={() => handleDeleteSession(session.id)}
                                    destructive={true}
                                    Tag="div"
                                  >
                                    <div
                                      className="flex items-center justify-center h-full w-16 text-white font-medium text-xs"
                                      style={{
                                        backgroundColor: '#FF3B30',
                                        borderRadius: '0 10px 10px 0',
                                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)'
                                      }}
                                    >
                                      Delete
                                    </div>
                                  </SwipeAction>
                                </TrailingActions>
                              );

                              return (
                                <SwipeableListItem
                                  key={session.id}
                                  trailingActions={trailingActions()}
                                  threshold={0.15}
                                  swipeStartThreshold={5}
                                  maxSwipe={0.5}
                                  className="mb-2"
                                >
                                  <div
                                    className="ios-card-elevated w-full p-4 text-left transition-all duration-200 active:scale-[0.98]"
                                    style={{
                                      willChange: 'transform',
                                      touchAction: 'pan-y',
                                      WebkitTapHighlightColor: 'transparent'
                                    }}
                                    onClick={() => {
                                      handleSelectSession(session.id);
                                      setMobilePage('chat');
                                    }}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1 min-w-0">
                                        <h4 className="ios-title text-white truncate">
                                          {session.name}
                                        </h4>
                                        <p className="ios-subtitle text-white/60 mt-1">
                                          {formatLocalDate(session.updated_at)}
                                        </p>
                                      </div>
                                      <ChevronRight className="w-4 h-4 text-white/40 ml-3 flex-shrink-0" />
                                    </div>
                                  </div>
                                </SwipeableListItem>
                              );
                            })}
                          </SwipeableList>
                      )}
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>
        );

      case 'docs':
        return (
          <div className="h-full overflow-y-auto pb-20" style={{
            paddingTop: 'env(safe-area-inset-top)'
          }}>
            {/* iOS-Style Mobile Header */}
            <div className="px-4 flex items-center justify-between" style={{ paddingTop: '72px', paddingBottom: '24px' }}>
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
              <label className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center cursor-pointer transition-all duration-150 active:scale-95"
                style={{ WebkitTapHighlightColor: 'transparent' }}>
                <Plus className="w-6 h-6 text-blue-400" />
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

            <div className="px-6 space-y-6">
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
                      className={`w-full px-4 py-3 rounded-full text-sm backdrop-blur-sm border focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 flex items-center justify-between ${
                        theme === 'dark'
                          ? 'bg-white/10 border-white/20 text-white'
                          : 'bg-black/10 border-black/20 text-black'
                      }`}
                      style={{
                        backdropFilter: 'blur(20px) saturate(120%) brightness(0.9)',
                        WebkitBackdropFilter: 'blur(20px) saturate(120%) brightness(0.9)'
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
                        <div className={`dropdown-container fixed rounded-2xl shadow-2xl z-[9999] overflow-hidden backdrop-blur-2xl ${
                          theme === 'dark'
                            ? 'bg-black/30 border-white/20'
                            : 'bg-white/10 border-black/20'
                        }`} style={{
                          top: mobileDropdownPosition.top + 2,
                          left: mobileDropdownPosition.left,
                          width: mobileDropdownPosition.width,
                          backdropFilter: 'blur(20px) saturate(120%) brightness(0.9)',
                          WebkitBackdropFilter: 'blur(20px) saturate(120%) brightness(0.9)',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                        }}>
                          <div className="relative z-10">
                            <button
                              onClick={() => {
                                setMobileDocumentFilter(null);
                                setMobileFilterDropdownOpen(false);
                              }}
                              className={`w-full px-4 py-3 text-base text-left transition-colors ${
                                !mobileDocumentFilter
                                  ? theme === 'dark' ? 'bg-white/20 text-white font-medium' : 'bg-black/20 text-black font-medium'
                                  : theme === 'dark' ? 'text-white/90 hover:bg-black/20' : 'text-gray-900/90 hover:bg-white/20'
                              }`}
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
                                className={`w-full px-4 py-3 text-base text-left transition-colors ${
                                  mobileDocumentFilter === cls.id
                                    ? theme === 'dark' ? 'bg-white/20 text-white font-medium' : 'bg-black/20 text-black font-medium'
                                    : theme === 'dark' ? 'text-white/90 hover:bg-black/20' : 'text-gray-900/90 hover:bg-white/20'
                                }`}
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
                <div className="text-center py-12">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                    theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                  }`}>
                    <Upload className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                  </div>
                  <p className={`font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    {mobileDocumentFilter ? 'No documents in this class' : 'No documents yet'}
                  </p>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {mobileDocumentFilter
                      ? 'Try selecting a different class or upload documents to this class'
                      : 'Upload your first document to get started'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents
                    .filter(doc => !mobileDocumentFilter || doc.assigned_classes?.includes(mobileDocumentFilter))
                    .map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-4 rounded-xl  transition-all ${
                        theme === 'dark'
                          ? 'bg-white/5 hover:bg-gray-750'
                          : 'bg-black/5 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 mr-3">
                          <p className={`font-medium text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                            {doc.filename}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            {doc.assigned_classes && doc.assigned_classes.length > 0 && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/10 text-black'
                              }`}>
                                {doc.assigned_classes.length} class{doc.assigned_classes.length !== 1 ? 'es' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            theme === 'dark' ? 'hover:bg-red-500/20 text-gray-400 hover:text-red-400' : 'hover:bg-red-50 text-gray-500 hover:text-red-600'
                          }`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );


      case 'rewards':
        return (
          <div className="h-full overflow-y-auto pb-20">
            {/* iOS-Style Mobile Header */}
            <div className="px-4" style={{ paddingTop: '72px', paddingBottom: '24px' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="ios-large-title text-white">
                    Rewards
                  </h2>
                  <p className="ios-subtitle text-white mt-2">
                    {mobileRewardsTab === 'achievements' ? 'Track your learning progress' : 'Redeem your points for rewards'}
                  </p>
                </div>
                <div className={`rounded-full px-3 py-1.5 flex items-center gap-2 whitespace-nowrap ${
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
                    {userProfile?.stats?.total_points || 0} pts
                  </span>
                </div>
              </div>
            </div>

            {/* iOS-Style Segmented Control */}
            <div className="px-6 mb-8">
              <div className={`flex p-1 rounded-2xl ${
                theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
              }`}>
                {[
                  { key: 'achievements', label: 'Achievements' },
                  { key: 'store', label: 'Store' }
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setMobileRewardsTab(key as any)}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-xl transition-all duration-150 ${
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

            <div className="px-4 space-y-4">
              {mobileRewardsTab === 'achievements' ? (
                <>
              {/* In Progress Section */}
              {achievements.filter(a => a.unlocked_at === null).length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <Target className="w-4 h-4 text-blue-400" />
                    <h4 className={`text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      IN PROGRESS
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {achievements.filter(a => a.unlocked_at === null).map((achievement) => {
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
                          className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}
                        >
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
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <Trophy className={`w-4 h-4 ${
                      theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
                    }`} />
                    <h4 className={`text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      UNLOCKED
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {achievements.filter(a => a.unlocked_at !== null).map((achievement) => {
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
                          className={`relative p-3 rounded-lg ${theme === 'dark' ? 'bg-white/10 shadow-lg' : 'bg-black/10 shadow-lg'}`}
                        >
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
                </>
              ) : (
                /* Store Tab Content */
                <div className="space-y-3">
                  {/* Store Items */}
                  <div className={`border rounded-lg p-3 ${
                    theme === 'dark' ? 'border-white/20 bg-white/5' : 'border-black/20 bg-black/5'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap className={`w-4 h-4 ${
                          theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
                        }`} />
                        <span className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                          Rounded Chat Input
                        </span>
                      </div>
                      <div className="bg-gradient-to-r from-blue-400/20 to-indigo-400/20 border border-blue-400/40 rounded-full px-2 py-1 flex items-center gap-1">
                        <span className="text-xs text-blue-400 font-bold">
                          150 pts
                        </span>
                      </div>
                    </div>
                    <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                      Pill-shaped chat input with smooth corners
                    </p>
                    <button
                      disabled={(userProfile?.stats?.total_points || 0) < 150}
                      className={`w-full py-2 px-3 rounded-full text-xs font-bold transition-colors ${
                        (userProfile?.stats?.total_points || 0) >= 150
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg'
                          : 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/40 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {(userProfile?.stats?.total_points || 0) >= 50 ? 'Redeem' : `Need ${50 - (userProfile?.stats?.total_points || 0)} more points`}
                    </button>
                  </div>

                  <div className={`border rounded-lg p-3 ${
                    theme === 'dark' ? 'border-white/20 bg-white/5' : 'border-black/20 bg-black/5'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Star className={`w-4 h-4 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
                        <span className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                          Space Theme
                        </span>
                      </div>
                      <div className="bg-gradient-to-r from-purple-400/20 to-violet-400/20 border border-purple-400/40 rounded-full px-2 py-1 flex items-center gap-1">
                        <span className="text-xs text-purple-400 font-bold">
                          250 pts
                        </span>
                      </div>
                    </div>
                    <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                      Deep space colors with starry gradients
                    </p>
                    <button
                      disabled={(userProfile?.stats?.total_points || 0) < 250}
                      className={`w-full py-2 px-3 rounded-full text-xs font-bold transition-colors ${
                        (userProfile?.stats?.total_points || 0) >= 250
                          ? 'bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white shadow-lg'
                          : 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/40 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {(userProfile?.stats?.total_points || 0) >= 100 ? 'Redeem' : `Need ${100 - (userProfile?.stats?.total_points || 0)} more points`}
                    </button>
                  </div>

                  <div className={`border rounded-lg p-3 ${
                    theme === 'dark' ? 'border-white/20 bg-white/5' : 'border-black/20 bg-black/5'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Heart className={`w-4 h-4 ${theme === 'dark' ? 'text-pink-400' : 'text-pink-600'}`} />
                        <span className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                          Cherry Blossom Theme
                        </span>
                      </div>
                      <div className="bg-gradient-to-r from-pink-400/20 to-rose-400/20 border border-pink-400/40 rounded-full px-2 py-1 flex items-center gap-1">
                        <span className="text-xs text-pink-400 font-bold">
                          300 pts
                        </span>
                      </div>
                    </div>
                    <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                      Soft pink and white spring vibes
                    </p>
                    <button
                      disabled={(userProfile?.stats?.total_points || 0) < 300}
                      className={`w-full py-2 px-3 rounded-full text-xs font-bold transition-colors ${
                        (userProfile?.stats?.total_points || 0) >= 300
                          ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg'
                          : 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/40 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {(userProfile?.stats?.total_points || 0) >= 150 ? 'Redeem' : `Need ${150 - (userProfile?.stats?.total_points || 0)} more points`}
                    </button>
                  </div>

                  <div className={`border rounded-lg p-3 ${
                    theme === 'dark' ? 'border-white/20 bg-white/5' : 'border-black/20 bg-black/5'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Award className={`w-4 h-4 ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`} />
                        <span className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                          Cyberpunk Theme
                        </span>
                      </div>
                      <div className={`rounded-full px-2 py-1 flex items-center gap-1 whitespace-nowrap ${
                        theme === 'dark'
                          ? 'bg-gradient-to-r from-cyan-400/20 to-teal-400/20 border border-cyan-400/40'
                          : 'bg-slate-200/80 border border-slate-500/80'
                      }`}>
                        <span className={`text-xs font-bold ${
                          theme === 'dark' ? 'text-cyan-400' : 'text-slate-800'
                        }`}>
                          400 pts
                        </span>
                      </div>
                    </div>
                    <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                      Neon cyber colors with electric vibes
                    </p>
                    <button
                      disabled={(userProfile?.stats?.total_points || 0) < 400}
                      className={`w-full py-2 px-3 rounded-full text-xs font-bold transition-colors ${
                        (userProfile?.stats?.total_points || 0) >= 400
                          ? 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white shadow-lg'
                          : 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/40 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {(userProfile?.stats?.total_points || 0) >= 200 ? 'Redeem' : `Need ${200 - (userProfile?.stats?.total_points || 0)} more points`}
                    </button>
                  </div>

                  <div className={`border rounded-lg p-3 ${
                    theme === 'dark' ? 'border-white/20 bg-white/5' : 'border-black/20 bg-black/5'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                        <span className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                          Particle Effects
                        </span>
                      </div>
                      <div className={`rounded-full px-2 py-1 flex items-center gap-1 whitespace-nowrap ${
                        theme === 'dark'
                          ? 'bg-gradient-to-r from-green-400/20 to-emerald-400/20 border border-green-400/40'
                          : 'bg-emerald-200/80 border border-emerald-600/80'
                      }`}>
                        <span className={`text-xs font-bold ${
                          theme === 'dark' ? 'text-green-400' : 'text-emerald-800'
                        }`}>
                          500 pts
                        </span>
                      </div>
                    </div>
                    <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                      Floating sparkles and particle animations
                    </p>
                    <button
                      disabled={(userProfile?.stats?.total_points || 0) < 500}
                      className={`w-full py-2 px-3 rounded-full text-xs font-bold transition-colors ${
                        (userProfile?.stats?.total_points || 0) >= 500
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg'
                          : 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/40 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {(userProfile?.stats?.total_points || 0) >= 300 ? 'Redeem' : `Need ${300 - (userProfile?.stats?.total_points || 0)} more points`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="h-full overflow-y-auto pb-20" style={{
            paddingTop: 'env(safe-area-inset-top)'
          }}>
            {/* iOS-Style Mobile Header */}
            <div className="px-4" style={{ paddingTop: '72px', paddingBottom: '24px' }}>
              <h2 className="ios-large-title text-white">
                Settings
              </h2>
              <p className="ios-subtitle text-white mt-2">
                Customize your experience
              </p>
            </div>

            {settingsPage === 'main' && (
              /* iOS-Style Grouped Settings List */
              <div className="px-4">
                <div className="ios-grouped-list">
                  {[
                    { key: 'account', label: 'Account', icon: User, subtitle: 'Manage your profile and preferences', color: 'blue' },
                    { key: 'appearance', label: 'Appearance', icon: Palette, subtitle: 'Theme, background, and display options', color: 'purple' },
                    { key: 'advanced', label: 'Advanced', icon: Settings, subtitle: 'API settings and advanced configuration', color: 'gray' },
                    { key: 'help', label: 'Help & Support', icon: HelpCircle, subtitle: 'Get help and send feedback', color: 'green' }
                  ].map(({ key, label, icon: Icon, subtitle, color }, index, array) => (
                    <div key={key}>
                      <button
                        onClick={() => setSettingsPage(key as any)}
                        className="w-full px-4 py-3.5 text-left transition-all duration-300 ease-in-out hover:bg-white/5 active:bg-white/10"
                        style={{
                          WebkitTapHighlightColor: 'transparent',
                          animation: 'iosTapPress 0.15s ease-in-out'
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              color === 'blue' ? 'bg-[#007AFF]' :
                              color === 'purple' ? 'bg-[#AF52DE]' :
                              color === 'gray' ? 'bg-[#8E8E93]' :
                              'bg-[#34C759]'
                            }`}>
                              <Icon className="w-4.5 h-4.5 text-white" />
                            </div>
                            <div className="text-left">
                              <h3 className="ios-title text-white">
                                {label}
                              </h3>
                              <p className="ios-caption text-white opacity-60 mt-0.5">
                                {subtitle}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-[#8E8E93]" />
                        </div>
                      </button>
                      {index < array.length - 1 && (
                        <div className="h-px ml-11 bg-[rgba(255,255,255,0.1)]" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {settingsPage !== 'main' && (
              <div className="px-6">
                {/* Back Button */}
                <button
                  onClick={() => setSettingsPage('main')}
                  className={`flex items-center space-x-2 mb-6 p-2 rounded-lg transition-colors ${
                    theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/10'
                  }`}
                >
                  <ArrowLeft className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-black'}`} />
                  <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    Settings
                  </span>
                </button>

                {/* Page Content */}
                {settingsPage === 'account' && (
                  <div className="space-y-6">
                    {/* iOS-Style Account Settings */}

                    {/* Profile Section */}
                    <div className="space-y-2">
                      <h4 className={`px-4 text-xs font-medium uppercase tracking-wider ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        Profile
                      </h4>

                      <div className="px-4">
                        <div className={`rounded-2xl overflow-hidden shadow-sm ${
                          theme === 'dark'
                            ? 'bg-gray-900/60 border border-gray-800'
                            : 'bg-white border border-gray-200'
                        }`} style={{
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)'
                        }}>
                          {/* Display Name Row */}
                          <div className="px-4 py-3.5">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className={`text-base font-medium ${
                                  theme === 'dark' ? 'text-white' : 'text-black'
                                }`}>
                                  Name
                                </p>
                              </div>
                              <div className="flex-1 text-right">
                                <input
                                  type="text"
                                  value={formData.name}
                                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                  className={`text-base text-right bg-transparent border-none outline-none w-full ${
                                    theme === 'dark'
                                      ? 'text-gray-300 placeholder-gray-500'
                                      : 'text-gray-600 placeholder-gray-400'
                                  }`}
                                  placeholder="Enter name"
                                />
                              </div>
                            </div>
                          </div>

                          <div className={`h-px ml-4 ${
                            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'
                          }`} />

                          {/* Email Row */}
                          <div className="px-4 py-3.5">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className={`text-base font-medium ${
                                  theme === 'dark' ? 'text-white' : 'text-black'
                                }`}>
                                  Email
                                </p>
                              </div>
                              <div className="flex-1 text-right">
                                <p className={`text-base ${
                                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  {user?.email}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Security Section */}
                    <div className="space-y-1">
                      <h4 className={`px-4 pb-2 text-xs font-medium uppercase tracking-wider ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Security
                      </h4>

                      <div className={`mx-4 rounded-2xl overflow-hidden ${
                        theme === 'dark' ? 'bg-gray-800/50' : 'bg-white'
                      }`}>
                        {!isResetPasswordMode ? (
                          <button
                            onClick={() => setIsResetPasswordMode(true)}
                            className={`w-full px-4 py-3 text-left transition-colors ${
                              theme === 'dark' ? 'hover:bg-gray-700/50 active:bg-gray-700/70' : 'hover:bg-gray-50 active:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-500/10'
                                }`}>
                                  <Key className="w-4 h-4 text-blue-500" />
                                </div>
                                <p className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                                  Change Password
                                </p>
                              </div>
                              <ChevronRight className={`w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                            </div>
                          </button>
                        ) : (
                          <div className="px-4 py-4 space-y-4">
                            <div className="text-center">
                              <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${
                                theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-500/10'
                              }`}>
                                <Key className="w-8 h-8 text-blue-500" />
                              </div>
                              <h4 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                                Reset Password
                              </h4>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                We'll send a password reset link to your email address
                              </p>
                            </div>

                            {saveMessage && (
                              <div className={`p-4 rounded-xl text-center text-sm ${
                                saveMessage.includes('sent')
                                  ? theme === 'dark'
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-green-50 text-green-600 border border-green-200'
                                  : theme === 'dark'
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : 'bg-red-50 text-red-600 border border-red-200'
                              }`}>
                                {saveMessage}
                              </div>
                            )}

                            <div className="space-y-3">
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
                                className={`w-full py-3 rounded-xl font-semibold text-base transition-colors ${
                                  theme === 'dark'
                                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {isLoading ? 'Sending...' : 'Send Reset Email'}
                              </button>

                              <button
                                onClick={() => {
                                  setIsResetPasswordMode(false);
                                  setSaveMessage(null);
                                }}
                                className={`w-full py-3 rounded-xl font-medium text-base transition-colors ${
                                  theme === 'dark'
                                    ? 'bg-gray-700/50 hover:bg-gray-700/70 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200 text-black'
                                }`}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Account Actions Section */}
                    <div className="space-y-2">
                      <h4 className={`px-4 text-xs font-medium uppercase tracking-wider ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        Actions
                      </h4>

                      <div className="px-4">
                        <div className={`rounded-2xl overflow-hidden shadow-sm ${
                          theme === 'dark'
                            ? 'bg-gray-900/60 border border-gray-800'
                            : 'bg-white border border-gray-200'
                        }`} style={{
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)'
                        }}>
                          <button
                            onClick={handleLogout}
                            className={`w-full px-4 py-3.5 text-left transition-all duration-150 active:scale-[0.98] ${
                              theme === 'dark'
                                ? 'hover:bg-red-500/10 active:bg-red-500/20'
                                : 'hover:bg-red-50 active:bg-red-100'
                            }`}
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
                                <LogOut className="w-4.5 h-4.5 text-white" />
                              </div>
                              <p className="text-base font-medium text-red-500">
                                Sign Out
                              </p>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {settingsPage === 'appearance' && (
                  <div className="space-y-6">
                    {/* iOS-Style Appearance Settings */}

                    {/* Theme Section */}
                    <div className="space-y-2">
                      <h4 className={`px-4 text-xs font-medium uppercase tracking-wider ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        Display
                      </h4>

                      <div className="px-4">
                        <div className={`rounded-2xl overflow-hidden shadow-sm ${
                          theme === 'dark'
                            ? 'bg-gray-900/60 border border-gray-800'
                            : 'bg-white border border-gray-200'
                        }`} style={{
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)'
                        }}>
                          <button
                            onClick={toggleTheme}
                            className={`w-full px-4 py-3.5 text-left transition-all duration-150 active:scale-[0.98] ${
                              theme === 'dark'
                                ? 'hover:bg-gray-800/60 active:bg-gray-800/80'
                                : 'hover:bg-gray-50 active:bg-gray-100'
                            }`}
                            style={{ WebkitTapHighlightColor: 'transparent' }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  theme === 'dark' ? 'bg-blue-500' : 'bg-orange-500'
                                }`}>
                                  {theme === 'dark' ? (
                                    <Moon className="w-4.5 h-4.5 text-white" />
                                  ) : (
                                    <Sun className="w-4.5 h-4.5 text-white" />
                                  )}
                                </div>
                                <div>
                                  <p className={`text-base font-medium ${
                                    theme === 'dark' ? 'text-white' : 'text-black'
                                  }`}>
                                    Appearance
                                  </p>
                                  <p className={`text-sm ${
                                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                    {themeMode === 'auto' ? `Auto (${theme})` : theme === 'dark' ? 'Dark' : 'Light'}
                                  </p>
                                </div>
                              </div>
                              <div className={`w-12 h-7 rounded-full relative transition-colors ${
                                theme === 'dark' ? 'bg-blue-500' : 'bg-gray-300'
                              }`}>
                                <div className={`w-5 h-5 mt-1 rounded-full bg-white transition-transform shadow-sm ${
                                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Background Section */}
                    <div className="space-y-2">
                      <h4 className={`px-4 text-xs font-medium uppercase tracking-wider ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        Background Style
                      </h4>

                      <div className="px-4">
                        <div className={`rounded-2xl overflow-hidden shadow-sm ${
                          theme === 'dark'
                            ? 'bg-gray-900/60 border border-gray-800'
                            : 'bg-white border border-gray-200'
                        }`} style={{
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)'
                        }}>
                        {(['classic', 'gradient', 'mountain', 'ocean', 'sunset', 'forest'] as const).map((bg, index) => (
                          <div key={bg}>
                            <button
                              onClick={() => setBackground(bg)}
                              className={`w-full px-4 py-3.5 text-left transition-all duration-150 active:scale-[0.98] ${
                                theme === 'dark'
                                  ? 'hover:bg-gray-800/60 active:bg-gray-800/80'
                                  : 'hover:bg-gray-50 active:bg-gray-100'
                              }`}
                              style={{ WebkitTapHighlightColor: 'transparent' }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    bg === 'classic' ? 'bg-gray-500' :
                                    bg === 'gradient' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                                    bg === 'mountain' ? 'bg-green-500' :
                                    bg === 'ocean' ? 'bg-blue-500' :
                                    bg === 'sunset' ? 'bg-orange-500' :
                                    'bg-emerald-500'
                                  }`}>
                                    <div className="w-4 h-4 rounded bg-white opacity-90" />
                                  </div>
                                  <div>
                                    <p className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                                      {bg.charAt(0).toUpperCase() + bg.slice(1)}
                                    </p>
                                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                      {bg === 'classic' ? 'Simple solid background' :
                                       bg === 'gradient' ? 'Colorful gradient effect' :
                                       bg === 'mountain' ? 'Nature-inspired green tones' :
                                       bg === 'ocean' ? 'Calming blue waves' :
                                       bg === 'sunset' ? 'Warm orange sunset colors' :
                                       'Peaceful forest atmosphere'}
                                    </p>
                                  </div>
                                </div>
                                {background === bg && (
                                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                  </div>
                                )}
                              </div>
                            </button>
                            {index < 5 && (
                              <div className={`h-px ml-11 ${
                                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'
                              }`} />
                            )}
                          </div>
                        ))}
                        </div>
                      </div>
                    </div>

                    {/* Preview Section */}
                    <div className="space-y-2">
                      <h4 className={`px-4 text-xs font-medium uppercase tracking-wider ${
                        theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        Preview
                      </h4>

                      <div className="px-4">
                        <div className={`rounded-2xl overflow-hidden shadow-sm p-4 ${
                          theme === 'dark'
                            ? 'bg-gray-900/60 border border-gray-800'
                            : 'bg-white border border-gray-200'
                        }`} style={{
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)'
                        }}>
                        <div className={`rounded-xl p-4 ${
                          background === 'classic' ? (theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50') :
                          background === 'gradient' ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10' :
                          background === 'mountain' ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10' :
                          background === 'ocean' ? 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10' :
                          background === 'sunset' ? 'bg-gradient-to-br from-orange-500/10 to-red-500/10' :
                          'bg-gradient-to-br from-emerald-500/10 to-teal-500/10'
                        }`}>
                          <div className="text-center py-3">
                            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                              Preview of {background} background
                            </p>
                            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              This is how your app will look
                            </p>
                          </div>
                        </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {settingsPage === 'advanced' && (
                  <div className="space-y-6">
                    {/* iOS-Style Advanced Settings */}

                    {/* API Configuration Section */}
                    <div className="space-y-1">
                      <h4 className={`px-4 pb-2 text-xs font-medium uppercase tracking-wider ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        API Configuration
                      </h4>

                      <div className={`mx-4 rounded-2xl overflow-hidden ${
                        theme === 'dark' ? 'bg-gray-800/50' : 'bg-white'
                      }`}>
                        {/* API Key Row */}
                        <div className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                                OpenAI API Key
                              </p>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {apiSettings.apiKey ? '••••••••••••••••' : 'Not configured'}
                              </p>
                            </div>
                            <div className="flex-1 text-right">
                              <input
                                type="password"
                                value={apiSettings.apiKey}
                                onChange={(e) => setApiSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                                placeholder="sk-..."
                                className={`text-base text-right bg-transparent border-none outline-none w-full ${
                                  theme === 'dark' ? 'text-gray-300 placeholder-gray-500' : 'text-gray-600 placeholder-gray-400'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Model Parameters Section */}
                    <div className="space-y-1">
                      <h4 className={`px-4 pb-2 text-xs font-medium uppercase tracking-wider ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Model Settings
                      </h4>

                      <div className={`mx-4 rounded-2xl overflow-hidden ${
                        theme === 'dark' ? 'bg-gray-800/50' : 'bg-white'
                      }`}>
                        {/* Model Selection */}
                        <div className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                                Model
                              </p>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                AI model to use for responses
                              </p>
                            </div>
                            <div className="flex-1 text-right">
                              <select
                                value={apiSettings.model}
                                onChange={(e) => setApiSettings(prev => ({ ...prev, model: e.target.value }))}
                                className={`text-base text-right bg-transparent border-none outline-none ${
                                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                                }`}
                              >
                                <option value="gpt-4">GPT-4</option>
                                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className={`h-px ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} mx-4`} />

                        {/* Max Tokens */}
                        <div className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                                Max Tokens
                              </p>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Maximum response length
                              </p>
                            </div>
                            <div className="flex-1 text-right">
                              <input
                                type="number"
                                value={apiSettings.maxTokens}
                                onChange={(e) => setApiSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                                className={`text-base text-right bg-transparent border-none outline-none w-20 ${
                                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Temperature Section */}
                    <div className="space-y-1">
                      <h4 className={`px-4 pb-2 text-xs font-medium uppercase tracking-wider ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Response Style
                      </h4>

                      <div className={`mx-4 rounded-2xl overflow-hidden p-4 ${
                        theme === 'dark' ? 'bg-gray-800/50' : 'bg-white'
                      }`}>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                                Creativity
                              </p>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {apiSettings.temperature < 0.3 ? 'Focused & Precise' :
                                 apiSettings.temperature < 0.7 ? 'Balanced' :
                                 apiSettings.temperature < 1.2 ? 'Creative' : 'Very Creative'}
                              </p>
                            </div>
                            <p className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                              {apiSettings.temperature}
                            </p>
                          </div>

                          <div className="relative">
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.1"
                              value={apiSettings.temperature}
                              onChange={(e) => setApiSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                              className={`w-full h-2 rounded-full appearance-none cursor-pointer ${
                                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
                              }`}
                              style={{
                                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(apiSettings.temperature / 2) * 100}%, ${
                                  theme === 'dark' ? '#374151' : '#E5E7EB'
                                } ${(apiSettings.temperature / 2) * 100}%, ${
                                  theme === 'dark' ? '#374151' : '#E5E7EB'
                                } 100%)`
                              }}
                            />
                            <div className="flex justify-between text-xs mt-1">
                              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Precise</span>
                              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Creative</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reset Section */}
                    <div className="space-y-1">
                      <h4 className={`px-4 pb-2 text-xs font-medium uppercase tracking-wider ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Configuration
                      </h4>

                      <div className={`mx-4 rounded-2xl overflow-hidden ${
                        theme === 'dark' ? 'bg-gray-800/50' : 'bg-white'
                      }`}>
                        <button
                          onClick={() => setShowAdvancedParams(false)}
                          className={`w-full px-4 py-3 text-left transition-colors ${
                            theme === 'dark' ? 'hover:bg-gray-700/50 active:bg-gray-700/70' : 'hover:bg-gray-50 active:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              theme === 'dark' ? 'bg-orange-500/20' : 'bg-orange-500/10'
                            }`}>
                              <Settings className="w-4 h-4 text-orange-500" />
                            </div>
                            <div>
                              <p className={`text-base font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                                Reset to Defaults
                              </p>
                              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Restore recommended settings
                              </p>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {settingsPage === 'help' && (
                  <div className="space-y-6">
                    <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      Help & Support
                    </h3>

                    {/* Help Section */}
                    <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                      <div className="space-y-4">
                        <div>
                          <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                            Getting Started
                          </h4>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Upload documents, ask questions, and get AI-powered responses with citations.
                          </p>
                        </div>

                        <div>
                          <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                            Document Types
                          </h4>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Supported formats: PDF, DOCX, TXT, and more. Documents are processed and indexed for quick retrieval.
                          </p>
                        </div>

                        <div>
                          <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                            Citations
                          </h4>
                          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            All responses include source citations. Click on citation numbers to see the original text.
                          </p>
                        </div>

                        <div>
                          <h4 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                            Need Help?
                          </h4>
                          <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            Contact support for assistance with your account or technical issues.
                          </p>
                          <button
                            className={`w-full flex items-center justify-center space-x-2 p-3 rounded-lg transition-all ${
                              theme === 'dark'
                                ? 'bg-white/10 text-white hover:bg-white/20'
                                : 'bg-black/10 text-black hover:bg-black/20'
                            }`}
                          >
                            <HelpCircle className="w-4 h-4" />
                            <span className="font-medium">Contact Support</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} onSignUp={signUp} onResetPassword={resetPassword} />;
  }

  // Show main UI immediately, with loading states in sidebar and chat

  return (
    <div className={`min-h-screen ${getBackgroundClass()}`}>
      <div className="h-screen flex" style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}>
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
      <div className="md:hidden w-full">
        {renderMobilePage()}

        {/* iOS-Native Bottom Navigation with Translucent Blur */}
        <div
          className="fixed bottom-0 left-0 right-0 transition-all duration-300 ease-in-out"
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(30px) saturate(120%)',
            WebkitBackdropFilter: 'blur(30px) saturate(120%)',
            paddingBottom: `max(env(safe-area-inset-bottom), 12px)`,
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
            borderTop: '0.5px solid rgba(128, 128, 128, 0.3)',
            transform: isKeyboardOpen ? 'translateY(100%)' : 'translateY(0)',
            opacity: mobilePage === 'chat' ? 0.8 : 1,
            pointerEvents: isKeyboardOpen ? 'none' : 'auto'
          }}
        >
          <div className="flex justify-around px-1 pt-2">
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
                    setMobilePage(page as any);
                    if (page === 'settings') {
                      setSettingsPage('main');
                    }
                  }}
                  className={`flex flex-col items-center py-3 px-4 transition-all duration-200 ease-out ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-500'
                  }`}
                  style={{
                    minWidth: '60px',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  <Icon
                    className={`w-6 h-6 transition-all duration-200 ease-out ${
                      isActive ? 'brightness-110' : 'brightness-75'
                    }`}
                    style={{
                      fill: 'none',
                      stroke: 'currentColor',
                      strokeWidth: isActive ? '2.2' : '1.8'
                    }}
                  />
                  {/* Show label for all tabs */}
                  {(
                    <span
                      className={`text-[9px] mt-1 font-medium transition-all duration-200 leading-tight ${
                        isActive ? 'opacity-100' : 'opacity-70'
                      }`}
                      style={{
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                        letterSpacing: '-0.01em'
                      }}
                    >
                      {label}
                    </span>
                  )}
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
        />
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-lg"
            onClick={() => setShowFeedbackModal(false)}
          />

          {/* Modal */}
          <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
            theme === 'dark'
              ? 'bg-white/5 border border-white/20'
              : 'bg-black/5 border border-black/20'
          }`}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>
                  Send Feedback
                </h3>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className={`p-1 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'hover:bg-gray-700 text-gray-400'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Feedback Type */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Type
                  </label>
                  <div className="relative">
                    <button
                      ref={feedbackDropdownButtonRef}
                      onClick={() => {
                        if (!feedbackDropdownOpen && feedbackDropdownButtonRef.current) {
                          const rect = feedbackDropdownButtonRef.current.getBoundingClientRect();
                          setFeedbackDropdownPosition({
                            top: rect.bottom + window.scrollY,
                            left: rect.left + window.scrollX,
                            width: rect.width
                          });
                        }
                        setFeedbackDropdownOpen(!feedbackDropdownOpen);
                      }}
                      className={`w-full px-4 py-2.5 text-sm text-left flex items-center justify-between transition-all duration-200 rounded-2xl border focus:outline-none ${
                        theme === 'dark'
                          ? 'bg-white/5 border-white/20 text-white/90 placeholder-gray-400 focus:border-violet-400 hover:bg-white/10'
                          : 'bg-black/5 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-violet-500 hover:bg-black/10'
                      }`}
                    >
                      <span className="truncate">
                        {feedbackForm.type === 'general' ? 'General Feedback' :
                         feedbackForm.type === 'bug' ? 'Bug Report' : 'Feature Request'}
                      </span>
                      <ChevronRight className={`w-4 h-4 transition-transform ${
                        feedbackDropdownOpen ? 'rotate-90' : 'rotate-0'
                      } ${
                        theme === 'dark' ? 'text-white/50' : 'text-gray-400'
                      }`} />
                    </button>

                    {feedbackDropdownOpen && feedbackDropdownPosition && createPortal(
                      <>
                        <div
                          className="fixed inset-0 z-[9998]"
                          onClick={() => setFeedbackDropdownOpen(false)}
                        />
                        <div className={`dropdown-container fixed rounded-2xl shadow-2xl z-[9999] overflow-hidden backdrop-blur-2xl ${
                        theme === 'dark'
                          ? 'bg-black/30 border-white/20'
                          : 'bg-white/10 border-black/20'
                      }`} style={{
                        top: feedbackDropdownPosition.top + 2,
                        left: feedbackDropdownPosition.left,
                        width: feedbackDropdownPosition.width,
                        backdropFilter: 'blur(20px) saturate(120%) brightness(0.9)',
                        WebkitBackdropFilter: 'blur(20px) saturate(120%) brightness(0.9)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                      }}>
                        <div className="relative z-10">
                          <button
                            onClick={() => {
                              setFeedbackForm(prev => ({ ...prev, type: 'general' }));
                              setFeedbackDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-3 text-sm text-left transition-colors ${
                              theme === 'dark'
                                ? 'text-white/90 hover:bg-black/20'
                                : 'text-gray-900/90 hover:bg-white/20'
                            }`}
                          >
                            General Feedback
                          </button>
                          <button
                            onClick={() => {
                              setFeedbackForm(prev => ({ ...prev, type: 'bug' }));
                              setFeedbackDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-3 text-sm text-left transition-colors ${
                              theme === 'dark'
                                ? 'text-white/90 hover:bg-black/20'
                                : 'text-gray-900/90 hover:bg-white/20'
                            }`}
                          >
                            Bug Report
                          </button>
                          <button
                            onClick={() => {
                              setFeedbackForm(prev => ({ ...prev, type: 'feature' }));
                              setFeedbackDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-3 text-sm text-left transition-colors ${
                              theme === 'dark'
                                ? 'text-white/90 hover:bg-black/20'
                                : 'text-gray-900/90 hover:bg-white/20'
                            }`}
                          >
                            Feature Request
                          </button>
                        </div>
                      </div>
                      </>,
                      document.body
                    )}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
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
                    className={`w-full px-4 py-2.5 rounded-2xl border transition-all duration-200 resize-none ${
                      theme === 'dark'
                        ? 'bg-black/30 border-white/20 text-white/90 placeholder-gray-400 focus:border-violet-400 hover:bg-black/40'
                        : 'bg-black/10 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-violet-500 hover:bg-white/25'
                    } focus:outline-none`}
                  />
                </div>

                {/* Email (optional) */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
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
                    className={`w-full px-4 py-2.5 rounded-2xl border transition-all duration-200 ${
                      theme === 'dark'
                        ? 'bg-black/30 border-white/20 text-white/90 placeholder-gray-400 focus:border-violet-400 hover:bg-black/40'
                        : 'bg-black/10 border-gray-300/50 text-gray-900 placeholder-gray-500 focus:border-violet-500 hover:bg-white/25'
                    } focus:outline-none`}
                  />
                  <p className={`text-xs mt-1 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    We'll only use this to follow up on your feedback
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-black'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFeedback}
                  disabled={!feedbackForm.message.trim() || isFeedbackLoading}
                  className={`flex-1 px-4 py-2 rounded-2xl transition-all duration-200 font-medium ${
                    !feedbackForm.message.trim() || isFeedbackLoading
                      ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                      : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
                  }`}
                >
                  {isFeedbackLoading ? 'Sending...' : 'Send Feedback'}
                </button>
              </div>
            </div>
          </div>
        </div>
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