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

  // Load documents when authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      loadDocuments();
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

  // Auto-hide theme toggle after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setThemeToggleVisible(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Reset timer when toggle becomes visible again
  useEffect(() => {
    if (themeToggleVisible) {
      const timer = setTimeout(() => {
        setThemeToggleVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [themeToggleVisible]);

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
        session_id: chatSessionId,
        class_id: activeDomain?.id,
        k: 5,
      });

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

  // Simple new chat function
  const handleNewChat = () => {
    setMessages([]);
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
        const updatedDomains = userDomains.map(domain => {
          if (domain.id === activeDomain.id) {
            return {
              ...domain,
              documents: [...(domain.documents || []), uploadResponse.id]
            };
          }
          return domain;
        });
        setUserDomains(updatedDomains);
        localStorage.setItem('userDomains', JSON.stringify(updatedDomains));
        setActiveDomain(prev => prev ? {
          ...prev,
          documents: [...(prev.documents || []), uploadResponse.id]
        } : null);
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
  const handleCreateDomain = (name: string, type: DomainType, description?: string, selectedDocuments?: string[]) => {
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

  const handleAssignDocuments = (domainId: string, documentIds: string[]) => {
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
          <div className="h-full overflow-y-auto p-4">
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center">
                <h1 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  🤠 YEEHAW! Welcome to RAG Scholar 🤠
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

      {/* Theme Toggle */}
      {themeToggleVisible && (
        <div className="fixed top-4 right-4 z-40">
          <ThemeToggle theme={theme} themeMode={themeMode} onToggle={toggleTheme} />
        </div>
      )}

      {/* Desktop Layout */}
      <div className="hidden lg:flex w-full">
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
          sessionId={chatSessionId}
          messageCount={getUserMessageCount()}
          onClearChat={handleClearChat}
          onNewSession={handleNewChat}
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

        <div className="flex-1 min-h-0">
          {/* Desktop: Always show chat interface */}
          <div className="hidden lg:block h-full">
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
          <div className="lg:hidden h-full">
            {renderMobilePage()}
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden w-full">
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