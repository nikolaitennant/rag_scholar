import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Menu } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { Sidebar } from './components/Sidebar';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { LoginPage } from './components/LoginPage';
import { ThemeToggle } from './components/ThemeToggle';
import { SettingsModal } from './components/SettingsModal';
import { apiService } from './services/api';
import { Message, DomainType, Document, UserDomain } from './types';

const AppContent: React.FC = () => {
  const { theme, toggleTheme, getBackgroundClass } = useTheme();
  const { user, login, signUp, refreshUser, isAuthenticated, loading } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [userDomains, setUserDomains] = useState<UserDomain[]>([]);
  const [activeDomain, setActiveDomain] = useState<UserDomain | null>(null);
  const [domainChatHistory, setDomainChatHistory] = useState<Record<string, Message[]>>({});
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sessionId, setSessionId] = useState<string>(() => 
    Math.random().toString(36).substring(2) + Date.now().toString(36)
  );
  const [currentBackendSessionId, setCurrentBackendSessionId] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [backgroundCommandCount, setBackgroundCommandCount] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [themeToggleVisible, setThemeToggleVisible] = useState(true);

  // Load initial data
  const loadDocuments = useCallback(async () => {
    try {
      console.log('Loading documents...');
      const docs = await apiService.getDocuments('default');
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
      setApiError('Cannot connect to API. Please check if the backend is running.');
    }
  }, []);

  useEffect(() => {
    checkApiHealth();
    loadDocuments();
    loadUserDomains();
  }, [checkApiHealth, loadDocuments, loadUserDomains]);

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
        const newSession = await apiService.createSession();
        const newBackendSessionId = newSession.id;
        setCurrentBackendSessionId(newBackendSessionId);
        setSessionId(newBackendSessionId);
        effectiveSessionId = newBackendSessionId;
      } catch (error) {
        console.error('Failed to create new session:', error);
        // Continue with the current sessionId as fallback
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
      return newMessages;
    });
    setIsChatLoading(true);

    try {
      const response = await apiService.chat({
        query: content,
        domain: activeDomain?.type || DomainType.GENERAL,
        session_id: effectiveSessionId,
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
        return newMessages;
      });

      // Refresh user data to update achievements in real-time
      if (user && refreshUser) {
        refreshUser().catch(error => console.error('Failed to refresh user:', error));
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
      const uploadResponse = await apiService.uploadDocument(file, 'default');
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
        handleAssignDocuments(activeDomain.id, [...currentDocuments, uploadResponse.id]);
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

  const handleCreateDomain = (name: string, type: DomainType, description?: string) => {
    const newDomain: UserDomain = {
      id: `domain-${Date.now()}`,
      name,
      type,
      documents: [],
      created_at: new Date().toISOString(),
      description
    };
    setUserDomains(prev => {
      const newDomains = [...prev, newDomain];
      localStorage.setItem('userDomains', JSON.stringify(newDomains));
      return newDomains;
    });
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
    
    // Load new domain's messages
    const domainMessages = domainChatHistory[domain.id] || [];
    setMessages(domainMessages);
  };

  const handleDeleteDomain = (domainId: string) => {
    const domain = userDomains.find(d => d.id === domainId);
    const domainName = domain?.name || domainId;
    
    if (!window.confirm(`Are you sure you want to delete the class "${domainName}"? This action cannot be undone.`)) {
      return;
    }
    
    setUserDomains(prev => {
      const newDomains = prev.filter(d => d.id !== domainId);
      localStorage.setItem('userDomains', JSON.stringify(newDomains));
      return newDomains;
    });
    if (activeDomain?.id === domainId) {
      const remainingDomains = userDomains.filter(d => d.id !== domainId);
      setActiveDomain(remainingDomains[0] || null);
      setMessages([]);
    }
  };

  const handleAssignDocuments = (domainId: string, documentIds: string[]) => {
    setUserDomains(prev => {
      const newDomains = prev.map(domain => 
        domain.id === domainId 
          ? { ...domain, documents: documentIds }
          : domain
      );
      localStorage.setItem('userDomains', JSON.stringify(newDomains));
      return newDomains;
    });
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

  const handleNewSession = () => {
    setSessionId(Math.random().toString(36).substring(2) + Date.now().toString(36));
    setCurrentBackendSessionId(null);  // Clear current session - new one will be created on first message
    setMessages([]);
    // Clear all domain histories for new session
    setDomainChatHistory({});
  };

  const handleSelectSession = async (newSessionId: string) => {
    try {
      // Load session data from backend
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

  const getUserMessageCount = () => {
    return messages.filter(msg => msg.role === 'user').length;
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
      <div className={`min-h-screen flex relative overflow-hidden ${getBackgroundClass()}`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-full blur-3xl animate-ping" style={{animationDuration: '4s'}}></div>
      </div>
      {/* Backdrop blur overlay when sidebar is open on mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed lg:relative z-50 transition-all duration-300 ease-out will-change-transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${sidebarOpen ? 'lg:w-96' : 'lg:w-16'}`}>
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
      
      {/* Menu toggle button - only show when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-[60] bg-white/10 backdrop-blur-md text-white p-2 rounded-lg shadow-lg hover:bg-white/20 transition-all duration-300 border border-white/20"
        >
          <Menu className="w-4 h-4" />
        </button>
      )}
      
      {/* Theme Toggle - Upper Right with auto-hide and hover visibility */}
      <div 
        className={`fixed top-4 right-4 z-[60] transition-opacity duration-300 ${
          themeToggleVisible ? 'opacity-70 hover:opacity-100' : 'opacity-0 hover:opacity-100'
        }`}
        onMouseEnter={() => setThemeToggleVisible(true)}
      >
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
      
      {/* Main content area - Chat Interface */}
      <div className={`flex-1 bg-white/5 backdrop-blur-sm transition-all duration-300 ease-out will-change-transform flex flex-col min-h-0 ${
        !sidebarOpen ? 'lg:ml-0' : ''
      }`}>
        <div className="flex-1 min-h-0">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            currentDomain={activeDomain?.type || DomainType.GENERAL}
            activeCollection="default"
            userName={user?.name || 'User'}
          />
        </div>
      </div>
      
      {/* Settings Modal - Rendered at root level for full screen overlay */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
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
