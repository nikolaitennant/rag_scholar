import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Menu } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { Sidebar } from './components/Sidebar';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { LoginPage } from './components/LoginPage';
import { ThemeToggle } from './components/ThemeToggle';
import { apiService } from './services/api';
import { Message, DomainType, Document, UserDomain } from './types';

const AppContent: React.FC = () => {
  const { theme, toggleTheme, getBackgroundClass } = useTheme();
  const { user, login, signUp, isAuthenticated } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [userDomains, setUserDomains] = useState<UserDomain[]>([]);
  const [activeDomain, setActiveDomain] = useState<UserDomain | null>(null);
  const [domainChatHistory, setDomainChatHistory] = useState<Record<string, Message[]>>({});
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sessionId, setSessionId] = useState<string>(() => 
    Math.random().toString(36).substring(2) + Date.now().toString(36)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [backgroundCommandCount, setBackgroundCommandCount] = useState(1);

  // Load initial data
  const loadDocuments = useCallback(async () => {
    try {
      const docs = await apiService.getDocuments('default');
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
      setDocuments([]);
    }
  }, []);

  const loadUserDomains = useCallback(async () => {
    // For now, use mock data - will connect to API later
    const mockDomains: UserDomain[] = [
      {
        id: 'general-1',
        name: 'General Research',
        type: DomainType.GENERAL,
        documents: [],
        created_at: new Date().toISOString(),
        description: 'General purpose research and queries'
      }
    ];
    setUserDomains(mockDomains);
    if (!activeDomain && mockDomains.length > 0) {
      setActiveDomain(mockDomains[0]);
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
    setIsLoading(true);

    try {
      const response = await apiService.chat({
        query: content,
        domain: activeDomain?.type || DomainType.GENERAL,
        session_id: sessionId,
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
      setIsLoading(false);
    }
  };

  const handleUploadDocument = async (file: File) => {
    setIsLoading(true);
    try {
      const uploadResponse = await apiService.uploadDocument(file, 'default');
      await loadDocuments();
      
      // Auto-assign the uploaded document to the current active domain
      if (activeDomain && uploadResponse?.id) {
        const currentDocuments = activeDomain.documents || [];
        handleAssignDocuments(activeDomain.id, [...currentDocuments, uploadResponse.id]);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
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
    setIsLoading(true);
    try {
      await apiService.reindexCollection('default');
      await loadDocuments();
    } catch (error) {
      console.error('Reindex failed:', error);
    } finally {
      setIsLoading(false);
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
    setUserDomains(prev => [...prev, newDomain]);
  };

  const handleEditDomain = (domainId: string, name: string, type: DomainType, description?: string) => {
    setUserDomains(prev => prev.map(domain => 
      domain.id === domainId 
        ? { ...domain, name, type, description }
        : domain
    ));
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
    setUserDomains(prev => prev.filter(d => d.id !== domainId));
    if (activeDomain?.id === domainId) {
      const remainingDomains = userDomains.filter(d => d.id !== domainId);
      setActiveDomain(remainingDomains[0] || null);
      setMessages([]);
    }
  };

  const handleAssignDocuments = (domainId: string, documentIds: string[]) => {
    setUserDomains(prev => prev.map(domain => 
      domain.id === domainId 
        ? { ...domain, documents: documentIds }
        : domain
    ));
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
    setMessages([]);
    // Clear all domain histories for new session
    setDomainChatHistory({});
  };

  const getUserMessageCount = () => {
    return messages.filter(msg => msg.role === 'user').length;
  };

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
          isCollapsed={!sidebarOpen}
          documents={documents}
          onUpload={handleUploadDocument}
          onDeleteDocument={handleDeleteDocument}
          onReindex={handleReindexCollection}
          isLoading={isLoading}
          onOpenSidebar={() => setSidebarOpen(true)}
          onCloseSidebar={() => setSidebarOpen(false)}
          backgroundCommandCount={backgroundCommandCount}
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
      
      {/* Theme Toggle - Upper Right */}
      <div className="fixed top-4 right-4 z-[70]">
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
            isLoading={isLoading}
            currentDomain={activeDomain?.type || DomainType.GENERAL}
            activeCollection="default"
            userName={user?.name || 'User'}
          />
        </div>
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
