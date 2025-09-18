import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Menu, MessageSquare, Home, Upload, Settings, Trophy, Plus, Book, Edit, GraduationCap, Briefcase, Beaker, Heart, Code, MoreHorizontal, Trash2, Check, X } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { Sidebar } from './components/Sidebar';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { LoginPage } from './components/LoginPage';
import { ThemeToggle } from './components/ThemeToggle';
import { SettingsModal } from './components/SettingsModal';
import { apiService } from './services/api';
import { Message, DomainType, Document, UserDomain } from './types';

const DOMAIN_TYPE_INFO = {
  [DomainType.GENERAL]: { icon: Home, label: 'General', color: 'blue' },
  [DomainType.LAW]: { icon: Book, label: 'Law', color: 'amber' },
  [DomainType.SCIENCE]: { icon: Beaker, label: 'Science', color: 'green' },
  [DomainType.MEDICINE]: { icon: Heart, label: 'Medicine', color: 'red' },
  [DomainType.BUSINESS]: { icon: Briefcase, label: 'Business', color: 'purple' },
  [DomainType.HUMANITIES]: { icon: GraduationCap, label: 'Humanities', color: 'pink' },
  [DomainType.COMPUTER_SCIENCE]: { icon: Code, label: 'Computer Science', color: 'cyan' },
};

const AppContent: React.FC = () => {
  const { theme, themeMode, toggleTheme, getBackgroundClass } = useTheme();
  const { user, login, signUp, refreshUser, isAuthenticated, loading } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [userDomains, setUserDomains] = useState<UserDomain[]>([]);
  const [activeDomain, setActiveDomain] = useState<UserDomain | null>(null);
  const [domainChatHistory, setDomainChatHistory] = useState<Record<string, Message[]>>({});
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sessionId, setSessionId] = useState<string>(() => 
    Math.random().toString(36).substring(2) + Date.now().toString(36)
  );
  const [currentBackendSessionId, setCurrentBackendSessionId] = useState<string | null>(() => {
    return localStorage.getItem('currentBackendSessionId');
  });
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [backgroundCommandCount, setBackgroundCommandCount] = useState(1);
  const [mobilePage, setMobilePage] = useState<'chat' | 'home' | 'docs' | 'achievements' | 'settings'>('home');
  const [showMobileClassForm, setShowMobileClassForm] = useState(false);
  const [editingMobileDomain, setEditingMobileDomain] = useState<UserDomain | null>(null);
  const [mobileClassFormData, setMobileClassFormData] = useState({ name: '', type: DomainType.GENERAL, description: '' });
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themeToggleVisible, setThemeToggleVisible] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [previewSession, setPreviewSession] = useState<any>(null); // Temporary session preview
  const [sessionMessageCache, setSessionMessageCache] = useState<Record<string, Message[]>>(() => {
    const cached = localStorage.getItem('sessionMessageCache');
    return cached ? JSON.parse(cached) : {};
  }); // Cache messages for each session
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docEditName, setDocEditName] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionEditName, setSessionEditName] = useState('');

  // Load initial data
  const loadDocuments = useCallback(async () => {
    try {
      console.log('Loading documents from database collection...');
      const docs = await apiService.getDocuments('database');
      console.log('Loaded documents:', docs);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
      setDocuments([]);
    }
  }, []);

  const loadUserDomains = useCallback(async () => {
    // Load domains from localStorage or start with empty array
    const savedDomains = localStorage.getItem('userDomains');
    const domains: UserDomain[] = savedDomains ? JSON.parse(savedDomains) : [];

    setUserDomains(domains);
    if (!activeDomain && domains.length > 0) {
      setActiveDomain(domains[0]);
    }
  }, [activeDomain]);

  const loadSessions = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const userSessions = await apiService.getSessions();
      setSessions(userSessions || []);
      console.log('Loaded sessions:', userSessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setSessions([]);
    }
  }, [isAuthenticated]);

  const checkApiHealth = useCallback(async () => {
    try {
      await apiService.health();
      setApiError(null);
    } catch (error) {
      setApiError('Cannot connect to API. Please check if the backend is running.');
    }
  }, []);

  useEffect(() => {
    checkApiHealth();
    loadDocuments();
    loadUserDomains();
    loadSessions();
  }, [checkApiHealth, loadDocuments, loadUserDomains, loadSessions]);

  // Separate useEffect for restoring messages to avoid dependency loop
  useEffect(() => {
    if (currentBackendSessionId) {
      const cachedMessages = sessionMessageCache[currentBackendSessionId];
      if (cachedMessages && cachedMessages.length > 0) {
        setMessages(cachedMessages);
      }
    }
  }, [currentBackendSessionId]); // Only depend on session ID, not the cache

  // Auto-hide theme toggle after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setThemeToggleVisible(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Auto-delete empty sessions when clicking outside chat area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const chatArea = document.querySelector('[data-chat-area]');
      const sidebar = document.querySelector('[data-sidebar]');

      // If clicking outside both chat area and sidebar, and we have an empty session
      if (sessionId && messages.length === 0 && chatArea && sidebar) {
        const isClickOutsideChatAndSidebar = !chatArea.contains(target) && !sidebar.contains(target);

        if (isClickOutsideChatAndSidebar) {
          // Auto-delete the empty session
          console.log(`🗑️ Auto-deleting empty session due to outside click: ${sessionId}`);

          // Remove from preview session if it exists
          if (previewSession && previewSession.id === sessionId) {
            setPreviewSession(null);
          }

          // If it's a backend session, delete it from the server
          if (currentBackendSessionId === sessionId) {
            apiService.deleteSession(sessionId)
              .then(() => loadSessions())
              .catch(error => console.error('Failed to delete empty session:', error));
          }

          // Clear from cache
          setSessionMessageCache(prev => {
            const newCache = { ...prev };
            delete newCache[sessionId];
            return newCache;
          });

          // Create a new session
          const newSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
          setSessionId(newSessionId);
          setCurrentBackendSessionId(null);
          setMessages([]);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sessionId, messages.length, previewSession, currentBackendSessionId]);

  // Clear preview session when navigating away from chat page without sending a message
  // Only clear if user actually navigates away AND stays away for a significant time
  useEffect(() => {
    // Temporarily disabled auto-clearing to debug the disappearing preview session issue
    // if (mobilePage !== 'chat' && previewSession && messages.length === 0) {
    //   const timer = setTimeout(() => {
    //     // Only clear if still not on chat page and no messages sent
    //     if (mobilePage !== 'chat' && messages.length === 0) {
    //       clearPreviewSession();
    //     }
    //   }, 3000); // Longer delay to prevent accidental clearing

    //   return () => clearTimeout(timer);
    // }
  }, [mobilePage, previewSession, messages.length]);

  // Reset timer when toggle becomes visible again
  useEffect(() => {
    if (themeToggleVisible) {
      const timer = setTimeout(() => {
        setThemeToggleVisible(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [themeToggleVisible]);

  // Save session message cache to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sessionMessageCache', JSON.stringify(sessionMessageCache));
  }, [sessionMessageCache]);

  // Save current session ID to localStorage
  useEffect(() => {
    if (currentBackendSessionId) {
      localStorage.setItem('currentBackendSessionId', currentBackendSessionId);
    } else {
      localStorage.removeItem('currentBackendSessionId');
    }
  }, [currentBackendSessionId]);

  // Helper functions
  const formatDomainName = (domain: string) => {
    const domainMap: Record<string, string> = {
      'general': 'General',
      'law': 'Law',
      'science': 'Science',
      'medicine': 'Medicine',
      'business': 'Business',
      'humanities': 'Humanities',
      'computer_science': 'Computer Science'
    };
    return domainMap[domain] || domain.charAt(0).toUpperCase() + domain.slice(1).replace('_', ' ');
  };

  const getUserTimezone = () => {
    return localStorage.getItem('userTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  const formatLocalDateTime = (dateString: string | Date) => {
    try {
      const date = new Date(dateString);
      const timezone = getUserTimezone();
      return date.toLocaleDateString('en-US', { timeZone: timezone }) + ' ' +
             date.toLocaleTimeString('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Invalid date';
    }
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

    // Auto-create a new backend session if this is the first message and we don't have an active session
    let effectiveSessionId = sessionId;
    if (!currentBackendSessionId && messages.length === 0) {
      try {
        const newSession = await apiService.createSession(
          undefined,
          activeDomain?.type || DomainType.GENERAL,
          activeDomain?.id,
          activeDomain?.name || 'General'
        );
        const newBackendSessionId = newSession.id;
        setCurrentBackendSessionId(newBackendSessionId);
        setSessionId(newBackendSessionId);
        effectiveSessionId = newBackendSessionId;

        // Update the preview session with the real session ID if it exists
        if (previewSession && previewSession.id === sessionId) {
          setPreviewSession({
            ...previewSession,
            id: newBackendSessionId,
            isPreview: false // No longer a preview, it's a real session
          });
        }
      } catch (error) {
        console.error('Failed to create new session:', error);
        // Continue with the current sessionId as fallback
      }
    } else {
      // Clear preview session when user sends a message to an existing session
      if (previewSession) {
        setPreviewSession(null);
      }
    }

    const userMessage: Message = { role: 'user', content };
    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      // Update domain-specific history
      if (activeDomain) {
        setDomainChatHistory(prevHistory => ({
          ...prevHistory,
          [activeDomain.id]: newMessages
        }));
      }
      // Update session message cache
      if (effectiveSessionId) {
        setSessionMessageCache(prevCache => ({
          ...prevCache,
          [effectiveSessionId]: newMessages
        }));
      }
      return newMessages;
    });
    setIsChatLoading(true);

    try {
      const response = await apiService.chat({
        query: content,
        domain: activeDomain?.type || DomainType.GENERAL,
        session_id: effectiveSessionId,
        selected_documents: selectedDocuments,
        active_class: activeDomain?.id || 'default',
        user_context: user ? {
          name: user.name,
          bio: user.profile?.bio || null,
          research_interests: user.profile?.research_interests || [],
          preferred_domains: user.profile?.preferred_domains || []
        } : null,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.answer,
        citations: response.citations,
      };

      setMessages(prev => {
        const newMessages = [...prev, assistantMessage];
        // Update domain-specific history
        if (activeDomain) {
          setDomainChatHistory(prevHistory => ({
            ...prevHistory,
            [activeDomain.id]: newMessages
          }));
        }
        // Update session message cache
        if (effectiveSessionId) {
          setSessionMessageCache(prevCache => ({
            ...prevCache,
            [effectiveSessionId]: newMessages
          }));
        }
        return newMessages;
      });

      // Refresh user data to update achievements in real-time
      if (user && refreshUser) {
        refreshUser().catch(error => console.error('Failed to refresh user:', error));
      }

      // Refresh sessions list to show new/updated sessions with updated message counts
      await loadSessions().catch(error => console.error('Failed to refresh sessions:', error));

      // Update the preview session to show correct message count if it's now a real session
      if (previewSession && previewSession.id === effectiveSessionId) {
        setPreviewSession((prev: any) => prev ? {
          ...prev,
          message_count: messages.length + 2, // +1 for user message, +1 for assistant response
          preview: userMessage.content,
          isPreview: false
        } : null);
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
      };
      setMessages(prev => {
        const newMessages = [...prev, errorMessage];
        // Update domain-specific history
        if (activeDomain) {
          setDomainChatHistory(prevHistory => ({
            ...prevHistory,
            [activeDomain.id]: newMessages
          }));
        }
        return newMessages;
      });
    } finally {
      setIsChatLoading(false);
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
      
      // Refresh user data to update achievements
      if (user && refreshUser) {
        refreshUser().catch(error => console.error('Failed to refresh user after upload:', error));
      }
      
      // Auto-assign the uploaded document to the current active domain
      if (activeDomain && uploadResponse?.id) {
        const currentDocuments = activeDomain.documents || [];
        await handleAssignDocuments(activeDomain.id, [...currentDocuments, uploadResponse.id]);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDocumentLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    const document = documents.find(doc => doc.id === documentId);
    const documentName = document?.filename || documentId;
    
    if (!window.confirm(`Are you sure you want to delete "${documentName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      console.log('Attempting to delete document:', documentId);
      await apiService.deleteDocument('default', documentId);
      console.log('Delete successful, refreshing documents...');
      await loadDocuments();
      console.log('Documents refreshed after delete');
    } catch (error) {
      console.error('Delete failed:', error);
      alert(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleReindexCollection = async () => {
    setIsDocumentLoading(true);
    try {
      await apiService.reindexCollection('default');
      await loadDocuments();
    } catch (error) {
      console.error('Reindex failed:', error);
    } finally {
      setIsDocumentLoading(false);
    }
  };

  const handleCreateDomain = async (name: string, type: DomainType, description?: string, selectedDocuments?: string[]) => {
    // Create domain locally first
    const newDomain: UserDomain = {
      id: `domain-${Date.now()}`,
      name,
      type,
      documents: selectedDocuments || [],
      created_at: new Date().toISOString(),
      description
    };

    setUserDomains(prev => {
      const newDomains = [newDomain, ...prev];
      localStorage.setItem('userDomains', JSON.stringify(newDomains));
      return newDomains;
    });

    // Auto-select the newly created domain
    handleSelectDomain(newDomain);

    try {
      // If documents are selected, transfer and process them immediately
      if (selectedDocuments && selectedDocuments.length > 0) {
        console.log(`Processing ${selectedDocuments.length} documents for new class: ${newDomain.name} (${newDomain.id})`);
        await apiService.transferDocuments(newDomain.id, selectedDocuments);
        console.log('Documents successfully processed for new class');
      } else {
        // Initialize empty vector store for the new class
        console.log(`Initializing empty vector store for class: ${newDomain.name} (${newDomain.id})`);
        await apiService.reindexCollection(newDomain.id);
        console.log('Empty vector store initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize class:', error);
      // Don't show error for initialization, as the class can still work
      console.log('Class created locally, vector store will be created when documents are uploaded');
    }
  };

  const handleEditDomain = (domainId: string, name: string, type: DomainType, description?: string) => {
    setUserDomains(prev => {
      const newDomains = prev.map(domain => 
        domain.id === domainId 
          ? { ...domain, name, type, description }
          : domain
      );
      localStorage.setItem('userDomains', JSON.stringify(newDomains));
      return newDomains;
    });
  };

  const handleSelectDomain = (domain: UserDomain) => {
    // Save current domain's messages
    if (activeDomain) {
      setDomainChatHistory(prev => ({
        ...prev,
        [activeDomain.id]: messages
      }));
    }

    // Switch to new domain
    setActiveDomain(domain);

    // Select all documents in this class by default
    setSelectedDocuments(domain.documents || []);

    // Start fresh when selecting a class - clear current session
    setCurrentBackendSessionId(null);
    setMessages([]);

    // Generate a new session ID for the new chat that will be created when user types
    const newSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    setSessionId(newSessionId);
  };

  const handleDeleteDomain = async (domainId: string) => {
    const domain = userDomains.find(d => d.id === domainId);
    const domainName = domain?.name || domainId;

    if (!window.confirm(`Are you sure you want to delete the class "${domainName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete all sessions associated with this class
      await apiService.deleteSessionsByClass(domainId);
      console.log(`Deleted all sessions for class: ${domainName}`);
    } catch (error) {
      console.error('Failed to delete sessions for class:', error);
      // Continue with local deletion even if backend fails
    }

    setUserDomains(prev => {
      const newDomains = prev.filter(d => d.id !== domainId);
      localStorage.setItem('userDomains', JSON.stringify(newDomains));
      return newDomains;
    });

    // Remove sessions from local state that belong to this class
    setSessions(prev => prev.filter(session =>
      session.class_id !== domainId && session.class_name !== domainName
    ));

    if (activeDomain?.id === domainId) {
      const remainingDomains = userDomains.filter(d => d.id !== domainId);
      setActiveDomain(remainingDomains[0] || null);
      setMessages([]);
    }
  };

  const handleAssignDocuments = async (domainId: string, documentIds: string[]) => {
    try {
      // Get the domain to transfer documents to its vector store
      const domain = userDomains.find(d => d.id === domainId);
      if (!domain) {
        console.error('Domain not found:', domainId);
        return;
      }

      const currentDocuments = domain.documents || [];
      const newDocuments = documentIds.filter(id => !currentDocuments.includes(id));

      // If there are new documents to assign, transfer them to the class vector store
      if (newDocuments.length > 0) {
        console.log(`Transferring ${newDocuments.length} documents to class ${domain.name} (${domainId})`);

        try {
          // Use the dedicated transfer endpoint
          await apiService.transferDocuments(domainId, newDocuments);

          console.log('Documents successfully transferred to class vector store');
        } catch (error) {
          console.error('Failed to transfer documents:', error);
          throw error;
        }
      }

      // Update the local domain state
      setUserDomains(prev => {
        const newDomains = prev.map(d =>
          d.id === domainId
            ? { ...d, documents: documentIds }
            : d
        );
        localStorage.setItem('userDomains', JSON.stringify(newDomains));
        return newDomains;
      });

    } catch (error) {
      console.error('Failed to assign documents to class:', error);
      alert(`Failed to assign documents to class: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    // Clear history for current domain
    if (activeDomain) {
      setDomainChatHistory(prev => ({
        ...prev,
        [activeDomain.id]: []
      }));
    }
  };

  const clearPreviewSession = () => {
    setPreviewSession(null);
  };

  const handleRenameSession = async (sessionId: string, newName: string) => {
    try {
      console.log(`🔄 Renaming session ${sessionId} to: "${newName}"`);
      await apiService.updateSession(sessionId, newName);
      console.log(`✅ Session renamed successfully`);
      await loadSessions();
      console.log(`✅ Sessions reloaded after rename`);
    } catch (error) {
      console.error('❌ Failed to rename session:', error);
      throw error; // Re-throw so Sidebar can handle the error
    }
  };


  const handleDeleteSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    const sessionName = session?.name || 'Untitled Chat';

    if (!window.confirm(`Delete "${sessionName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiService.deleteSession(sessionId);
      await loadSessions();

      // If deleting current session, switch to a new one
      if (currentBackendSessionId === sessionId) {
        handleNewSession();
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete chat');
    }
  };

  const handleEditDocumentName = async (docId: string, newName: string) => {
    try {
      await apiService.updateDocumentName(docId, newName);
      await loadDocuments();
      setEditingDocId(null);
      setDocEditName('');
    } catch (error) {
      console.error('Failed to update document name:', error);
      alert('Failed to update document name');
    }
  };

  const handleNewSession = () => {
    const newSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    setSessionId(newSessionId);
    setCurrentBackendSessionId(null);  // Clear current session - new one will be created on first message
    setMessages([]);
    // Clear all domain histories for new session
    setDomainChatHistory({});

    // Create a temporary preview session that appears in the session list
    const tempSession = {
      id: newSessionId,
      name: 'New Chat',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
      preview: null,
      class_name: activeDomain?.name || 'General',
      isPreview: true // Flag to identify this as a preview session
    };
    setPreviewSession(tempSession);
  };

  const handleSelectSession = async (newSessionId: string) => {
    // Auto-delete empty sessions when switching away
    if (sessionId && messages.length === 0) {
      console.log(`🗑️ Auto-deleting empty session: ${sessionId}`);

      // Remove from preview session if it exists
      if (previewSession && previewSession.id === sessionId) {
        setPreviewSession(null);
      }

      // If it's a backend session, delete it from the server
      if (currentBackendSessionId === sessionId) {
        try {
          await apiService.deleteSession(sessionId);
          await loadSessions(); // Refresh the session list
        } catch (error) {
          console.error('Failed to delete empty session:', error);
        }
      }

      // Clear from cache
      setSessionMessageCache(prev => {
        const newCache = { ...prev };
        delete newCache[sessionId];
        return newCache;
      });
    }

    // Save current session messages to cache before switching
    if (sessionId && messages.length > 0) {
      setSessionMessageCache(prev => ({
        ...prev,
        [sessionId]: messages
      }));
    }

    // Check if this is a preview session
    if (previewSession && previewSession.id === newSessionId) {
      // Switch to preview session
      setSessionId(newSessionId);
      setCurrentBackendSessionId(null);

      // Load cached messages for this session if they exist
      const cachedMessages = sessionMessageCache[newSessionId] || [];
      setMessages(cachedMessages);
      setDomainChatHistory({});
      return;
    }

    try {
      // Check if we have cached messages for this session first
      const cachedMessages = sessionMessageCache[newSessionId];

      if (cachedMessages) {
        // Use cached messages instead of fetching from backend
        setSessionId(newSessionId);
        setCurrentBackendSessionId(newSessionId);
        setMessages(cachedMessages);
        setDomainChatHistory({});
        return;
      }

      // Load session data from backend only if not cached
      const sessionData = await apiService.getSession(newSessionId);

      // Set the new session ID
      setSessionId(newSessionId);
      setCurrentBackendSessionId(newSessionId);

      // Convert session messages to our Message format
      const sessionMessages = sessionData.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        citations: msg.citations || []
      }));

      setMessages(sessionMessages);

      // Cache the loaded messages
      setSessionMessageCache(prev => ({
        ...prev,
        [newSessionId]: sessionMessages
      }));

      // Restore the domain context from the session
      if (sessionData.class_id) {
        // Find the specific class/domain that was used in this session
        const sessionDomain = userDomains.find(domain => domain.id === sessionData.class_id);
        if (sessionDomain) {
          setActiveDomain(sessionDomain);
        } else {
          // Fallback to finding by class_name if ID not found
          const sessionDomainByName = userDomains.find(domain => domain.name === sessionData.class_name);
          if (sessionDomainByName) {
            setActiveDomain(sessionDomainByName);
          }
        }
      } else {
        // If session is General or no class info, set to General domain
        const generalDomain = userDomains.find(domain => domain.type === DomainType.GENERAL);
        if (generalDomain) {
          setActiveDomain(generalDomain);
        }
      }

      // Clear domain histories as we're switching to a different session
      setDomainChatHistory({});

    } catch (error) {
      console.error('Failed to load session:', error);
      // Fallback to creating a new session
      setSessionId(newSessionId);
      setMessages([]);
      setDomainChatHistory({});
    }
  };

  // Mobile class form helpers
  const resetMobileClassForm = () => {
    setMobileClassFormData({ name: '', type: DomainType.GENERAL, description: '' });
    setSelectedDocuments([]);
    setShowMobileClassForm(false);
    setEditingMobileDomain(null);
  };

  const handleMobileCreateClass = async () => {
    if (mobileClassFormData.name.trim()) {
      if (editingMobileDomain) {
        handleEditDomain(editingMobileDomain.id, mobileClassFormData.name.trim(), mobileClassFormData.type, mobileClassFormData.description.trim() || undefined);
        if (selectedDocuments.length > 0) {
          await handleAssignDocuments(editingMobileDomain.id, selectedDocuments);
        }
      } else {
        // Pass selected documents directly to handleCreateDomain
        await handleCreateDomain(
          mobileClassFormData.name.trim(),
          mobileClassFormData.type,
          mobileClassFormData.description.trim() || undefined,
          selectedDocuments.length > 0 ? selectedDocuments : undefined
        );
      }
      resetMobileClassForm();
    }
  };

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocuments(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  // Mobile class form component
  const renderMobileClassForm = (isEditing: boolean = false) => (
    <div className={`mb-4 p-3 rounded-lg border ${
      theme === 'dark'
        ? 'bg-white/5 border-white/20'
        : 'bg-black/5 border-black/20'
    }`}>
      <div className="space-y-3">
        <input
          type="text"
          value={mobileClassFormData.name}
          onChange={(e) => setMobileClassFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Class name (e.g., History 101)"
          className={`w-full border rounded-lg px-3 py-2 text-sm ${
            theme === 'dark'
              ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
              : 'bg-black/10 border-black/20 text-black placeholder-black/50'
          }`}
        />

        <div className="grid grid-cols-3 gap-1">
          {Object.entries({
            [DomainType.GENERAL]: { icon: Home, label: 'General' },
            [DomainType.LAW]: { icon: Book, label: 'Law' },
            [DomainType.SCIENCE]: { icon: Beaker, label: 'Science' },
            [DomainType.MEDICINE]: { icon: Heart, label: 'Medicine' },
            [DomainType.BUSINESS]: { icon: Briefcase, label: 'Business' },
            [DomainType.COMPUTER_SCIENCE]: { icon: Code, label: 'Tech' },
          }).map(([type, info]) => {
            const Icon = info.icon;
            return (
              <button
                key={type}
                onClick={() => setMobileClassFormData(prev => ({ ...prev, type: type as DomainType }))}
                className={`p-2 rounded text-xs transition-all duration-200 flex flex-col items-center space-y-1 ${
                  mobileClassFormData.type === type
                    ? theme === 'dark'
                      ? 'bg-white/20 text-white'
                      : 'bg-black/20 text-black'
                    : theme === 'dark'
                      ? 'bg-white/5 text-white/70 hover:bg-white/10'
                      : 'bg-black/5 text-black/70 hover:bg-black/10'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{info.label}</span>
              </button>
            );
          })}
        </div>

        {/* Document Selection */}
        {documents.length > 0 && (
          <div>
            <label className={`block text-xs font-medium mb-2 ${
              theme === 'dark' ? 'text-white/80' : 'text-black/80'
            }`}>
              Assign Documents (Optional)
            </label>
            <div className={`max-h-32 overflow-y-auto space-y-1 rounded-lg p-2 border ${
              theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
            }`}>
              {documents.map(doc => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => toggleDocumentSelection(doc.id)}
                  className={`w-full text-left p-2 rounded text-xs flex items-center justify-between transition-colors ${
                    selectedDocuments.includes(doc.id)
                      ? theme === 'dark'
                        ? 'bg-white/15 text-white'
                        : 'bg-black/15 text-black'
                      : theme === 'dark'
                        ? 'text-white/70 hover:bg-white/10'
                        : 'text-black/70 hover:bg-black/10'
                  }`}
                >
                  <span className="truncate">{doc.filename}</span>
                  {selectedDocuments.includes(doc.id) && (
                    <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></div>
                  )}
                </button>
              ))}
            </div>
            {selectedDocuments.length > 0 && (
              <div className={`text-xs mt-1 ${
                theme === 'dark' ? 'text-white/60' : 'text-black/60'
              }`}>
                {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>
        )}

        <div className="flex space-x-2">
          <button
            onClick={handleMobileCreateClass}
            disabled={!mobileClassFormData.name.trim()}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 rounded-lg transition-all duration-200 disabled:opacity-50 text-sm"
          >
            {editingMobileDomain ? 'Update Class' : 'Create Class'}
          </button>
          <button
            onClick={resetMobileClassForm}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              theme === 'dark'
                ? 'text-white/60 hover:text-white/80 hover:bg-white/10'
                : 'text-black/60 hover:text-black/80 hover:bg-black/10'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const renderMobilePage = () => {
    switch (mobilePage) {
      case 'chat':
        return (
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            currentDomain={activeDomain?.type || DomainType.GENERAL}
            activeCollection="default"
            userName={user?.name || 'User'}
            sidebarOpen={sidebarOpen}
          />
        );
      case 'home':
        return (
          <div className="h-full overflow-y-auto p-4">
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center">
                <h1 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  🤠 YEEHAW! Welcome to RAG Scholar 🤠
                </h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                  Your AI study buddy - NOW ON NEW PROJECT!
                </p>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    handleNewSession();
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
                    Start Chat
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
                    Upload Docs
                  </span>
                </button>
              </div>

              {/* My Classes Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    My Classes
                  </h2>
                  <button
                    onClick={() => {
                      setShowMobileClassForm(true);
                      setEditingMobileDomain(null);
                      setMobileClassFormData({ name: '', type: DomainType.GENERAL, description: '' });
                      setSelectedDocuments([]);
                    }}
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${
                      theme === 'dark'
                        ? 'bg-white/10 hover:bg-white/20 text-white/80'
                        : 'bg-black/10 hover:bg-black/20 text-black/80'
                    }`}
                  >
                    + New
                  </button>
                </div>

                {/* Create New Class Form - Only show when not editing */}
                {showMobileClassForm && !editingMobileDomain && (
                  <div className={`mb-4 p-3 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/20'
                      : 'bg-black/5 border-black/20'
                  }`}>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={mobileClassFormData.name}
                        onChange={(e) => setMobileClassFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Class name (e.g., History 101)"
                        className={`w-full border rounded-lg px-3 py-2 text-sm ${
                          theme === 'dark'
                            ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                            : 'bg-black/10 border-black/20 text-black placeholder-black/50'
                        }`}
                      />

                      <div className="grid grid-cols-3 gap-1">
                        {Object.entries({
                          [DomainType.GENERAL]: { icon: Home, label: 'General' },
                          [DomainType.LAW]: { icon: Book, label: 'Law' },
                          [DomainType.SCIENCE]: { icon: Beaker, label: 'Science' },
                          [DomainType.MEDICINE]: { icon: Heart, label: 'Medicine' },
                          [DomainType.BUSINESS]: { icon: Briefcase, label: 'Business' },
                          [DomainType.COMPUTER_SCIENCE]: { icon: Code, label: 'Tech' },
                        }).map(([type, info]) => {
                          const Icon = info.icon;
                          return (
                            <button
                              key={type}
                              onClick={() => setMobileClassFormData(prev => ({ ...prev, type: type as DomainType }))}
                              className={`p-2 rounded text-xs transition-all duration-200 flex flex-col items-center space-y-1 ${
                                mobileClassFormData.type === type
                                  ? theme === 'dark'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-black/20 text-black'
                                  : theme === 'dark'
                                    ? 'bg-white/5 text-white/70 hover:bg-white/10'
                                    : 'bg-black/5 text-black/70 hover:bg-black/10'
                              }`}
                            >
                              <Icon className="w-3 h-3" />
                              <span>{info.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Document Selection */}
                      {documents.length > 0 && (
                        <div>
                          <label className={`block text-xs font-medium mb-2 ${
                            theme === 'dark' ? 'text-white/80' : 'text-black/80'
                          }`}>
                            Assign Documents (Optional)
                          </label>
                          <div className={`max-h-32 overflow-y-auto space-y-1 rounded-lg p-2 border ${
                            theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
                          }`}>
                            {documents.map(doc => (
                              <button
                                key={doc.id}
                                type="button"
                                onClick={() => toggleDocumentSelection(doc.id)}
                                className={`w-full text-left p-2 rounded text-xs flex items-center justify-between transition-colors ${
                                  selectedDocuments.includes(doc.id)
                                    ? theme === 'dark'
                                      ? 'bg-white/15 text-white'
                                      : 'bg-black/15 text-black'
                                    : theme === 'dark'
                                      ? 'text-white/70 hover:bg-white/10'
                                      : 'text-black/70 hover:bg-black/10'
                                }`}
                              >
                                <span className="truncate">{doc.filename}</span>
                                {selectedDocuments.includes(doc.id) && (
                                  <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></div>
                                )}
                              </button>
                            ))}
                          </div>
                          {selectedDocuments.length > 0 && (
                            <div className={`text-xs mt-1 ${
                              theme === 'dark' ? 'text-white/60' : 'text-black/60'
                            }`}>
                              {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <button
                          onClick={handleMobileCreateClass}
                          disabled={!mobileClassFormData.name.trim()}
                          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 rounded-lg transition-all duration-200 disabled:opacity-50 text-sm"
                        >
                          Create Class
                        </button>
                        <button
                          onClick={resetMobileClassForm}
                          className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                            theme === 'dark'
                              ? 'text-white/60 hover:text-white/80 hover:bg-white/10'
                              : 'text-black/60 hover:text-black/80 hover:bg-black/10'
                          }`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {userDomains.length === 0 ? (
                  <button
                    onClick={() => {
                      setShowMobileClassForm(true);
                      setEditingMobileDomain(null);
                      setMobileClassFormData({ name: '', type: DomainType.GENERAL, description: '' });
                    }}
                    className={`w-full p-4 rounded-lg border-2 border-dashed transition-colors ${
                      theme === 'dark'
                        ? 'border-white/20 hover:border-white/40 bg-white/5'
                        : 'border-black/20 hover:border-black/40 bg-black/5'
                    }`}
                  >
                    <Plus className={`w-6 h-6 mx-auto mb-2 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`} />
                    <span className={`text-sm ${theme === 'dark' ? 'text-white/80' : 'text-black/80'}`}>
                      Create Your First Class
                    </span>
                  </button>
                ) : (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-none">
                    {userDomains.slice(0, 5).map((domain) => (
                      <div key={domain.id}>
                        <div
                          className={`w-full p-3 rounded-lg transition-all ${
                            activeDomain?.id === domain.id
                              ? theme === 'dark'
                                ? 'bg-white/15 border border-white/20'
                                : 'bg-black/15 border border-black/20'
                              : theme === 'dark'
                                ? 'bg-white/5 hover:bg-white/10 border border-transparent'
                                : 'bg-black/5 hover:bg-black/10 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => {
                                handleSelectDomain(domain);
                              }}
                              className="flex-1 text-left"
                            >
                              <div>
                                <h3 className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                                  {domain.name}
                                </h3>
                                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                                  {domain.type} • {domain.documents?.length || 0} docs
                                </p>
                              </div>
                            </button>
                            <div className="flex items-center gap-2 ml-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingMobileDomain(domain);
                                  setMobileClassFormData({
                                    name: domain.name,
                                    type: domain.type,
                                    description: domain.description || ''
                                  });
                                  setSelectedDocuments(domain.documents || []);
                                  setShowMobileClassForm(true);
                                }}
                                className={`p-1 rounded transition-colors ${
                                  theme === 'dark'
                                    ? 'hover:bg-white/10 text-white/60 hover:text-white/80'
                                    : 'hover:bg-black/10 text-black/60 hover:text-black/80'
                                }`}
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDomain(domain.id);
                                }}
                                className={`p-1 rounded transition-colors ${
                                  theme === 'dark'
                                    ? 'hover:bg-red-400/20 text-white/60 hover:text-red-400'
                                    : 'hover:bg-red-400/20 text-black/60 hover:text-red-600'
                                }`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                              <MessageSquare className={`w-4 h-4 ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`} />
                            </div>
                          </div>
                        </div>

                        {/* Edit Form - Show below the specific class being edited */}
                        {editingMobileDomain?.id === domain.id && showMobileClassForm && (
                          <div className={`mt-2 p-3 rounded-lg border ${
                            theme === 'dark'
                              ? 'bg-white/5 border-white/20'
                              : 'bg-black/5 border-black/20'
                          }`}>
                            <div className="space-y-3">
                              <input
                                type="text"
                                value={mobileClassFormData.name}
                                onChange={(e) => setMobileClassFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Class name (e.g., History 101)"
                                className={`w-full border rounded-lg px-3 py-2 text-sm ${
                                  theme === 'dark'
                                    ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                                    : 'bg-black/10 border-black/20 text-black placeholder-black/50'
                                }`}
                              />

                              <div className="grid grid-cols-3 gap-1">
                                {Object.entries({
                                  [DomainType.GENERAL]: { icon: Home, label: 'General' },
                                  [DomainType.LAW]: { icon: Book, label: 'Law' },
                                  [DomainType.SCIENCE]: { icon: Beaker, label: 'Science' },
                                  [DomainType.MEDICINE]: { icon: Heart, label: 'Medicine' },
                                  [DomainType.BUSINESS]: { icon: Briefcase, label: 'Business' },
                                  [DomainType.COMPUTER_SCIENCE]: { icon: Code, label: 'Tech' },
                                }).map(([type, info]) => {
                                  const Icon = info.icon;
                                  return (
                                    <button
                                      key={type}
                                      onClick={() => setMobileClassFormData(prev => ({ ...prev, type: type as DomainType }))}
                                      className={`p-2 rounded text-xs transition-all duration-200 flex flex-col items-center space-y-1 ${
                                        mobileClassFormData.type === type
                                          ? theme === 'dark'
                                            ? 'bg-white/20 text-white'
                                            : 'bg-black/20 text-black'
                                          : theme === 'dark'
                                            ? 'bg-white/5 text-white/70 hover:bg-white/10'
                                            : 'bg-black/5 text-black/70 hover:bg-black/10'
                                      }`}
                                    >
                                      <Icon className="w-3 h-3" />
                                      <span>{info.label}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Document Selection */}
                              {documents.length > 0 && (
                                <div>
                                  <label className={`block text-xs font-medium mb-2 ${
                                    theme === 'dark' ? 'text-white/80' : 'text-black/80'
                                  }`}>
                                    Assign Documents (Optional)
                                  </label>
                                  <div className={`max-h-32 overflow-y-auto space-y-1 rounded-lg p-2 border ${
                                    theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
                                  }`}>
                                    {documents.map(doc => (
                                      <button
                                        key={doc.id}
                                        type="button"
                                        onClick={() => toggleDocumentSelection(doc.id)}
                                        className={`w-full text-left p-2 rounded text-xs flex items-center justify-between transition-colors ${
                                          selectedDocuments.includes(doc.id)
                                            ? theme === 'dark'
                                              ? 'bg-white/15 text-white'
                                              : 'bg-black/15 text-black'
                                            : theme === 'dark'
                                              ? 'text-white/70 hover:bg-white/10'
                                              : 'text-black/70 hover:bg-black/10'
                                        }`}
                                      >
                                        <span className="truncate">{doc.filename}</span>
                                        {selectedDocuments.includes(doc.id) && (
                                          <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></div>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                  {selectedDocuments.length > 0 && (
                                    <div className={`text-xs mt-1 ${
                                      theme === 'dark' ? 'text-white/60' : 'text-black/60'
                                    }`}>
                                      {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="flex space-x-2">
                                <button
                                  onClick={handleMobileCreateClass}
                                  disabled={!mobileClassFormData.name.trim()}
                                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 rounded-lg transition-all duration-200 disabled:opacity-50 text-sm"
                                >
                                  Update Class
                                </button>
                                <button
                                  onClick={resetMobileClassForm}
                                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                                    theme === 'dark'
                                      ? 'text-white/60 hover:text-white/80 hover:bg-white/10'
                                      : 'text-black/60 hover:text-black/80 hover:bg-black/10'
                                  }`}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {userDomains.length > 5 && (
                      <p className={`text-xs text-center py-2 ${theme === 'dark' ? 'text-white/50' : 'text-black/50'}`}>
                        +{userDomains.length - 5} more classes
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Recent Chats */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    Recent Chats
                  </h2>
                  <button
                    onClick={() => {
                      handleNewSession();
                      setMobilePage('chat');
                    }}
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${
                      theme === 'dark'
                        ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
                        : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-600'
                    }`}
                  >
                    + New
                  </button>
                </div>
                {(() => {
                  // Filter sessions by active domain (same logic as Sidebar)
                  const allSessions = previewSession ? [previewSession, ...sessions.filter(s => s.id !== previewSession.id)] : sessions;
                  const filteredSessions = activeDomain
                    ? allSessions.filter(session =>
                        session.class_name === activeDomain.name ||
                        session.class_id === activeDomain.id ||
                        session.domain === activeDomain.type
                      )
                    : allSessions;
                  return filteredSessions;
                })().length > 0 ? (
                  <div className="space-y-2 max-h-[70vh] overflow-y-auto scrollbar-none">
                    {(() => {
                      // Filter sessions by active domain (same logic as Sidebar)
                      const allSessions = previewSession ? [previewSession, ...sessions.filter(s => s.id !== previewSession.id)] : sessions;
                      const filteredSessions = activeDomain
                        ? allSessions.filter(session =>
                            session.class_name === activeDomain.name ||
                            session.class_id === activeDomain.id ||
                            session.domain === activeDomain.type
                          )
                        : allSessions;
                      return filteredSessions;
                    })().map((session) => (
                      <div key={session.id} className={`rounded-lg transition-all ${
                        session.isPreview
                          ? theme === 'dark'
                            ? 'bg-green-500/10 border border-green-500/20 ring-1 ring-green-500/30'
                            : 'bg-green-500/5 border border-green-500/15 ring-1 ring-green-500/20'
                          : currentBackendSessionId === session.id
                            ? theme === 'dark'
                              ? 'bg-blue-500/20 border border-blue-500/30'
                              : 'bg-blue-500/10 border border-blue-500/20'
                            : theme === 'dark'
                              ? 'bg-white/5 border border-transparent'
                              : 'bg-black/5 border border-transparent'
                      }`}>
                          <div className="flex items-center">
                            <button
                              onClick={async () => {
                                await handleSelectSession(session.id);
                                setMobilePage('chat');
                              }}
                              className="flex-1 p-3 text-left"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                {editingSessionId === session.id ? (
                                  <input
                                    type="text"
                                    value={sessionEditName}
                                    onChange={(e) => setSessionEditName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        if (sessionEditName.trim() && sessionEditName !== session.name) {
                                          handleRenameSession(session.id, sessionEditName.trim());
                                        }
                                        setEditingSessionId(null);
                                        setSessionEditName('');
                                      } else if (e.key === 'Escape') {
                                        setEditingSessionId(null);
                                        setSessionEditName('');
                                      }
                                    }}
                                    onBlur={() => {
                                      if (sessionEditName.trim() && sessionEditName !== session.name) {
                                        handleRenameSession(session.id, sessionEditName.trim());
                                      }
                                      setEditingSessionId(null);
                                      setSessionEditName('');
                                    }}
                                    className={`text-sm font-medium bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 -mx-1 ${theme === 'dark' ? 'text-white' : 'text-black'}`}
                                    autoFocus
                                  />
                                ) : (
                                  <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                                    {session.name || 'Untitled Chat'}
                                  </p>
                                )}
                                {session.isPreview && (
                                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">
                                    NEW
                                  </span>
                                )}
                              </div>
                              <p className={`text-xs truncate ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                                {session.isPreview ? 'Start typing to begin...' : (session.preview || 'No messages yet')}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`}>
                                  {getSessionMessageCount(session)} messages
                                </span>
                                <span className={`text-xs ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`}>•</span>
                                <span className={`text-xs ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`}>
                                  {session.class_name || formatDomainName(session.domain || 'general')}
                                </span>
                                {session.created_at && (
                                  <>
                                    <span className={`text-xs ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`}>•</span>
                                    <span className={`text-xs ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`}>
                                      {formatLocalDate(session.created_at)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </button>

                            {!session.isPreview && (
                              <div className="flex items-center gap-1 px-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSessionId(session.id);
                                    setSessionEditName(session.name || 'Untitled Chat');
                                  }}
                                  className={`p-1.5 rounded transition-colors ${
                                    theme === 'dark'
                                      ? 'hover:bg-blue-400/20 text-white/60 hover:text-blue-400'
                                      : 'hover:bg-blue-400/20 text-black/60 hover:text-blue-600'
                                  }`}
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSession(session.id);
                                  }}
                                  className={`p-1.5 rounded transition-colors ${
                                    theme === 'dark'
                                      ? 'hover:bg-red-400/20 text-white/60 hover:text-red-400'
                                      : 'hover:bg-red-400/20 text-black/60 hover:text-red-600'
                                  }`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`text-center p-6 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                    <MessageSquare className={`w-8 h-8 mx-auto mb-2 ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`} />
                    <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                      No recent chats
                    </p>
                    <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`}>
                      Start a conversation to see your chat history here
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'docs':
        return (
          <div className="h-full overflow-y-auto p-4">
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center">
                <h1 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  Documents
                </h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                  Upload and manage your research documents
                </p>
              </div>

              <label className={`block w-full p-4 rounded-lg border-2 border-dashed transition-colors cursor-pointer text-center ${
                theme === 'dark'
                  ? 'border-white/20 hover:border-white/40 bg-white/5'
                  : 'border-black/20 hover:border-black/40 bg-black/5'
              }`}>
                <input
                  type="file"
                  accept=".pdf,.txt,.md,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadDocument(file);
                  }}
                  className="hidden"
                />
                <Upload className={`w-6 h-6 mx-auto mb-2 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`} />
                <span className={`text-sm block ${theme === 'dark' ? 'text-white/80' : 'text-black/80'}`}>
                  Upload Document
                </span>
              </label>

              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`rounded-lg ${
                      theme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                    }`}
                  >
                    {editingDocId === doc.id ? (
                      <div className="p-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={docEditName}
                            onChange={(e) => setDocEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleEditDocumentName(doc.id, docEditName);
                              } else if (e.key === 'Escape') {
                                setEditingDocId(null);
                                setDocEditName('');
                              }
                            }}
                            className={`flex-1 text-sm px-2 py-1 rounded border ${
                              theme === 'dark'
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'bg-black/10 border-black/20 text-black'
                            }`}
                            autoFocus
                          />
                          <button
                            onClick={() => handleEditDocumentName(doc.id, docEditName)}
                            className={`p-1 rounded text-green-400 hover:bg-green-400/20`}
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingDocId(null);
                              setDocEditName('');
                            }}
                            className={`p-1 rounded text-red-400 hover:bg-red-400/20`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <div className="flex-1 p-4">
                          <h3 className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                            {doc.filename}
                          </h3>
                          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                            {doc.chunks} chunks • {Math.round(doc.size / 1024)}KB
                          </p>
                        </div>
                        <div className="flex items-center gap-1 px-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingDocId(doc.id);
                              setDocEditName(doc.filename);
                            }}
                            className={`p-1.5 rounded transition-colors ${
                              theme === 'dark'
                                ? 'hover:bg-white/10 text-white/60 hover:text-white/80'
                                : 'hover:bg-black/10 text-black/60 hover:text-black/80'
                            }`}
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDocument(doc.id);
                            }}
                            className={`p-1.5 rounded transition-colors ${
                              theme === 'dark'
                                ? 'hover:bg-red-400/20 text-white/60 hover:text-red-400'
                                : 'hover:bg-red-400/20 text-black/60 hover:text-red-600'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'achievements':
        // Map achievement types to icons and colors (same as desktop)
        const getAchievementIcon = (type: string) => {
          const iconMap: Record<string, any> = {
            first_chat: Book,
            document_upload: Upload,
            research_streak: Trophy,
            domain_explorer: MessageSquare,
            citation_master: Trophy,
            early_adopter: Trophy,
            knowledge_seeker: Book,
            power_user: Trophy,
          };
          return iconMap[type] || Trophy;
        };

        const getAchievementColor = (type: string) => {
          const colorMap: Record<string, string> = {
            first_chat: 'text-blue-400',
            document_upload: 'text-green-400',
            research_streak: 'text-yellow-400',
            domain_explorer: 'text-purple-400',
            citation_master: 'text-orange-400',
            early_adopter: 'text-pink-400',
            knowledge_seeker: 'text-indigo-400',
            power_user: 'text-red-400',
          };
          return colorMap[type] || 'text-gray-400';
        };

        const totalPoints = user?.stats?.total_points || 0;
        const achievements = user?.achievements || [];
        const userStats = user?.stats || {};

        // Calculate achievement progress
        const getAchievementProgress = (achievement: any) => {
          const stats = userStats as any; // Type assertion for flexibility
          switch (achievement.type) {
            case 'research_streak':
              const daysUsed = stats.consecutive_days_used || 0;
              const target = achievement.requirement_value || 7;
              return { current: daysUsed, target, percentage: Math.min((daysUsed / target) * 100, 100) };

            case 'document_upload':
              const uploadsCount = stats.documents_uploaded || 0;
              const uploadTarget = achievement.requirement_value || 5;
              return { current: uploadsCount, target: uploadTarget, percentage: Math.min((uploadsCount / uploadTarget) * 100, 100) };

            case 'domain_explorer':
              const domainsExplored = stats.domains_explored?.length || 0;
              const domainTarget = achievement.requirement_value || 3;
              return { current: domainsExplored, target: domainTarget, percentage: Math.min((domainsExplored / domainTarget) * 100, 100) };

            case 'citation_master':
              const citationsUsed = stats.total_citations_used || 0;
              const citationTarget = achievement.requirement_value || 50;
              return { current: citationsUsed, target: citationTarget, percentage: Math.min((citationsUsed / citationTarget) * 100, 100) };

            case 'power_user':
              const totalChats = stats.total_chats || 0;
              const chatTarget = achievement.requirement_value || 100;
              return { current: totalChats, target: chatTarget, percentage: Math.min((totalChats / chatTarget) * 100, 100) };

            default:
              return { current: 0, target: 1, percentage: achievement.unlocked_at ? 100 : 0 };
          }
        };

        return (
          <div className="h-full overflow-y-auto scrollbar-none p-4">
            <div className="max-w-md mx-auto space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    Rewards
                  </h1>
                  <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                    Your study progress and rewards
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    {totalPoints} pts
                  </span>
                </div>
              </div>

              {/* Points Summary Card */}
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10' : 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20'} mb-6`}>
                <div className="text-center">
                  <Trophy className="w-12 h-12 mx-auto mb-3 text-yellow-400" />
                  <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    {totalPoints} Points
                  </h2>
                  <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-white/70' : 'text-black/70'}`}>
                    You've earned {totalPoints} points from your study activities!
                  </p>
                  <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-white/50' : 'text-black/50'}`}>
                    Keep chatting and uploading documents to earn more rewards
                  </p>
                </div>
              </div>


              {/* Achievements List */}
              <div className="space-y-3">
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  All Rewards
                </h2>
                {achievements.map(achievement => {
                  const Icon = getAchievementIcon(achievement.type);
                  const isUnlocked = achievement.unlocked_at !== null;
                  const progress = getAchievementProgress(achievement);

                  return (
                    <div
                      key={achievement.type}
                      className={`relative p-3 rounded-lg transition-all duration-200 ${
                        isUnlocked
                          ? (theme === 'dark' ? 'bg-white/10 shadow-lg' : 'bg-black/10 shadow-lg')
                          : (theme === 'dark' ? 'bg-white/5' : 'bg-black/5')
                      }`}
                    >
                      {/* Achievement unlocked glow effect */}
                      {isUnlocked && (
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-lg animate-pulse" />
                      )}

                      <div className="relative">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-5 h-5 ${getAchievementColor(achievement.type)}`} />
                            {isUnlocked && (
                              <Trophy className="w-4 h-4 text-yellow-400" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isUnlocked && (
                              <div className="flex items-center gap-1">
                                <Trophy className="w-3 h-3 text-yellow-400" />
                                <span className="text-xs text-yellow-400 font-semibold">
                                  +{achievement.points}
                                </span>
                              </div>
                            )}
                            {!isUnlocked && (
                              <span className={`text-xs font-mono ${
                                theme === 'dark' ? 'text-white/60' : 'text-black/60'
                              }`}>
                                {progress.current}/{progress.target}
                              </span>
                            )}
                          </div>
                        </div>

                        <h4 className={`text-sm font-medium mb-1 ${
                          isUnlocked
                            ? (theme === 'dark' ? 'text-white' : 'text-black')
                            : (theme === 'dark' ? 'text-white/60' : 'text-black/60')
                        }`}>
                          {achievement.name}
                        </h4>

                        <p className={`text-xs mb-2 ${
                          theme === 'dark' ? 'text-white/70' : 'text-black/70'
                        }`}>
                          {achievement.description}
                        </p>

                        {/* Progress bar for incomplete achievements */}
                        {!isUnlocked && progress.target > 1 && (
                          <div className="mb-2">
                            <div className={`w-full h-1.5 rounded-full ${
                              theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
                            }`}>
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-500"
                                style={{ width: `${progress.percentage}%` }}
                              />
                            </div>
                            <div className={`flex justify-between items-center mt-1`}>
                              <span className={`text-xs ${
                                theme === 'dark' ? 'text-white/50' : 'text-black/50'
                              }`}>
                                Progress: {Math.round(progress.percentage)}%
                              </span>
                              <span className={`text-xs ${
                                theme === 'dark' ? 'text-white/50' : 'text-black/50'
                              }`}>
                                {progress.current} / {progress.target}
                              </span>
                            </div>
                          </div>
                        )}

                        {isUnlocked && achievement.unlocked_at && (
                          <p className="text-xs text-yellow-400 mt-1">
                            Unlocked {formatLocalDate(achievement.unlocked_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {achievements.length === 0 && (
                  <div className={`text-center p-6 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                    <Trophy className={`w-12 h-12 mx-auto mb-3 ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`} />
                    <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                      Start chatting and uploading documents to unlock achievements!
                    </p>
                  </div>
                )}
              </div>

              {/* Rewards Store */}
              <div className="space-y-3">
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  Rewards Store
                </h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                  Spend your points on special themes and bonuses
                </p>

                <div className="grid grid-cols-1 gap-3">
                  {[
                    {
                      name: 'Dark Galaxy Theme',
                      cost: 100,
                      description: 'A beautiful space-themed dark mode with star animations',
                      type: 'theme',
                      available: totalPoints >= 100
                    },
                    {
                      name: 'Productivity Boost',
                      cost: 50,
                      description: 'Double points for the next 24 hours',
                      type: 'boost',
                      available: totalPoints >= 50
                    },
                    {
                      name: 'Custom Avatar',
                      cost: 75,
                      description: 'Upload your own avatar image',
                      type: 'cosmetic',
                      available: totalPoints >= 75
                    },
                    {
                      name: 'Rainbow Theme',
                      cost: 150,
                      description: 'Colorful gradient theme with rainbow effects',
                      type: 'theme',
                      available: totalPoints >= 150
                    }
                  ].map((item, index) => (
                    <div
                      key={index}
                      className={`relative p-3 rounded-lg border transition-all duration-200 ${
                        item.available
                          ? theme === 'dark'
                            ? 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30 hover:border-purple-500/50'
                            : 'bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-purple-500/20 hover:border-purple-500/40'
                          : theme === 'dark'
                            ? 'bg-white/5 border-white/10'
                            : 'bg-black/5 border-black/10'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className={`text-sm font-medium ${
                            item.available
                              ? (theme === 'dark' ? 'text-white' : 'text-black')
                              : (theme === 'dark' ? 'text-white/50' : 'text-black/50')
                          }`}>
                            {item.name}
                          </h4>
                          <p className={`text-xs mt-1 ${
                            theme === 'dark' ? 'text-white/70' : 'text-black/70'
                          }`}>
                            {item.description}
                          </p>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className={`flex items-center gap-1 text-xs font-semibold ${
                            item.available
                              ? 'text-yellow-400'
                              : theme === 'dark' ? 'text-white/40' : 'text-black/40'
                          }`}>
                            <Trophy className="w-3 h-3" />
                            {item.cost}
                          </div>
                          {item.available && (
                            <button
                              onClick={() => {
                                // TODO: Implement purchase logic
                                alert(`Purchase ${item.name} for ${item.cost} points? (Not implemented yet)`);
                              }}
                              className="mt-2 px-2 py-1 text-xs bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-md hover:from-purple-600 hover:to-blue-600 transition-colors"
                            >
                              Buy
                            </button>
                          )}
                        </div>
                      </div>

                      {!item.available && (
                        <div className={`text-xs ${
                          theme === 'dark' ? 'text-white/40' : 'text-black/40'
                        }`}>
                          Need {item.cost - totalPoints} more points
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'settings':
        return (
          <SettingsModal
            isOpen={true}
            onClose={() => setMobilePage('chat')}
          />
        );
    }
  };

  const getUserMessageCount = () => {
    // Always use current frontend messages count for consistency
    // This avoids the async timing issues with backend session data
    const currentCount = messages.filter(msg => msg.role === 'user').length;
    console.log(`📊 Using current frontend messages: ${currentCount} (session: ${currentBackendSessionId})`);
    return currentCount;
  };

  const getSessionMessageCount = (session: any) => {
    // For the currently active session, always use the live frontend message count
    if (session.id === sessionId) {
      const frontendCount = messages.filter(msg => msg.role === 'user').length;
      console.log(`📊 Session ${session.id} (ACTIVE): frontend=${frontendCount}, backend=${session.message_count || 0}`);
      return frontendCount;
    }
    // For other sessions, use the backend message count
    const backendCount = session.message_count || 0;
    console.log(`📊 Session ${session.id} (INACTIVE): backend=${backendCount}`);
    return backendCount;
  };

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
          : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
      }`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`text-lg font-medium ${
            theme === 'dark' ? 'text-white/70' : 'text-black/70'
          }`}>
            Loading RAG Scholar...
          </p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLogin={login} onSignUp={signUp} />;
  }

  if (apiError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full mx-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
            Connection Error
          </h2>
          <p className="text-gray-600 text-center mb-4">
            {apiError}
          </p>
          <div className="text-center">
            <button
              onClick={checkApiHealth}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
            <p className="font-medium">To start the backend:</p>
            <code className="block mt-1 text-xs bg-gray-800 text-white p-2 rounded">
              python -m rag_scholar.main
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className={`h-screen flex relative overflow-hidden ${getBackgroundClass()}`}>
      {/* Sidebar - Desktop only, mobile uses page navigation */}
      <div className={`hidden lg:block relative z-50 transition-all duration-300 ease-out will-change-transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${sidebarOpen ? 'lg:w-[28rem]' : 'lg:w-16'}`} data-sidebar>
        <Sidebar
          domains={userDomains}
          activeDomain={activeDomain}
          onCreateDomain={handleCreateDomain}
          onEditDomain={handleEditDomain}
          onSelectDomain={handleSelectDomain}
          onDeleteDomain={handleDeleteDomain}
          availableDocuments={documents.map(doc => ({ id: doc.id, filename: doc.filename }))}
          onAssignDocuments={handleAssignDocuments}
          sessionId={sessionId}
          messageCount={getUserMessageCount()}
          onClearChat={handleClearChat}
          onNewSession={handleNewSession}
          onSelectSession={handleSelectSession}
          onRenameSession={handleRenameSession}
          sessions={previewSession ? [previewSession, ...sessions.filter(s => s.id !== previewSession.id)] : sessions}
          onDeleteSession={async (sessionId) => {
            await apiService.deleteSession(sessionId);
            loadSessions();
          }}
          isCollapsed={!sidebarOpen}
          documents={documents}
          onUpload={handleUploadDocument}
          onDeleteDocument={handleDeleteDocument}
          onReindex={handleReindexCollection}
          isLoading={isDocumentLoading}
          onOpenSidebar={() => setSidebarOpen(true)}
          onCloseSidebar={() => setSidebarOpen(false)}
          backgroundCommandCount={backgroundCommandCount}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </div>
      
      {/* Menu toggle button - Desktop only */}
      <div className="hidden lg:block">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed top-4 left-4 z-[60] bg-white/10 backdrop-blur-md text-white p-2 rounded-lg shadow-lg hover:bg-white/20 transition-all duration-300 border border-white/20"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Theme Toggle - Upper Right with auto-hide and hover visibility */}
      <div 
        className={`fixed top-4 right-4 z-[60] transition-opacity duration-300 ${
          themeToggleVisible ? 'opacity-70 hover:opacity-100' : 'opacity-0 hover:opacity-100'
        }`}
        onMouseEnter={() => setThemeToggleVisible(true)}
      >
        <ThemeToggle theme={theme} themeMode={themeMode} onToggle={toggleTheme} />
      </div>
      
      {/* Main content area - Desktop: Chat Interface, Mobile: Page-based navigation */}
      <div className="flex-1 bg-white/5 backdrop-blur-sm transition-all duration-300 ease-out will-change-transform flex flex-col min-h-0 pb-16 lg:pb-0" data-chat-area>
        <div className="flex-1 min-h-0">
          {/* Desktop: Always show chat interface */}
          <div className="hidden lg:block h-full">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isChatLoading}
              currentDomain={activeDomain?.type || DomainType.GENERAL}
              activeCollection="default"
              userName={user?.name || 'User'}
              sidebarOpen={sidebarOpen}
            />
          </div>

          {/* Mobile: Show different pages based on active tab */}
          <div className="lg:hidden h-full">
            {renderMobilePage()}
          </div>
        </div>
      </div>
      
      {/* Mobile Bottom Tab Bar - Only show on small screens */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md border-t border-white/10" data-sidebar>
        <div className="flex items-center justify-around py-2">
          <button
            onClick={() => setMobilePage('chat')}
            className={`flex flex-col items-center p-2 transition-colors ${
              mobilePage === 'chat'
                ? 'text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <MessageSquare className="w-5 h-5 mb-1" />
            <span className="text-xs">Chat</span>
          </button>
          <button
            onClick={() => setMobilePage('home')}
            className={`flex flex-col items-center p-2 transition-colors ${
              mobilePage === 'home'
                ? 'text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Home className="w-5 h-5 mb-1" />
            <span className="text-xs">Home</span>
          </button>
          <button
            onClick={() => setMobilePage('docs')}
            className={`flex flex-col items-center p-2 transition-colors ${
              mobilePage === 'docs'
                ? 'text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Upload className="w-5 h-5 mb-1" />
            <span className="text-xs">Docs</span>
          </button>
          <button
            onClick={() => setMobilePage('achievements')}
            className={`flex flex-col items-center p-2 transition-colors ${
              mobilePage === 'achievements'
                ? 'text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Trophy className="w-5 h-5 mb-1" />
            <span className="text-xs">Rewards</span>
          </button>
          <button
            onClick={() => setMobilePage('settings')}
            className={`flex flex-col items-center p-2 transition-colors ${
              mobilePage === 'settings'
                ? 'text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5 mb-1" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </div>

      {/* Settings Modal - Desktop only, mobile uses page navigation */}
      <div className="hidden lg:block">
        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      </div>

    </div>
  );
};

function App() {
  return (
    <UserProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </UserProvider>
  );
}

export default App;
