import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, MessageSquare, Home, Upload, Settings, X, Book, Beaker, Heart, Briefcase, GraduationCap, Code, HelpCircle } from 'lucide-react';
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
  const { user, userProfile, login, signUp, refreshUserProfile, isAuthenticated, loading } = useUser();

  // Core state
  const [messages, setMessages] = useState<Message[]>([]);
  const [userDomains, setUserDomains] = useState<UserDomain[]>([]);
  const [activeDomain, setActiveDomain] = useState<UserDomain | null>(null);
  const [domainChatHistory, setDomainChatHistory] = useState<Record<string, Message[]>>({});
  const [documents, setDocuments] = useState<Document[]>([]);
  const [chatSessionId] = useState<string>(() =>
    Math.random().toString(36).substring(2) + Date.now().toString(36)
  );

  // UI state
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState<Set<string>>(new Set());
  const [apiError, setApiError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [backgroundCommandCount, setBackgroundCommandCount] = useState(1);
  const [mobilePage, setMobilePage] = useState<'chat' | 'home' | 'docs' | 'achievements' | 'settings' | 'help'>('home');
  const [showMobileClassForm, setShowMobileClassForm] = useState(false);
  const [editingMobileDomain, setEditingMobileDomain] = useState<UserDomain | null>(null);
  const [mobileClassFormData, setMobileClassFormData] = useState({ name: '', type: DomainType.GENERAL, description: '' });
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themeToggleVisible, setThemeToggleVisible] = useState(true);
  const [isNewChatSession, setIsNewChatSession] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Load documents and sessions when authenticated
  useEffect(() => {
    console.log('🔍 AUTH: isAuthenticated:', isAuthenticated, 'loading:', loading);
    if (isAuthenticated && !loading) {
      console.log('🔍 AUTH: Loading data...');
      loadDocuments();
      loadSessions();
    }
  }, [isAuthenticated, loading]);

  // Load initial data
  const loadDocuments = useCallback(async () => {
    try {
      console.log('Loading documents...');
      const docs = await apiService.getDocuments();
      console.log('Loaded documents:', docs);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
      setDocuments([]);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      console.log('Loading sessions...');

      // Debug Firestore structure first
      try {
        const debugData = await apiService.debugFirestore();
        console.log('DEBUG: Firestore structure:', debugData);
      } catch (debugError: any) {
        console.log('DEBUG: Failed to debug Firestore:', debugError);
      }

      const sessionsData = await apiService.getSessions();
      console.log('Loaded sessions:', sessionsData);
      console.log('Number of sessions loaded:', sessionsData.length);
      setSessions(sessionsData);
    } catch (error: any) {
      console.error('Failed to load sessions:', error);
      console.error('Error details:', error.response?.data || error.message);
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, [isAuthenticated, user]);

  const loadUserDomains = useCallback(async () => {
    // Load domains from localStorage or start with empty array
    const savedDomains = localStorage.getItem('userDomains');
    const domains: UserDomain[] = savedDomains ? JSON.parse(savedDomains) : [];

    setUserDomains(domains);
    if (!activeDomain && domains.length > 0) {
      setActiveDomain(domains[0]);
    }
  }, [activeDomain]);

  const checkApiHealth = useCallback(async () => {
    try {
      await apiService.health();
      setApiError(null);
    } catch (error) {
      console.error('API health check failed:', error);
      setApiError('Cannot connect to API. Please check if the backend is running.');
    }
  }, []);

  useEffect(() => {
    checkApiHealth(); // Health check doesn't require auth
    loadUserDomains(); // User domains are stored locally
  }, [checkApiHealth, loadUserDomains]);

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
      // Update domain-specific history
      if (activeDomain) {
        setDomainChatHistory(prevHistory => ({
          ...prevHistory,
          [activeDomain.id]: newMessages
        }));
      }
      return newMessages;
    });

    setIsChatLoading(true);

    try {
      const response = await apiService.chat({
        query: content,
        session_id: currentSessionId || chatSessionId,
        class_id: activeDomain?.id,
        k: 5,
      });

      // Update current session ID if this was a new session
      if (response.session_id && response.session_id !== currentSessionId) {
        setCurrentSessionId(response.session_id);
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
        // Update domain-specific history
        if (activeDomain) {
          setDomainChatHistory(prevHistory => ({
            ...prevHistory,
            [activeDomain.id]: newMessages
          }));
        }
        return newMessages;
      });

      // Refresh sessions to get updated session data (with small delay to ensure backend update completes)
      setTimeout(() => {
        loadSessions();
      }, 1000);

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

  // Create new chat session (simple approach - let LangChain handle the storage)
  const handleNewChat = () => {
    console.log('Creating new chat session...');
    // Generate new session ID (LangChain will create the session when first message is sent)
    const newSessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    console.log('New session ID:', newSessionId);

    setCurrentSessionId(newSessionId);
    setMessages([]);
    setIsNewChatSession(true);

    // Clear domain chat history for current domain only
    if (activeDomain) {
      setDomainChatHistory(prev => ({
        ...prev,
        [activeDomain.id]: []
      }));
    }
  };

  const handleClearChat = () => {
    handleNewChat();
  };

  const handleSelectSession = async (sessionId: string) => {
    try {
      console.log('Selecting session:', sessionId);
      setCurrentSessionId(sessionId);

      // Mark session as no longer new when selected
      setSessions(prev => prev.map(session =>
        session.id === sessionId
          ? { ...session, isNew: false }
          : session
      ));

      // Load messages for this session from Firestore
      setIsChatLoading(true);
      const sessionData = await apiService.getSessionMessages(sessionId);
      console.log('Loaded session messages:', sessionData);
      setMessages(sessionData.messages || []);

      // Update domain chat history
      if (activeDomain) {
        setDomainChatHistory(prev => ({
          ...prev,
          [activeDomain.id]: sessionData.messages || []
        }));
      }
    } catch (error) {
      console.error('Failed to load session messages:', error);
      setMessages([]);
    } finally {
      setIsChatLoading(false);
    }
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

      // Auto-assign the uploaded document to the current active domain
      if (activeDomain && uploadResponse.id) {
        console.log(`🔗 Auto-assigning uploaded document to active class: ${activeDomain.name}`);
        try {
          await handleAssignDocumentToClass(uploadResponse.id, uploadResponse.filename || file.name, activeDomain.id, 'add');
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

      // Remove from all domains
      const updatedDomains = userDomains.map(domain => ({
        ...domain,
        documents: domain.documents.filter(id => id !== documentId)
      }));
      setUserDomains(updatedDomains);
      localStorage.setItem('userDomains', JSON.stringify(updatedDomains));

      // Update active domain if needed
      if (activeDomain?.documents.includes(documentId)) {
        setActiveDomain(prev => prev ? {
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

  // Domain management
  const handleCreateDomain = async (name: string, type: DomainType, description?: string, selectedDocuments?: string[]) => {
    const newDomain: UserDomain = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      name,
      type,
      description: description || '',
      documents: selectedDocuments || [],
      created_at: new Date().toISOString()
    };

    const updatedDomains = [...userDomains, newDomain];
    setUserDomains(updatedDomains);
    localStorage.setItem('userDomains', JSON.stringify(updatedDomains));

    // If documents were selected, assign them to the class in the backend
    if (selectedDocuments && selectedDocuments.length > 0) {
      try {
        for (const documentId of selectedDocuments) {
          const document = documents.find(doc => doc.id === documentId);
          if (document) {
            await handleAssignDocumentToClass(documentId, document.filename, newDomain.id, 'add');
          }
        }
        console.log(`Successfully assigned ${selectedDocuments.length} documents to class "${name}"`);
      } catch (error) {
        console.error('Failed to assign documents to class:', error);
      }
    }

    // Auto-select the newly created domain
    handleSelectDomain(newDomain);
  };

  const handleSelectDomain = (domain: UserDomain) => {
    // Save current domain's messages
    if (activeDomain) {
      setDomainChatHistory(prev => ({
        ...prev,
        [activeDomain.id]: messages
      }));
    }

    // Load new domain's messages
    const domainMessages = domainChatHistory[domain.id] || [];
    setMessages(domainMessages);
    setActiveDomain(domain);
  };

  const handleEditDomain = (domainId: string, name: string, type: DomainType, description?: string) => {
    const updatedDomains = userDomains.map(domain =>
      domain.id === domainId
        ? { ...domain, name, type, description: description || '' }
        : domain
    );
    setUserDomains(updatedDomains);
    localStorage.setItem('userDomains', JSON.stringify(updatedDomains));

    if (activeDomain?.id === domainId) {
      setActiveDomain(prev => prev ? { ...prev, name, type, description: description || '' } : null);
    }
  };

  const handleDeleteDomain = (domainId: string) => {
    const domain = userDomains.find(d => d.id === domainId);
    if (!window.confirm(`Delete "${domain?.name}" class? This will not delete the documents, but will remove the class organization.`)) {
      return;
    }

    const updatedDomains = userDomains.filter(domain => domain.id !== domainId);
    setUserDomains(updatedDomains);
    localStorage.setItem('userDomains', JSON.stringify(updatedDomains));

    // If deleting active domain, switch to first available or clear
    if (activeDomain?.id === domainId) {
      if (updatedDomains.length > 0) {
        handleSelectDomain(updatedDomains[0]);
      } else {
        setActiveDomain(null);
        setMessages([]);
      }
    }

    // Remove from domain chat history
    setDomainChatHistory(prev => {
      const { [domainId]: deleted, ...rest } = prev;
      return rest;
    });
  };

  const handleAssignDocuments = async (domainId: string, documentIds: string[]) => {
    const updatedDomains = userDomains.map(domain =>
      domain.id === domainId
        ? { ...domain, documents: documentIds }
        : domain
    );
    setUserDomains(updatedDomains);
    localStorage.setItem('userDomains', JSON.stringify(updatedDomains));

    if (activeDomain?.id === domainId) {
      setActiveDomain(prev => prev ? { ...prev, documents: documentIds } : null);
    }

    // Sync document assignments with backend
    try {
      const domain = userDomains.find(d => d.id === domainId);
      const oldDocumentIds = domain?.documents || [];

      // Find documents to add (in new list but not in old list)
      const documentsToAdd = documentIds.filter(id => !oldDocumentIds.includes(id));

      // Find documents to remove (in old list but not in new list)
      const documentsToRemove = oldDocumentIds.filter(id => !documentIds.includes(id));

      // Add new documents to class
      for (const documentId of documentsToAdd) {
        const document = documents.find(doc => doc.id === documentId);
        if (document) {
          await handleAssignDocumentToClass(documentId, document.filename, domainId, 'add');
        }
      }

      // Remove documents from class
      console.log(`Removing ${documentsToRemove.length} documents from class:`, documentsToRemove);
      for (const documentId of documentsToRemove) {
        const document = documents.find(doc => doc.id === documentId);
        if (document) {
          console.log(`Removing document: ${document.filename} (${documentId})`);
          try {
            await handleAssignDocumentToClass(documentId, document.filename, domainId, 'remove');
            console.log(`Successfully removed: ${document.filename}`);
          } catch (error) {
            console.error(`Failed to remove document ${document.filename}:`, error);
          }
        }
      }

      console.log(`Successfully updated document assignments for class "${domain?.name}"`);
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

      // Update userDomains state (for document counts and edit form highlighting)
      setUserDomains(prevDomains =>
        prevDomains.map(domain => {
          if (domain.id === classId) {
            const currentDocuments = domain.documents || [];
            const updatedDocuments = operation === 'add'
              ? currentDocuments.includes(documentId)
                ? currentDocuments // Already included
                : [...currentDocuments, documentId]
              : currentDocuments.filter(id => id !== documentId);
            return { ...domain, documents: updatedDocuments };
          }
          return domain;
        })
      );

      // Update localStorage
      const updatedDomains = userDomains.map(domain => {
        if (domain.id === classId) {
          const currentDocuments = domain.documents || [];
          const updatedDocuments = operation === 'add'
            ? currentDocuments.includes(documentId)
              ? currentDocuments
              : [...currentDocuments, documentId]
            : currentDocuments.filter(id => id !== documentId);
          return { ...domain, documents: updatedDocuments };
        }
        return domain;
      });
      localStorage.setItem('userDomains', JSON.stringify(updatedDomains));

      // Update active domain if it's the one being modified
      if (activeDomain?.id === classId) {
        setActiveDomain(prev => {
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
            currentDomain={activeDomain?.type || DomainType.GENERAL}
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
                      {userDomains.length}
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
    return <LoginPage onLogin={login} onSignUp={signUp} />;
  }

  return (
    <div className={`h-screen flex ${getBackgroundClass()}`}>
      {/* API Error Banner */}
      {apiError && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white p-2 text-center text-sm">
          <AlertCircle className="inline w-4 h-4 mr-2" />
          {apiError}
        </div>
      )}

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
          domains={userDomains}
          activeDomain={activeDomain}
          onCreateDomain={handleCreateDomain}
          onEditDomain={handleEditDomain}
          onSelectDomain={handleSelectDomain}
          onDeleteDomain={handleDeleteDomain}
          availableDocuments={documents.map(doc => ({ id: doc.id, filename: doc.filename }))}
          onAssignDocuments={handleAssignDocuments}
          sessionId={currentSessionId || chatSessionId}
          messageCount={getUserMessageCount()}
          onClearChat={handleClearChat}
          onNewSession={handleNewChat}
          onSelectSession={handleSelectSession}
          onRenameSession={handleRenameSession}
          onDeleteSession={handleDeleteSession}
          sessions={(() => {
            console.log('🔍 APP: Passing sessions to Sidebar:', sessions.length, sessions);
            return sessions;
          })()}
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
        />

        <div className="flex-1 min-h-0 flex flex-col">
          {/* Desktop: Always show chat interface */}
          <div className="hidden md:block flex-1 min-h-0">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isChatLoading}
              currentDomain={activeDomain?.type || DomainType.GENERAL}
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