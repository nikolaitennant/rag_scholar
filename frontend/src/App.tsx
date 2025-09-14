import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Menu, MessageSquare, Home, Upload, Settings, Trophy, Plus, Book } from 'lucide-react';
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
  const [mobilePage, setMobilePage] = useState<'chat' | 'home' | 'docs' | 'achievements' | 'settings'>('home');
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
        selected_documents: activeDomain?.documents || [],
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
          />
        );
      case 'home':
        return (
          <div className="h-full overflow-y-auto p-4">
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center">
                <h1 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  Welcome to RAG Scholar
                </h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                  Your AI research assistant
                </p>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMobilePage('chat')}
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
                    onClick={() => {/* TODO: Open create domain modal */}}
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${
                      theme === 'dark'
                        ? 'bg-white/10 hover:bg-white/20 text-white/80'
                        : 'bg-black/10 hover:bg-black/20 text-black/80'
                    }`}
                  >
                    + New
                  </button>
                </div>

                {userDomains.length === 0 ? (
                  <button
                    onClick={() => {/* TODO: Open create domain modal */}}
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
                  <div className="space-y-2">
                    {userDomains.slice(0, 3).map((domain) => (
                      <button
                        key={domain.id}
                        onClick={() => {
                          handleSelectDomain(domain);
                          setMobilePage('chat');
                        }}
                        className={`w-full p-3 rounded-lg text-left transition-all ${
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
                          <div>
                            <h3 className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                              {domain.name}
                            </h3>
                            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                              {domain.type} • {domain.documents?.length || 0} docs
                            </p>
                          </div>
                          <MessageSquare className={`w-4 h-4 ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`} />
                        </div>
                      </button>
                    ))}
                    {userDomains.length > 3 && (
                      <p className={`text-xs text-center py-2 ${theme === 'dark' ? 'text-white/50' : 'text-black/50'}`}>
                        +{userDomains.length - 3} more classes
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Recent Chats */}
              <div>
                <h2 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  Recent Chats
                </h2>
                {messages.length > 0 ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => setMobilePage('chat')}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        theme === 'dark'
                          ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                          : 'bg-black/5 hover:bg-black/10 border border-black/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                            Continue Current Chat
                          </p>
                          <p className={`text-xs mt-1 truncate ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                            {messages[messages.length - 1]?.role === 'user'
                              ? `You: ${messages[messages.length - 1]?.content?.substring(0, 40)}...`
                              : `AI: ${messages[messages.length - 1]?.content?.substring(0, 40)}...`
                            }
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`}>
                              {messages.filter(m => m.role === 'user').length} messages
                            </span>
                            <span className={`text-xs ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`}>•</span>
                            <span className={`text-xs ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`}>
                              {activeDomain?.name || 'General'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <MessageSquare className={`w-5 h-5 ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`} />
                        </div>
                      </div>
                    </button>

                    {/* Show recent domains with chat history */}
                    {Object.entries(domainChatHistory)
                      .filter(([domainId, msgs]) => msgs.length > 0 && domainId !== activeDomain?.id)
                      .slice(0, 2)
                      .map(([domainId, msgs]) => {
                        const domain = userDomains.find(d => d.id === domainId);
                        const lastMessage = msgs[msgs.length - 1];
                        return (
                          <button
                            key={domainId}
                            onClick={() => {
                              if (domain) {
                                handleSelectDomain(domain);
                                setMobilePage('chat');
                              }
                            }}
                            className={`w-full p-3 rounded-lg text-left transition-all ${
                              theme === 'dark'
                                ? 'bg-white/5 hover:bg-white/10 border border-transparent'
                                : 'bg-black/5 hover:bg-black/10 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                                  {domain?.name || 'Unknown Class'}
                                </p>
                                <p className={`text-xs mt-1 truncate ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                                  {lastMessage?.role === 'user'
                                    ? `You: ${lastMessage.content?.substring(0, 40)}...`
                                    : `AI: ${lastMessage.content?.substring(0, 40)}...`
                                  }
                                </p>
                                <span className={`text-xs ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`}>
                                  {msgs.filter(m => m.role === 'user').length} messages
                                </span>
                              </div>
                              <MessageSquare className={`w-4 h-4 ${theme === 'dark' ? 'text-white/30' : 'text-black/30'}`} />
                            </div>
                          </button>
                        );
                      })
                    }
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

              <label className={`block w-full p-4 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
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
                <span className={`text-sm ${theme === 'dark' ? 'text-white/80' : 'text-black/80'}`}>
                  Upload Document
                </span>
              </label>

              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-4 rounded-lg ${
                      theme === 'dark' ? 'bg-white/5' : 'bg-black/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                          {doc.filename}
                        </h3>
                        <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                          {doc.chunks} chunks • {Math.round(doc.size / 1024)}KB
                        </p>
                      </div>
                      <Book className={`w-5 h-5 ml-3 ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`} />
                    </div>
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

        return (
          <div className="h-full overflow-y-auto p-4">
            <div className="max-w-md mx-auto space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                    Achievements
                  </h1>
                  <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                    Your research progress and rewards
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
                    You've earned {totalPoints} points from your research activities!
                  </p>
                  <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-white/50' : 'text-black/50'}`}>
                    Keep chatting and uploading documents to earn more rewards
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                  <div className="text-center">
                    <MessageSquare className={`w-6 h-6 mx-auto mb-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
                    <div className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      {user?.stats?.total_chats || 0}
                    </div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                      Chats
                    </div>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                  <div className="text-center">
                    <Upload className={`w-6 h-6 mx-auto mb-2 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`} />
                    <div className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      {user?.stats?.documents_uploaded || 0}
                    </div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                      Documents
                    </div>
                  </div>
                </div>
              </div>

              {/* Achievements List */}
              <div className="space-y-3">
                <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  All Awards
                </h2>
                {achievements.map(achievement => {
                  const Icon = getAchievementIcon(achievement.type);
                  const isUnlocked = achievement.unlocked_at !== null;
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
                          {isUnlocked && (
                            <div className="flex items-center gap-1">
                              <Trophy className="w-3 h-3 text-yellow-400" />
                              <span className="text-xs text-yellow-400 font-semibold">
                                +{achievement.points}
                              </span>
                            </div>
                          )}
                        </div>

                        <h4 className={`text-sm font-medium mb-1 ${
                          isUnlocked
                            ? (theme === 'dark' ? 'text-white' : 'text-black')
                            : (theme === 'dark' ? 'text-white/60' : 'text-black/60')
                        }`}>
                          {achievement.name}
                        </h4>

                        <p className={`text-xs ${
                          theme === 'dark' ? 'text-white/70' : 'text-black/70'
                        }`}>
                          {achievement.description}
                        </p>

                        {isUnlocked && achievement.unlocked_at && (
                          <p className="text-xs text-yellow-400 mt-1">
                            Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
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
      {/* Sidebar - Desktop only, mobile uses page navigation */}
      <div className={`hidden lg:block fixed lg:relative z-50 transition-all duration-300 ease-out will-change-transform ${
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
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>
      
      {/* Main content area - Desktop: Chat Interface, Mobile: Page-based navigation */}
      <div className={`flex-1 bg-white/5 backdrop-blur-sm transition-all duration-300 ease-out will-change-transform flex flex-col min-h-0 pb-16 lg:pb-0 ${
        !sidebarOpen ? 'lg:ml-0' : ''
      }`}>
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
            />
          </div>

          {/* Mobile: Show different pages based on active tab */}
          <div className="lg:hidden h-full">
            {renderMobilePage()}
          </div>
        </div>
      </div>
      
      {/* Mobile Bottom Tab Bar - Only show on small screens */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md border-t border-white/10">
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
