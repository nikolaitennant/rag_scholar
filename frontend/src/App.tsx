import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, MessageSquare, Home, Upload, Settings, X, HelpCircle } from 'lucide-react';
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
  const { theme, themeMode, toggleTheme, getBackgroundClass } = useTheme();
  const { user, userProfile, login, signUp, resetPassword, refreshUserProfile, isAuthenticated, loading } = useUser();
  const { newlyUnlocked, dismissNotification, checkForNewAchievements } = useAchievements();

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
  const [mobilePage, setMobilePage] = useState<'chat' | 'home' | 'docs' | 'achievements' | 'settings' | 'help'>('home');
  const [showMobileClassForm, setShowMobileClassForm] = useState(false);
  const [editingMobileClass, setEditingMobileClass] = useState<UserClass | null>(null);
  const [mobileClassFormData, setMobileClassFormData] = useState({ name: '', type: DomainType.GENERAL, description: '' });
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themeToggleVisible, setThemeToggleVisible] = useState(true);
  const [isNewChatSession, setIsNewChatSession] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);


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
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            currentDomain={activeClass?.domainType || DomainType.GENERAL}
            activeCollection="default"
            userName={user?.displayName || user?.email || 'User'}
            sidebarOpen={sidebarOpen}
          />
        );
      case 'home':
        return (
          <div className="h-full overflow-y-auto p-4 pb-20">
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center">
                <h1 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  Welcome to RAG Scholar
                </h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                  Your AI-powered research assistant
                </p>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    handleNewChat();
                    setMobilePage('chat');
                  }}
                  className={`p-4 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30'
                      : 'bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20'
                  }`}
                >
                  <MessageSquare className={`w-6 h-6 mx-auto mb-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    New Chat
                  </span>
                </button>

                <button
                  onClick={() => setMobilePage('docs')}
                  className={`p-4 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/30'
                      : 'bg-green-500/10 hover:bg-green-500/20 border border-green-500/20'
                  }`}
                >
                  <Upload className={`w-6 h-6 mx-auto mb-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    Documents
                  </span>
                </button>
              </div>

              {/* Stats */}
              <div className={`p-4 rounded-lg border ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <h3 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  Quick Stats
                </h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                      {documents.length}
                    </div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                      Documents
                    </div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                      {userClasses.length}
                    </div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                      Classes
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'docs':
        return (
          <div className="h-full overflow-y-auto p-4 pb-20">
            <div className="max-w-md mx-auto space-y-6">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                Documents
              </h2>

              {/* Upload Section */}
              <div className={`p-4 rounded-lg border-2 border-dashed text-center ${
                theme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'
              }`}>
                <Upload className={`w-8 h-8 mx-auto mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`} />
                <label className="cursor-pointer">
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    Upload Document
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
              </div>

              {/* Documents List */}
              {isDocumentLoading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              )}

              {documents.length === 0 && !isDocumentLoading ? (
                <p className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  No documents uploaded yet
                </p>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-3 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-gray-800 border-gray-700'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                            {doc.filename}
                          </p>
                          <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {doc.file_type}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1 rounded text-red-500 hover:bg-red-500/20"
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
      case 'help':
        return (
          <div className="h-full overflow-y-auto p-4 pb-20">
            <div className="max-w-md mx-auto space-y-6">
              <h2 className={`text-xl font-black ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                Help & Support
              </h2>

              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    Getting Started
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    1. Upload documents using the Documents tab<br/>
                    2. Create classes to organize your content<br/>
                    3. Start chatting with your documents<br/>
                    4. Use citations to verify information
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    Supported File Types
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    • PDF (.pdf)<br/>
                    • Microsoft Word (.docx)<br/>
                    • Plain Text (.txt)<br/>
                    • Markdown (.md)
                  </p>
                </div>

                <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <h3 className={`font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    Tips
                  </h3>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    • Use specific questions for better results<br/>
                    • Organize documents into relevant classes<br/>
                    • Check citations for source verification<br/>
                    • Try the background mode with /background
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="h-full overflow-y-auto p-4 pb-20">
            <div className="max-w-md mx-auto space-y-6">
              <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                Settings
              </h2>

              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                        Theme
                      </h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                      </p>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        theme === 'dark'
                          ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                          : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'
                      }`}
                    >
                      Toggle
                    </button>
                  </div>
                </div>

                <div className={`p-4 rounded-lg border ${
                  theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                        Account
                      </h3>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
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

      {/* Theme Toggle with hover area */}
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

        {/* Mobile Bottom Navigation */}
        <div className={`fixed bottom-0 left-0 right-0 border-t ${
          theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex justify-around py-2">
            {[
              { page: 'home', icon: Home, label: 'Home' },
              { page: 'chat', icon: MessageSquare, label: 'Chat' },
              { page: 'docs', icon: Upload, label: 'Docs' },
              { page: 'help', icon: HelpCircle, label: 'Help' },
              { page: 'settings', icon: Settings, label: 'Settings' },
            ].map(({ page, icon: Icon, label }) => (
              <button
                key={page}
                onClick={() => setMobilePage(page as any)}
                className={`flex flex-col items-center p-2 transition-colors ${
                  mobilePage === page
                    ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    : theme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs mt-1">{label}</span>
              </button>
            ))}
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