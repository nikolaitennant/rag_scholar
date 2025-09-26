import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, MessageSquare, Home, Upload, Settings, X, HelpCircle, Plus, BookOpen, User, Heart, Edit, Star, Award, Zap, Trophy, Target, MessageCircle, Sparkles, LogOut, Key, Palette, Clock, Shield, Cpu, ChevronRight, Globe, Moon, Sun, Send, ChevronDown } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { Sidebar } from './components/Sidebar';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { LoginPage } from './components/LoginPage';
import { ThemeToggle } from './components/ThemeToggle';
import { SettingsModal } from './components/SettingsModal';
import { AchievementNotification } from './components/AchievementNotification';
import { useAchievements } from './hooks/useAchievements';
import { apiService } from './services/api';
import { Message, DomainType, Document, UserClass } from './types';
import { DOMAIN_TYPE_INFO } from './constants/domains';

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
  const [mobilePage, setMobilePage] = useState<'chat' | 'home' | 'docs' | 'classes' | 'rewards' | 'settings'>('home');
  const [showMobileClassForm, setShowMobileClassForm] = useState(false);
  const [editingMobileClass, setEditingMobileClass] = useState<UserClass | null>(null);
  const [mobileEditingClassDocs, setMobileEditingClassDocs] = useState<string[]>([]);
  const [mobileClassFormData, setMobileClassFormData] = useState({ name: '', type: DomainType.GENERAL, description: '' });
  const [isEditingMobileClass, setIsEditingMobileClass] = useState(false);
  const [mobileInput, setMobileInput] = useState('');
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
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'advanced'>('general');
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

  // Auto-save profile changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.name !== user?.displayName) {
        try {
          // Update display name if changed
          await updateDisplayName(formData.name);
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, 1000); // Auto-save after 1 second of no changes

    return () => clearTimeout(timer);
  }, [formData.name, user]);

  const handleLogout = () => {
    logout();
  };


  // NOTE: Document and session loading now handled by initializeApp coordinator

  // Load initial data
  const loadDocuments = useCallback(async () => {
    try {
      setLoadingStatus('Loading your documents...');
      console.log('Loading documents...');
      const docs = await apiService.getDocuments();
      console.log('✅ Documents loaded:', docs.length);
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
      console.log('✅ Sessions loaded:', sessionsData.length);

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
    try {
      setLoadingStatus('Loading your classes...');
      // Load classes from localStorage or start with empty array
      const savedClasses = localStorage.getItem('userClasses');
      const classes: UserClass[] = savedClasses ? JSON.parse(savedClasses) : [];

      setUserClasses(classes);
      // Only auto-select first class on initial app load, not when user deselects
      // This prevents overriding user's intentional deselection
      console.log('✅ User classes loaded:', classes.length);
    } catch (error) {
      console.error('Failed to load user classes:', error);
    }
  }, []); // Remove activeClass dependency to prevent re-triggering on deselection

  const checkApiHealth = useCallback(async () => {
    try {
      setLoadingStatus('Checking API connection...');
      await apiService.health();
      setApiError(null);
      console.log('✅ API health check passed');
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
      console.log('🎯 Data loading complete, waiting for UI to update...');

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
      if (mobileFilterRef.current && !mobileFilterRef.current.contains(event.target as Node)) {
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

      console.log('🎯 Data loading finished. Sessions:', sessions.length, 'Classes:', userClasses.length, 'Documents:', documents.length);

      if (hasActualSessions) {
        // We have sessions, wait a bit longer to ensure they're rendered
        console.log('✅ Sessions found, finishing loading soon...');
        setTimeout(() => {
          setAppLoading(false);
          console.log('🎉 App fully loaded with sessions - UI ready!');
        }, 2000);
      } else {
        // No sessions, wait much longer to be sure
        console.log('⏳ No sessions found, waiting longer...');
        setTimeout(() => {
          setAppLoading(false);
          console.log('🎉 App loaded (no sessions) - UI ready!');
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
    // Check if it's a background command
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
        query: content,
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
    console.log('Starting new chat session...');
    // Generate new session ID but don't create session in UI yet
    const newSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);

    setCurrentSessionId(newSessionId);
    setMessages([]);
    setIsNewChatSession(true);

    // Note: We're starting a new chat session, so no need to clear anything
    // The new session ID will have its own cache entry

    console.log('✅ Ready for new chat - session will appear when AI responds');
  };

  const handleClearChat = () => {
    handleNewChat();
  };

  const handleSelectSession = (sessionId: string) => {
    console.log('ChatGPT-style session switching:', sessionId);

    // Prevent double-clicks by checking if already loading this session
    if (currentSessionId === sessionId && !isNewChatSession) {
      console.log('Session already selected, ignoring duplicate click');
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
      console.log('✅ Instant load from cache');
    } else {
      // No cache - show empty state and load from Firestore (LangChain)
      setMessages([]);
      setIsChatLoading(true);

      // Use LangChain's FirestoreChatMessageHistory via our API
      apiService.getSessionMessages(sessionId)
        .then(sessionData => {
          // Remove the race condition check - always update if we get data
          console.log('Loaded messages for session:', sessionId, sessionData.messages?.length || 0);
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

    console.log('✅ Session switch complete (ChatGPT-style)');
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

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await apiService.deleteSession(sessionId);
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleUploadDocument = async (file: File) => {
    setIsDocumentLoading(true);
    try {
      // Always upload to 'database' collection so documents can be shared across classes
      const collection = 'database';
      console.log(`🔍 UPLOADING '${file.name}' to database collection for shared use`);
      const uploadResponse = await apiService.uploadDocument(file, collection);
      console.log('Upload successful:', uploadResponse);
      // Refresh document list
      await loadDocuments();
      console.log('Documents reloaded after upload');

      // Check for new achievements and refresh user profile after document upload (with small delay)
      setTimeout(async () => {
        await checkForNewAchievements();
        await refreshUserProfile();
      }, 1000);

      // Auto-assign the uploaded document to the current active class
      if (activeClass && uploadResponse.id) {
        console.log(`🔗 Auto-assigning uploaded document to active class: ${activeClass.name}`);
        try {
          await handleAssignDocumentToClass(uploadResponse.id, uploadResponse.filename || file.name, activeClass.id, 'add');
          console.log('✅ Document auto-assigned to class successfully');
        } catch (error) {
          console.error('❌ Failed to auto-assign document to class:', error);
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
      console.log('Attempting to delete document:', documentId);
      await apiService.deleteDocument(documentId);
      console.log('Delete successful, refreshing documents...');
      await loadDocuments();
      console.log('Documents refreshed after delete');

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
    const newClass: UserClass = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      name,
      domainType,
      description: description || '',
      documents: selectedDocuments || [],
      created_at: new Date().toISOString()
    };

    const updatedClasses = [...userClasses, newClass];
    setUserClasses(updatedClasses);
    localStorage.setItem('userClasses', JSON.stringify(updatedClasses));

    // If documents were selected, assign them to the class in the backend
    if (selectedDocuments && selectedDocuments.length > 0) {
      try {
        for (const documentId of selectedDocuments) {
          const document = documents.find(doc => doc.id === documentId);
          if (document) {
            await handleAssignDocumentToClass(documentId, document.filename, newClass.id, 'add');
          }
        }
        console.log(`Successfully assigned ${selectedDocuments.length} documents to class "${name}"`);
      } catch (error) {
        console.error('Failed to assign documents to class:', error);
      }
    }

    // Auto-select the newly created class
    handleSelectClass(newClass);
  };

  const handleSelectClass = (userClass: UserClass) => {
    console.log('🔥 handleSelectClass called with:', {
      clickedClass: { name: userClass.name, id: userClass.id },
      currentActiveClass: activeClass ? { name: activeClass.name, id: activeClass.id } : null,
      timestamp: Date.now()
    });

    // Check if we should deselect (same class clicked)
    const shouldDeselect = activeClass && activeClass.id === userClass.id;

    console.log('🧭 Decision logic:', {
      shouldDeselect,
      activeClassId: activeClass?.id,
      clickedClassId: userClass.id,
      idsMatch: activeClass?.id === userClass.id
    });

    if (shouldDeselect) {
      console.log('❌ DESELECTING class - setting activeClass to null');
      setActiveClass(null);
      setMessages([]);
      setCurrentSessionId(null);
      setIsNewChatSession(false);
    } else {
      console.log('✅ SELECTING new class:', userClass.name);
      setActiveClass(userClass);
      setMessages([]);
      setCurrentSessionId(null);
      setIsNewChatSession(false);
    }

    // Add a small delay and verify the state change
    setTimeout(() => {
      console.log('🔍 After state change - activeClass should be:', shouldDeselect ? null : userClass.name);
    }, 100);
  };

  const handleEditClass = (classId: string, name: string, domainType: DomainType, description?: string) => {
    const updatedClasses = userClasses.map(userClass =>
      userClass.id === classId
        ? { ...userClass, name, domainType, description: description || '' }
        : userClass
    );
    setUserClasses(updatedClasses);
    localStorage.setItem('userClasses', JSON.stringify(updatedClasses));

    if (activeClass?.id === classId) {
      setActiveClass(prev => prev ? { ...prev, name, domainType, description: description || '' } : null);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    const userClass = userClasses.find(c => c.id === classId);
    if (!window.confirm(`Delete "${userClass?.name}" class? This will also delete all related chat sessions and remove class tags from documents.`)) {
      return;
    }

    try {
      console.log('Starting cascading delete for class:', classId);

      // Find all sessions related to this class
      const sessionsToDelete = sessions.filter(session => session.class_id === classId);
      console.log('Found sessions to delete:', sessionsToDelete.length);

      // Delete all related sessions from database
      const sessionDeletionPromises = sessionsToDelete.map(session =>
        apiService.deleteSession(session.id).catch(error => {
          console.error(`Failed to delete session ${session.id}:`, error);
          return null; // Don't fail the whole operation for one session
        })
      );

      await Promise.all(sessionDeletionPromises);
      console.log('Deleted all related sessions');

      // Find all documents that have this class assigned
      const documentsWithClass = documents.filter(doc =>
        doc.assigned_classes && doc.assigned_classes.includes(classId)
      );
      console.log('Found documents with class tags to remove:', documentsWithClass.length);

      // Remove class tags from all documents
      const documentUpdatePromises = documentsWithClass.map(doc =>
        apiService.assignDocumentToClass(doc.id, doc.filename, classId, 'remove').catch(error => {
          console.error(`Failed to remove class from document ${doc.id}:`, error);
          return null; // Don't fail the whole operation for one document
        })
      );

      await Promise.all(documentUpdatePromises);
      console.log('Removed class tags from all documents');

      // Update local documents state - remove the deleted class ID from assigned_classes
      setDocuments(prevDocs =>
        prevDocs.map(doc => ({
          ...doc,
          assigned_classes: doc.assigned_classes?.filter(id => id !== classId) || []
        }))
      );

      // Update local state - remove the class
      const updatedClasses = userClasses.filter(userClass => userClass.id !== classId);
      setUserClasses(updatedClasses);
      localStorage.setItem('userClasses', JSON.stringify(updatedClasses));

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

      console.log('✅ Cascading delete completed successfully');
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
      console.log(`Removing ${documentsToRemove.length} documents from class:`, documentsToRemove);
      for (const documentId of documentsToRemove) {
        const document = documents.find(doc => doc.id === documentId);
        if (document) {
          console.log(`Removing document: ${document.filename} (${documentId})`);
          try {
            await handleAssignDocumentToClass(documentId, document.filename, classId, 'remove');
            console.log(`Successfully removed: ${document.filename}`);
          } catch (error) {
            console.error(`Failed to remove document ${document.filename}:`, error);
          }
        }
      }

      console.log(`Successfully updated document assignments for class "${userClass?.name}"`);
    } catch (error) {
      console.error('Failed to sync document assignments with backend:', error);
    }
  };

  const handleAssignDocumentToClass = async (documentId: string, documentSource: string, classId: string, operation: 'add' | 'remove') => {
    console.log(`Class assignment loading started: ${operation} ${documentSource} to ${classId}`);
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

      console.log(`Document ${operation === 'add' ? 'assigned to' : 'removed from'} class successfully`);
    } catch (error) {
      console.error('Class assignment failed:', error);
    } finally {
      console.log('Class assignment loading finished');
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
          <div className="h-full flex flex-col">
            {/* Mobile Chat Header */}
            <div className={`px-4 py-3  flex items-center justify-between ${
              theme === 'dark' ? 'backdrop-blur-md bg-white/10' : 'backdrop-blur-md bg-black/10'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
                }`}>
                  <MessageSquare className={`w-4 h-4 ${theme === 'dark' ? 'text-white' : 'text-black'}`} />
                </div>
                <div>
                  <h1 className={`font-semibold text-lg ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    {activeClass ? activeClass.name : 'Chat'}
                  </h1>
                  {activeClass && (
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {DOMAIN_TYPE_INFO[activeClass.domainType]?.label || activeClass.domainType}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleNewChat}
                className={`p-2 rounded-lg ${
                  theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Chat Interface */}
            <div className="flex-1 min-h-0 pb-20 flex flex-col">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  /* Mobile welcome state - simpler than desktop */
                  <div className="flex flex-col justify-center h-full text-center">
                    <div className={`mb-8 ${theme === 'dark' ? 'text-white/70' : 'text-black/70'}`}>
                      <h2 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                        {(() => {
                          const hour = new Date().getHours();
                          const userName = user?.displayName || user?.email || 'User';
                          if (hour < 12) return `Good morning, ${userName}!`;
                          if (hour < 17) return `Good afternoon, ${userName}!`;
                          return `Good evening, ${userName}!`;
                        })()}
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

              {/* Fixed Bottom Input */}
              <div className="p-4 border-t border-gray-200/20">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (mobileInput.trim() && !isChatLoading) {
                    handleSendMessage(mobileInput.trim());
                    setMobileInput('');
                  }
                }} className="flex space-x-2">
                  <input
                    type="text"
                    value={mobileInput}
                    onChange={(e) => setMobileInput(e.target.value)}
                    placeholder="Ask anything..."
                    className={`flex-1 backdrop-blur-sm border rounded-full px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 ${
                      theme === 'dark'
                        ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                        : 'bg-black/10 border-black/20 text-black placeholder-black/50'
                    }`}
                    disabled={isChatLoading}
                  />
                  <button
                    type="submit"
                    disabled={!mobileInput.trim() || isChatLoading}
                    className={`p-3 rounded-full transition-all duration-200 ${
                      mobileInput.trim() && !isChatLoading
                        ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-md'
                        : theme === 'dark'
                          ? 'bg-white/10 text-white/40'
                          : 'bg-black/10 text-black/40'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        );

      case 'home':
        return (
          <div className="h-full overflow-y-auto pb-20">
            {/* Mobile Header */}
            <div className="px-4 py-6">
              <div className="text-center">
                <h1 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  {(() => {
                    const hour = new Date().getHours();
                    const userName = user?.displayName || user?.email || 'User';
                    if (hour < 12) return `Good morning, ${userName}!`;
                    if (hour < 17) return `Good afternoon, ${userName}!`;
                    return `Good evening, ${userName}!`;
                  })()}
                  <Heart className="w-5 h-5 text-pink-400 animate-pulse inline-block ml-2" style={{ verticalAlign: 'middle' }} />
                </h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Ready to explore your documents?
                </p>
              </div>
            </div>

            <div className="px-4 pt-6 space-y-6 flex flex-col flex-1 min-h-0">
              {/* Active Class */}
              {activeClass && (
                <div className={`p-4 rounded-xl ${
                  theme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                }`}>
                  <div className="flex items-center space-x-3 mb-3">
                    {(() => {
                      const Icon = DOMAIN_TYPE_INFO[activeClass.domainType]?.icon;
                      return Icon ? <Icon className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-black'}`} /> : null;
                    })()}
                    <div>
                      <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                        {activeClass.name}
                      </h3>
                      <p className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-black/70'}`}>
                        Active Class • {documents.filter(doc => doc.assigned_classes?.includes(activeClass.id)).length} documents
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleNewChat();
                      setMobilePage('chat');
                    }}
                    className={`w-full py-2 px-4 rounded-lg font-medium text-sm ${
                      theme === 'dark' ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-black/10 hover:bg-black/20 text-black'
                    }`}
                  >
                    Start Chatting
                  </button>
                </div>
              )}

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    if (!activeClass) {
                      setMobilePage('classes');
                    } else {
                      handleNewChat();
                      setMobilePage('chat');
                    }
                  }}
                  className={`p-4 rounded-xl transition-all ${
                    theme === 'dark'
                      ? 'bg-white/5 hover:bg-white/10'
                      : 'bg-black/5 hover:bg-black/10'
                  }`}
                >
                  <MessageSquare className={`w-6 h-6 mx-auto mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`} />
                  <span className={`text-sm font-medium block ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    {activeClass ? 'New Chat' : 'Select Class'}
                  </span>
                </button>

                <button
                  onClick={() => setMobilePage('docs')}
                  className={`p-4 rounded-xl transition-all ${
                    theme === 'dark'
                      ? 'bg-white/5 hover:bg-white/10'
                      : 'bg-black/5 hover:bg-black/10'
                  }`}
                >
                  <Upload className={`w-6 h-6 mx-auto mb-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span className={`text-sm font-medium block ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    Upload
                  </span>
                </button>
              </div>

              {/* Recent Chats */}
              {sessions.length > 0 && (
                <div className="flex flex-col flex-1 min-h-0">
                  <div className="mb-3">
                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      Recent Chats
                    </h3>
                  </div>
                  <div className="space-y-2 flex-1 overflow-y-auto scrollbar-none">
                    {sessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => {
                          handleSelectSession(session.id);
                          setMobilePage('chat');
                        }}
                        className={`w-full p-3 rounded-lg text-left transition-all ${
                          theme === 'dark'
                            ? 'bg-white/5 hover:bg-white/10'
                            : 'bg-black/5 hover:bg-black/10'
                        }`}
                      >
                        <p className={`font-medium text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                          {session.name}
                        </p>
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {formatLocalDate(session.updated_at)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        );

      case 'docs':
        return (
          <div className="h-full flex flex-col pb-20">
            {/* Mobile Header */}
            <div className={`px-4 py-4  ${
              theme === 'dark' ? 'backdrop-blur-md bg-white/10' : 'backdrop-blur-md bg-black/10'
            }`}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                Documents
              </h2>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
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

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Class Filter */}
              {userClasses.length > 0 && (
                <div className={`p-4 rounded-xl backdrop-blur-sm border ${
                  theme === 'dark' ? 'bg-white/10 border-white/20' : 'bg-black/10 border-black/20'
                }`}>
                  <label className={`block text-sm font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    Filter by Class
                  </label>
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
                </div>
              )}

              {/* Upload Section */}
              <label className={`block p-6 rounded-xl text-center cursor-pointer transition-all ${
                theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'
              }`}>
                <Upload className={`w-8 h-8 mx-auto mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                <span className={`text-sm font-medium block mb-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  Upload Document
                </span>
                <span className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  PDF, Word, Text, or Markdown
                </span>
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

      case 'classes':
        return (
          <div className="h-full flex flex-col pb-20">
            {/* Mobile Header */}
            <div className={`px-4 py-4  ${
              theme === 'dark' ? 'backdrop-blur-md bg-white/10' : 'backdrop-blur-md bg-black/10'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    Classes
                  </h2>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {userClasses.length} class{userClasses.length !== 1 ? 'es' : ''} created
                  </p>
                </div>
                <button
                  onClick={() => setShowMobileClassForm(!showMobileClassForm)}
                  className={`p-2 rounded-lg ${
                    theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/10 text-black'
                  }`}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Create Class Form */}
              {showMobileClassForm && (
                <div className={`p-4 rounded-xl  ${
                  theme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                }`}>
                  <h3 className={`font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    Create New Class
                  </h3>

                  <div className="space-y-4">
                    <input
                      type="text"
                      value={mobileClassFormData.name}
                      onChange={(e) => setMobileClassFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Class name (e.g., History 101)"
                      className={`w-full px-4 py-3 rounded-lg  text-sm ${
                        theme === 'dark'
                          ? 'bg-gray-700 -gray-600 text-white placeholder-gray-400'
                          : 'bg-gray-50 -gray-300 text-black placeholder-gray-500'
                      }`}
                    />

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                        Subject Type
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(DOMAIN_TYPE_INFO).map(([type, info]) => {
                          const Icon = info.icon;
                          return (
                            <button
                              key={type}
                              onClick={() => setMobileClassFormData(prev => ({ ...prev, type: type as DomainType }))}
                              className={`p-3 rounded-lg transition-all flex flex-col items-center space-y-1 ${
                                mobileClassFormData.type === type
                                  ? theme === 'dark'
                                    ? 'bg-white/10 text-white'
                                    : 'bg-black/10 lue-300 text-black'
                                  : theme === 'dark'
                                    ? 'bg-gray-700 -gray-600 text-gray-300 hover:bg-gray-600'
                                    : 'bg-black/5 text-gray-600 hover:bg-gray-50'
                              } `}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-xs font-medium">{info.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          if (mobileClassFormData.name.trim()) {
                            handleCreateClass(
                              mobileClassFormData.name,
                              mobileClassFormData.type,
                              mobileClassFormData.description
                            );
                            setMobileClassFormData({ name: '', type: DomainType.GENERAL, description: '' });
                            setShowMobileClassForm(false);
                          }
                        }}
                        disabled={!mobileClassFormData.name.trim()}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm ${
                          mobileClassFormData.name.trim()
                            ? 'bg-white text-white'
                            : theme === 'dark'
                              ? 'bg-gray-700 text-gray-500'
                              : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        Create Class
                      </button>
                      <button
                        onClick={() => {
                          setShowMobileClassForm(false);
                          setMobileClassFormData({ name: '', type: DomainType.GENERAL, description: '' });
                        }}
                        className={`px-4 py-3 rounded-lg text-sm ${
                          theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Classes List */}
              {userClasses.length === 0 ? (
                <div className="text-center py-12">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                    theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                  }`}>
                    <BookOpen className={`w-8 h-8 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
                  </div>
                  <p className={`font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    No classes yet
                  </p>
                  <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Create your first class to organize documents
                  </p>
                  <button
                    onClick={() => setShowMobileClassForm(true)}
                    className="px-6 py-2 bg-white text-white rounded-lg font-medium text-sm"
                  >
                    Create Class
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {userClasses.map((userClass) => {
                    const typeInfo = DOMAIN_TYPE_INFO[userClass.domainType];
                    const Icon = typeInfo?.icon;
                    const isActive = activeClass?.id === userClass.id;
                    const docCount = documents.filter(doc => doc.assigned_classes?.includes(userClass.id)).length;

                    return (
                      <div key={userClass.id} className="relative">
                        <button
                          onClick={() => handleSelectClass(userClass)}
                          className={`w-full p-4 rounded-xl text-left transition-all ${
                            isActive
                              ? theme === 'dark'
                                ? 'bg-white/10'
                                : 'bg-black/10'
                              : theme === 'dark'
                                ? 'bg-white/5 hover:bg-white/10'
                                : 'bg-black/5 hover:bg-black/10'
                          }`}
                        >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${
                            isActive
                              ? theme === 'dark' ? 'bg-white/20' : 'bg-black/20'
                              : theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
                          }`}>
                            {Icon && <Icon className={`w-5 h-5 ${
                              isActive
                                ? theme === 'dark' ? 'text-white' : 'text-black'
                                : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-medium truncate ${
                              theme === 'dark' ? 'text-white' : 'text-black'
                            }`}>
                              {userClass.name}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/10 text-black'
                              }`}>
                                {typeInfo?.label || userClass.domainType}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/10 text-black'
                              }`}>
                                {docCount} doc{docCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingMobileClass(userClass);
                              setMobileEditingClassDocs(documents.filter(doc => doc.assigned_classes?.includes(userClass.id)).map(doc => doc.id));
                            }}
                            className={`p-2 rounded-lg transition-colors ${
                              theme === 'dark' ? 'hover:bg-white/10 text-white/60' : 'hover:bg-black/10 text-black/60'
                            }`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Edit Class Modal */}
              {editingMobileClass && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                  <div className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl ${
                    theme === 'dark' ? 'bg-gray-900' : 'bg-white'
                  }`}>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                          Edit Class
                        </h3>
                        <button
                          onClick={() => {
                            setEditingMobileClass(null);
                            setMobileEditingClassDocs([]);
                          }}
                          className={`p-1 rounded-lg ${
                            theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                          }`}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            Class Name
                          </label>
                          <input
                            type="text"
                            value={editingMobileClass.name}
                            onChange={(e) => setEditingMobileClass(prev => prev ? { ...prev, name: e.target.value } : null)}
                            className={`w-full px-3 py-2 rounded-lg text-sm ${
                              theme === 'dark'
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                : 'bg-gray-50 border-gray-300 text-black placeholder-gray-500'
                            }`}
                          />
                        </div>

                        <div>
                          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            Assigned Documents ({mobileEditingClassDocs.length})
                          </label>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {documents.map((doc) => (
                              <label key={doc.id} className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={mobileEditingClassDocs.includes(doc.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setMobileEditingClassDocs(prev => [...prev, doc.id]);
                                    } else {
                                      setMobileEditingClassDocs(prev => prev.filter(id => id !== doc.id));
                                    }
                                  }}
                                  className="rounded"
                                />
                                <span className={`text-sm truncate ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                                  {doc.filename}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="flex space-x-3 pt-4">
                          <button
                            onClick={async () => {
                              if (editingMobileClass && !isEditingMobileClass) {
                                setIsEditingMobileClass(true);
                                try {
                                  // Update class using the same logic as desktop
                                  handleEditClass(editingMobileClass.id, editingMobileClass.name, editingMobileClass.domainType);
                                  // Wait a bit longer to ensure React state updates complete
                                  await new Promise(resolve => setTimeout(resolve, 100));
                                  await handleAssignDocuments(editingMobileClass.id, mobileEditingClassDocs);
                                  // Clear edit state after all operations complete
                                  setEditingMobileClass(null);
                                  setMobileEditingClassDocs([]);
                                } finally {
                                  setIsEditingMobileClass(false);
                                }
                              }
                            }}
                            disabled={!editingMobileClass || isEditingMobileClass}
                            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 rounded-lg transition-all duration-200 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                          >
                            {isEditingMobileClass && (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            )}
                            {isEditingMobileClass ? 'Updating...' : 'Update Class'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingMobileClass(null);
                              setMobileEditingClassDocs([]);
                            }}
                            className={`px-4 py-3 rounded-lg text-sm ${
                              theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'rewards':
        return (
          <div className="h-full flex flex-col pb-20">
            {/* Mobile Header */}
            <div className={`px-4 py-4 ${
              theme === 'dark' ? 'backdrop-blur-md bg-white/10' : 'backdrop-blur-md bg-black/10'
            }`}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                Achievements
              </h2>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Track your learning progress
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Achievement Stats */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    Rewards
                  </h3>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                    {achievements.filter(a => a.unlocked_at !== null).length} of {achievements.length} completed
                  </p>
                </div>
                <div className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border border-yellow-400/40 rounded-full px-3 py-1.5 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="font-bold text-sm text-yellow-400">
                    {userProfile?.stats?.total_points || 0} pts
                  </span>
                </div>
              </div>

              {/* Goals Section */}
              {achievements.filter(a => a.unlocked_at === null).length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-2">
                    <Target className="w-4 h-4 text-blue-400" />
                    <h4 className={`text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      GOALS ({achievements.filter(a => a.unlocked_at === null).length})
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
                            <div className="bg-gradient-to-r from-blue-400/20 to-purple-400/20 border border-purple-400/40 rounded-full px-2 py-1 flex items-center gap-1">
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
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <h4 className={`text-xs font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      UNLOCKED ({achievements.filter(a => a.unlocked_at !== null).length})
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
                          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-lg animate-pulse" />

                          <div className="relative">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Icon className={`w-5 h-5 ${getColor(achievement.type)}`} />
                                <Award className="w-4 h-4 text-yellow-400" />
                              </div>
                              <div className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border border-yellow-400/40 rounded-full px-2 py-1 flex items-center gap-1">
                                <Zap className="w-3 h-3 text-yellow-400" />
                                <span className="text-xs font-bold text-yellow-400">
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
          </div>
        );

      case 'settings':
        return (
          <div className="h-full flex flex-col pb-20">
            {/* Mobile Header */}
            <div className={`px-4 py-4  ${
              theme === 'dark' ? 'backdrop-blur-md bg-white/10' : 'backdrop-blur-md bg-black/10'
            }`}>
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                Settings
              </h2>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Customize your experience
              </p>
            </div>

            {/* Settings Tabs */}
            <div className={`px-4 border-b ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`}>
              <div className="flex space-x-6">
                <button
                  onClick={() => setActiveSettingsTab('general')}
                  className={`py-3 px-2 text-sm font-medium transition-all ${
                    activeSettingsTab === 'general'
                      ? (theme === 'dark' ? 'text-white border-b-2 border-white' : 'text-black border-b-2 border-black')
                      : (theme === 'dark' ? 'text-gray-400' : 'text-gray-600')
                  }`}
                >
                  General
                </button>
                <button
                  onClick={() => setActiveSettingsTab('advanced')}
                  className={`py-3 px-2 text-sm font-medium transition-all ${
                    activeSettingsTab === 'advanced'
                      ? (theme === 'dark' ? 'text-white border-b-2 border-white' : 'text-black border-b-2 border-black')
                      : (theme === 'dark' ? 'text-gray-400' : 'text-gray-600')
                  }`}
                >
                  Advanced
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeSettingsTab === 'general' ? (
                <>
                  {/* Account Section */}
                  <div className={`p-4 rounded-xl ${
                    theme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                  }`}>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                        Account
                      </h3>
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
                          className={`w-full px-3 py-2 text-sm rounded-lg border transition-all ${
                            theme === 'dark'
                              ? 'bg-black/30 border-white/20 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-black placeholder-gray-500'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                        />
                      </div>

                      <div className={`p-3 rounded-lg ${
                        theme === 'dark' ? 'bg-black/10 border border-white/10' : 'bg-white border border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
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
                          className={`w-full flex items-center justify-center space-x-2 p-3 rounded-lg transition-all ${
                            theme === 'dark'
                              ? 'bg-white/10 text-white hover:bg-white/20'
                              : 'bg-black/10 text-black hover:bg-black/20'
                          }`}
                        >
                          <Key className="w-4 h-4" />
                          <span className="font-medium">Reset Password</span>
                        </button>
                      )}

                      {isResetPasswordMode && (
                        <div className="space-y-4">
                          <div className="text-center">
                            <h4 className={`font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                              Reset Password
                            </h4>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              Send password reset email to your account
                            </p>
                          </div>

                          {saveMessage && (
                            <div className={`p-3 rounded-lg text-center text-sm ${
                              saveMessage.includes('sent')
                                ? theme === 'dark'
                                  ? 'bg-green-900/20 text-green-400'
                                  : 'bg-green-50 text-green-600'
                                : theme === 'dark'
                                  ? 'bg-red-900/20 text-red-400'
                                  : 'bg-red-50 text-red-600'
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
                              className={`flex-1 py-3 rounded-lg font-medium text-sm ${
                                theme === 'dark'
                                  ? 'bg-white/20 hover:bg-white/30 text-white'
                                  : 'bg-black/20 hover:bg-black/30 text-black'
                              } disabled:opacity-50`}
                            >
                              {isLoading ? 'Sending...' : 'Send Reset Email'}
                            </button>

                            <button
                              onClick={() => {
                                setIsResetPasswordMode(false);
                                setSaveMessage(null);
                              }}
                              className={`flex-1 py-3 rounded-lg font-medium text-sm ${
                                theme === 'dark'
                                  ? 'bg-white/10 text-white hover:bg-white/20'
                                  : 'bg-black/10 text-black hover:bg-black/20'
                              }`}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={handleLogout}
                        className={`w-full flex items-center justify-center space-x-2 p-3 rounded-lg transition-all ${
                          theme === 'dark'
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="font-medium">Sign Out</span>
                      </button>
                    </div>
                  </div>

                  {/* Appearance Section */}
                  <div className={`p-4 rounded-xl ${
                    theme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                  }`}>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                        <Palette className="w-4 h-4 text-white" />
                      </div>
                      <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                        Appearance
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {/* Theme Toggle */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Color Theme
                        </label>
                        <button
                          onClick={toggleTheme}
                          className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                            theme === 'dark'
                              ? 'bg-white/10 hover:bg-white/20'
                              : 'bg-black/10 hover:bg-black/20'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            {theme === 'dark' ? (
                              <Moon className="w-5 h-5 text-blue-400" />
                            ) : (
                              <Sun className="w-5 h-5 text-orange-500" />
                            )}
                            <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                              {themeMode === 'auto' ? `Auto (${theme})` : theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                            </span>
                          </div>
                          <div className={`w-12 h-6 rounded-full transition-colors ${
                            theme === 'dark' ? 'bg-blue-500' : 'bg-gray-300'
                          }`}>
                            <div className={`w-5 h-5 mt-0.5 rounded-full bg-white transition-transform ${
                              theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'
                            }`} />
                          </div>
                        </button>
                      </div>

                      {/* Background Style */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Background
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['classic', 'gradient', 'mountain', 'ocean', 'sunset', 'forest'] as const).map((bg) => (
                            <button
                              key={bg}
                              onClick={() => setBackground(bg)}
                              className={`px-3 py-2 text-xs rounded-lg transition-all ${
                                background === bg
                                  ? theme === 'dark'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-black/20 text-black'
                                  : theme === 'dark'
                                    ? 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    : 'bg-black/5 text-gray-600 hover:bg-black/10'
                              }`}
                            >
                              {bg.charAt(0).toUpperCase() + bg.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* API Configuration */}
                  <div className={`p-4 rounded-xl ${
                    theme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                  }`}>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                        <Key className="w-4 h-4 text-white" />
                      </div>
                      <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                        API Configuration
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          API Key
                        </label>
                        <input
                          type="password"
                          value={apiSettings.apiKey}
                          onChange={(e) => setApiSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                          placeholder="sk-... (OpenAI) | sk-ant-... (Anthropic)"
                          className={`w-full px-3 py-2 text-sm rounded-lg border transition-all ${
                            theme === 'dark'
                              ? 'bg-black/30 border-white/20 text-white placeholder-gray-400'
                              : 'bg-white border-gray-300 text-black placeholder-gray-500'
                          } focus:outline-none focus:ring-2 focus:ring-green-500/50`}
                        />
                        {getProviderAndModels().provider && (
                          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                            ✓ Detected: {getProviderAndModels().provider}
                          </p>
                        )}
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          Your API key is stored securely in your browser
                        </p>
                      </div>

                      <div className={`p-3 rounded-lg ${
                        theme === 'dark' ? 'bg-black/10' : 'bg-white'
                      }`}>
                        <div className="flex items-start space-x-3">
                          <Shield className={`w-4 h-4 mt-0.5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                          <div>
                            <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
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

                  {/* Timezone */}
                  <div className={`p-4 rounded-xl ${
                    theme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                  }`}>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                      <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                        Timezone
                      </h3>
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
                          className={`w-full px-3 py-2 text-sm rounded-lg border transition-all ${
                            theme === 'dark'
                              ? 'bg-black/30 border-white/20 text-white'
                              : 'bg-white border-gray-300 text-black'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                        >
                          <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>Auto-detect</option>
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                          <option value="Europe/London">London</option>
                          <option value="Europe/Paris">Paris</option>
                          <option value="Asia/Tokyo">Tokyo</option>
                        </select>
                      </div>

                      <div className={`p-3 rounded-lg ${
                        theme === 'dark' ? 'bg-black/10' : 'bg-white'
                      }`}>
                        <div className="flex items-center space-x-3">
                          <Globe className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                          <div className="text-sm">
                            <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
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
                </>
              ) : (
                /* Advanced Tab */
                <div className={`p-4 rounded-xl ${
                  theme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                }`}>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                      <Cpu className="w-4 h-4 text-white" />
                    </div>
                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      Model Parameters
                    </h3>
                  </div>

                  {!showAdvancedParams ? (
                    <div className={`p-4 rounded-lg text-center ${
                      theme === 'dark' ? 'bg-black/10' : 'bg-white'
                    }`}>
                      <div className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                        Default
                      </div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                        Model parameters are currently using default settings
                      </p>
                      <button
                        onClick={() => setShowAdvancedParams(true)}
                        className={`px-4 py-2 rounded-lg transition-all ${
                          theme === 'dark'
                            ? 'bg-white/10 text-white hover:bg-white/20'
                            : 'bg-black/10 text-black hover:bg-black/20'
                        }`}
                      >
                        Customize Parameters
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                          Model Parameters
                        </h4>
                        <button
                          onClick={() => setShowAdvancedParams(false)}
                          className={`text-sm px-3 py-1 rounded-lg transition-all ${
                            theme === 'dark'
                              ? 'text-gray-400 hover:text-white hover:bg-white/10'
                              : 'text-gray-600 hover:text-black hover:bg-black/10'
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
                        <select
                          value={apiSettings.model}
                          onChange={(e) => setApiSettings(prev => ({ ...prev, model: e.target.value }))}
                          disabled={getProviderAndModels().models.length === 0}
                          className={`w-full px-3 py-2 text-sm rounded-lg border transition-all ${
                            getProviderAndModels().models.length === 0
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          } ${
                            theme === 'dark'
                              ? 'bg-black/30 border-white/20 text-white'
                              : 'bg-white border-gray-300 text-black'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                        >
                          {getProviderAndModels().models.length === 0 ? (
                            <option>Add API key to enable model selection</option>
                          ) : (
                            getProviderAndModels().models.map(({ value, label }) => (
                              <option key={value} value={value}>{label}</option>
                            ))
                          )}
                        </select>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
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
                            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700"
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
                            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700"
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
              )}
            </div>
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
          <div className="animate-spin rounded-full h-8 w-8 -2 lue-500 mx-auto mb-4"></div>
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
    <div className={`h-screen flex ${getBackgroundClass()}`}>
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

        {/* Mobile Bottom Navigation - Desktop Style */}
        <div className={`fixed bottom-0 left-0 right-0 -t backdrop-blur-md ${
          theme === 'dark'
            ? background === 'classic' ? 'bg-neutral-900/95 -neutral-700' : 'bg-white/10 -white/20'
            : 'bg-black/10 lack/20'
        }`}>
          <div className="flex justify-around py-1">
            {[
              { page: 'home', icon: Home, label: 'Home' },
              { page: 'chat', icon: MessageSquare, label: 'Chat' },
              { page: 'docs', icon: Upload, label: 'Docs' },
              { page: 'classes', icon: BookOpen, label: 'Classes' },
              { page: 'rewards', icon: Settings, label: 'Rewards' },
              { page: 'settings', icon: User, label: 'Settings' },
            ].map(({ page, icon: Icon, label }) => {
              const isActive = mobilePage === page;
              return (
                <button
                  key={page}
                  onClick={() => setMobilePage(page as any)}
                  className={`flex flex-col items-center p-3 transition-all duration-200 ${
                    isActive
                      ? theme === 'dark' ? 'text-white font-bold' : 'text-black font-bold'
                      : theme === 'dark' ? 'text-white/60 hover:text-white hover:font-bold' : 'text-black/60 hover:text-black hover:font-bold'
                  }`}
                >
                  <div className={`p-1 rounded-lg transition-all duration-200 ${
                    isActive
                      ? theme === 'dark'
                        ? 'bg-white/10 scale-110'
                        : 'bg-black/10 scale-110'
                      : 'scale-100'
                  }`}>
                    <Icon className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? 'scale-110' : 'scale-100'
                    }`} />
                  </div>
                  <span className={`text-xs mt-1 font-medium transition-all duration-200 ${
                    isActive ? 'opacity-100' : 'opacity-70'
                  }`}>
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
        />
      )}
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