import React, { useState, useEffect } from 'react';
import { Plus, Trash, RefreshCw, ChevronRight, Upload, File, Trash2, RotateCcw, MessageSquare, X, Sun, Moon, Trophy, BookOpen, Sparkles, Heart, Star, Zap, Award, Settings, History, Edit2, MoreVertical, HelpCircle, Home, Book, Beaker, Briefcase, GraduationCap, Code, Edit3 } from 'lucide-react';
import { DomainManager } from './DomainManager';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { DomainType, Document, UserDomain } from '../types';
import { apiService } from '../services/api';

interface SidebarProps {
  domains: UserDomain[];
  activeDomain: UserDomain | null;
  onCreateDomain: (name: string, type: DomainType, description?: string) => void;
  onEditDomain?: (domainId: string, name: string, type: DomainType, description?: string) => void;
  onSelectDomain: (domain: UserDomain) => void;
  onDeleteDomain: (domainId: string) => void;
  availableDocuments: { id: string; filename: string }[];
  onAssignDocuments: (domainId: string, documentIds: string[]) => void;
  sessionId: string;
  messageCount: number;
  onClearChat: () => void;
  onNewSession: () => void;
  onSelectSession?: (sessionId: string) => void;
  isCollapsed?: boolean;
  documents: Document[];
  onUpload: (file: File) => Promise<void>;
  onDeleteDocument: (documentId: string) => Promise<void>;
  onReindex: () => Promise<void>;
  isLoading: boolean;
  onOpenSidebar?: () => void;
  onCloseSidebar?: () => void;
  backgroundCommandCount?: number;
  onOpenSettings?: () => void;
  sessions?: any[];
  currentBackendSessionId?: string | null;
  onDeleteSession?: (sessionId: string) => void;
}

type TabType = 'home' | 'domains' | 'history' | 'documents' | 'achievements' | 'help';

export const Sidebar: React.FC<SidebarProps> = ({
  domains,
  activeDomain,
  onCreateDomain,
  onEditDomain,
  onSelectDomain,
  onDeleteDomain,
  availableDocuments,
  onAssignDocuments,
  sessionId,
  messageCount,
  onClearChat,
  onNewSession,
  onSelectSession,
  isCollapsed,
  documents,
  onUpload,
  onDeleteDocument,
  onReindex,
  isLoading,
  onOpenSidebar,
  onCloseSidebar,
  backgroundCommandCount = 1,
  onOpenSettings,
  sessions: propSessions = [],
  currentBackendSessionId,
  onDeleteSession,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionName, setEditingSessionName] = useState<string>('');
  const [editingDomain, setEditingDomain] = useState<UserDomain | null>(null);
  const [editingDomainName, setEditingDomainName] = useState<string>('');
  const [editingDomainType, setEditingDomainType] = useState<DomainType>(DomainType.GENERAL);
  const [editingDomainDescription, setEditingDomainDescription] = useState<string>('');
  const [editingDomainDocuments, setEditingDomainDocuments] = useState<string[]>([]);
  const [showCreateClassForm, setShowCreateClassForm] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassType, setNewClassType] = useState<DomainType>(DomainType.GENERAL);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const { theme } = useTheme();
  const { user } = useUser();
  
  // Use prop sessions if available, fallback to local sessions
  const currentSessions = propSessions.length > 0 ? propSessions : sessions;

  // Get real user data
  const totalPoints = user?.stats?.total_points || 0;
  const achievements = user?.achievements || [];

  // Map achievement types to icons and colors
  const getAchievementIcon = (type: string) => {
    const iconMap: Record<string, any> = {
      first_chat: BookOpen,
      document_upload: Upload,
      research_streak: Trophy,
      domain_explorer: Sparkles,
      citation_master: Award,
      early_adopter: Star,
      knowledge_seeker: BookOpen,
      power_user: Zap,
    };
    return iconMap[type] || Award;
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadFile(file);
      await onUpload(file);
      setUploadFile(null);
      event.target.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Load sessions when user is authenticated
  useEffect(() => {
    const loadSessions = async () => {
      if (user) {
        try {
          const userSessions = await apiService.getSessions();
          setSessions(userSessions);
        } catch (error) {
          console.error('Failed to load sessions:', error);
        }
      }
    };

    loadSessions();
  }, [user]);

  const handleDeleteSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    const sessionName = session?.name || sessionId;
    
    if (!window.confirm(`Are you sure you want to delete the chat "${sessionName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await apiService.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleRenameSession = async (sessionId: string, newName: string) => {
    try {
      await apiService.updateSession(sessionId, newName);
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, name: newName } : s));
    } catch (error) {
      console.error('Failed to rename session:', error);
    } finally {
      // Always clear editing state, regardless of API success/failure
      setEditingSessionId(null);
      setEditingSessionName('');
    }
  };

  if (isCollapsed) {
    return (
      <div className={`h-full w-16 backdrop-blur-md border-r flex flex-col items-center py-4 space-y-3 ${
        theme === 'dark' 
          ? 'bg-white/10 border-white/20' 
          : 'bg-black/10 border-black/20'
      }`}>
        <button 
          onClick={() => { setActiveTab('home'); onOpenSidebar?.(); }}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'home' 
              ? (theme === 'dark' ? 'bg-white/20 text-white' : 'bg-black/20 text-black')
              : (theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10')
          }`}
          title="Home"
        >
          <Home className="w-4 h-4" />
        </button>
        <button 
          onClick={() => { setActiveTab('documents'); onOpenSidebar?.(); }}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'documents' 
              ? (theme === 'dark' ? 'bg-white/20 text-white' : 'bg-black/20 text-black')
              : (theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10')
          }`}
          title="Documents"
        >
          <File className="w-4 h-4" />
        </button>
        <button 
          onClick={() => { setActiveTab('achievements'); onOpenSidebar?.(); }}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'achievements' 
              ? (theme === 'dark' ? 'bg-white/20 text-white' : 'bg-black/20 text-black')
              : (theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10')
          }`}
          title="Rewards"
        >
          <Trophy className="w-4 h-4" />
        </button>
        <button 
          onClick={() => { setActiveTab('help'); onOpenSidebar?.(); }}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'help' 
              ? (theme === 'dark' ? 'bg-white/20 text-white' : 'bg-black/20 text-black')
              : (theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10')
          }`}
          title="Help"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
        <div className="mt-auto">
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'domains':
        return (
          <DomainManager
            domains={domains}
            activeDomain={activeDomain}
            onCreateDomain={onCreateDomain}
            onEditDomain={onEditDomain}
            onSelectDomain={onSelectDomain}
            onDeleteDomain={onDeleteDomain}
            availableDocuments={availableDocuments}
            onAssignDocuments={onAssignDocuments}
            totalDocumentCount={documents.length}
          />
        );
      
      case 'documents':
        return (
          <div className="p-2 lg:p-4 space-y-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}>Documents</h3>
              <div className="flex items-center space-x-2">
                <label htmlFor="file-upload" className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10'
                }`} title="Upload Document">
                  <Upload className="w-3 h-3" />
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.txt,.md,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={onReindex}
                  className={`p-1 rounded-lg transition-colors ${
                    theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10'
                  }`}
                  title="Reindex Collection"
                  disabled={isLoading}
                >
                  <RotateCcw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-8">
                <File className={`w-12 h-12 mx-auto mb-3 ${
                  theme === 'dark' ? 'text-white/30' : 'text-black/30'
                }`} />
                <p className={`text-sm mb-3 ${
                  theme === 'dark' ? 'text-white/60' : 'text-black/60'
                }`}>No documents uploaded</p>
                <label htmlFor="file-upload-empty" className={`text-xs py-1 px-3 rounded-lg transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-white/10 hover:bg-white/20 text-white'
                    : 'bg-black/10 hover:bg-black/20 text-black'
                }`}>
                  Upload Your First Document
                  <input
                    id="file-upload-empty"
                    type="file"
                    accept=".pdf,.txt,.md,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto" style={{maxHeight: 'calc(100vh - 400px)'}}>
                {documents.map(doc => (
                  <div key={doc.id} className={`rounded-lg p-2 transition-colors group ${
                    theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <File className={`w-3 h-3 flex-shrink-0 ${
                            theme === 'dark' ? 'text-white/60' : 'text-black/60'
                          }`} />
                          <span className={`text-xs truncate ${
                            theme === 'dark' ? 'text-white' : 'text-black'
                          }`}>{doc.filename}</span>
                        </div>
                        <div className={`text-xs mt-1 ${
                          theme === 'dark' ? 'text-white/50' : 'text-black/50'
                        }`}>
                          {doc.chunks} chunks • {formatFileSize(doc.size)}
                        </div>
                      </div>
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          setDeletingDocId(doc.id);
                          try {
                            await onDeleteDocument(doc.id);
                          } catch (error) {
                            console.error('Failed to delete document:', error);
                            alert('Failed to delete document. Please try again.');
                          } finally {
                            setDeletingDocId(null);
                          }
                        }}
                        disabled={deletingDocId === doc.id}
                        className={`p-1 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                          deletingDocId === doc.id
                            ? 'text-red-400 bg-red-400/10 cursor-not-allowed animate-pulse'
                            : theme === 'dark'
                            ? 'text-white/40 hover:text-red-400 hover:bg-red-400/10'
                            : 'text-black/40 hover:text-red-400 hover:bg-red-400/10'
                        }`}
                        title={deletingDocId === doc.id ? 'Deleting...' : 'Delete Document'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'help':
        return (
          <div className="p-2 lg:p-4 space-y-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}>Help</h3>
            </div>

            <div className="space-y-3">
              <div className={`rounded-lg p-3 ${
                theme === 'dark' ? 'bg-white/5' : 'bg-black/5'
              }`}>
                <div className={`text-xs mb-1 ${
                  theme === 'dark' ? 'text-white/60' : 'text-black/60'
                }`}>User Messages</div>
                <div className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>{messageCount}</div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={onClearChat}
                  className={`w-full text-xs py-2 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-black/10 hover:bg-black/20 text-black'
                  }`}
                >
                  Clear Chat
                </button>
                <button
                  onClick={onNewSession}
                  className={`w-full text-xs py-2 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-black/10 hover:bg-black/20 text-black'
                  }`}
                >
                  New Session
                </button>
              </div>

              <div className={`pt-4 border-t ${
                theme === 'dark' ? 'border-white/10' : 'border-black/10'
              }`}>
                <div className={`text-xs mb-2 ${
                  theme === 'dark' ? 'text-white/60' : 'text-black/60'
                }`}>Special Commands</div>
                <div className={`space-y-2 text-xs ${
                  theme === 'dark' ? 'text-white/70' : 'text-black/70'
                }`}>
                  <div><span className={`font-mono px-1 rounded ${
                    theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
                  }`}>remember:</span> - Remember fact permanently</div>
                  <div><span className={`font-mono px-1 rounded ${
                    theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
                  }`}>memo:</span> - Add session-only fact</div>
                  <div><span className={`font-mono px-1 rounded ${
                    theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
                  }`}>role:</span> - Set AI persona/role</div>
                  <div><span className={`font-mono px-1 rounded ${
                    theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
                  }`}>background:</span> - Get background info</div>
                </div>
              </div>

              <div className={`pt-4 border-t mt-4 ${
                theme === 'dark' ? 'border-white/10' : 'border-black/10'
              }`}>
                <div className={`text-xs mb-3 ${
                  theme === 'dark' ? 'text-white/60' : 'text-black/60'
                }`}>How RAG Scholar Works</div>
                
                <div className="space-y-3 text-xs">
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-400 font-semibold">1.</span>
                    <div>
                      <div className="text-blue-400 font-medium mb-1">Upload Documents</div>
                      <p className={theme === 'dark' ? 'text-white/70' : 'text-black/70'}>Add PDFs, text files, and documents to your collections</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <span className="text-green-400 font-semibold">2.</span>
                    <div>
                      <div className="text-green-400 font-medium mb-1">Ask Questions</div>
                      <p className={theme === 'dark' ? 'text-white/70' : 'text-black/70'}>Type natural language questions about your content</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-400 font-semibold">3.</span>
                    <div>
                      <div className="text-purple-400 font-medium mb-1">Get Cited Answers</div>
                      <p className={theme === 'dark' ? 'text-white/70' : 'text-black/70'}>Receive answers with specific source references and page numbers</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="p-2 lg:p-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}>Chats</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    try {
                      const newSession = await apiService.createSession();
                      onSelectSession?.(newSession.id);
                      setSessions(prev => [newSession, ...prev]);
                    } catch (error) {
                      console.error('Failed to create session:', error);
                    }
                  }}
                  className={`p-1 rounded-lg transition-colors ${
                    theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10'
                  }`}
                  title="New Chat"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 overflow-y-auto" style={{maxHeight: 'calc(100vh - 400px)'}}>
              {sessions.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className={`w-12 h-12 mx-auto mb-3 ${
                    theme === 'dark' ? 'text-white/30' : 'text-black/30'
                  }`} />
                  <p className={`text-sm mb-3 ${
                    theme === 'dark' ? 'text-white/60' : 'text-black/60'
                  }`}>No chat history yet</p>
                  <button
                    onClick={async () => {
                      try {
                        const newSession = await apiService.createSession();
                        onSelectSession?.(newSession.id);
                        setSessions([newSession]);
                      } catch (error) {
                        console.error('Failed to create session:', error);
                      }
                    }}
                    className={`text-xs py-2 px-4 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-black/10 hover:bg-black/20 text-black'
                    }`}
                  >
                    New Chat
                  </button>
                </div>
              ) : (
                sessions.map(session => (
                  <div
                    key={session.id}
                    className={`group rounded-lg p-3 transition-all duration-200 cursor-pointer ${
                      sessionId === session.id
                        ? (theme === 'dark' ? 'bg-white/15 shadow-lg' : 'bg-black/15 shadow-lg')
                        : (theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10')
                    }`}
                    onClick={() => onSelectSession?.(session.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {editingSessionId === session.id ? (
                          <input
                            type="text"
                            value={editingSessionName}
                            onChange={(e) => setEditingSessionName(e.target.value)}
                            onBlur={() => {
                              if (editingSessionName.trim() && editingSessionName !== session.name) {
                                handleRenameSession(session.id, editingSessionName);
                              } else {
                                setEditingSessionId(null);
                                setEditingSessionName('');
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleRenameSession(session.id, editingSessionName);
                              } else if (e.key === 'Escape') {
                                setEditingSessionId(null);
                                setEditingSessionName('');
                              }
                            }}
                            className={`w-full text-sm font-medium bg-transparent border rounded px-2 py-1 ${
                              theme === 'dark'
                                ? 'text-white border-white/30 focus:border-white/50'
                                : 'text-black border-black/30 focus:border-black/50'
                            }`}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <>
                            <h4 className={`text-sm font-medium truncate ${
                              theme === 'dark' ? 'text-white' : 'text-black'
                            }`}>
                              {session.name}
                            </h4>
                            {session.preview && (
                              <p className={`text-xs mt-1 truncate ${
                                theme === 'dark' ? 'text-white/60' : 'text-black/60'
                              }`}>
                                {session.preview}
                              </p>
                            )}
                            <div className={`text-xs mt-2 ${
                              theme === 'dark' ? 'text-white/50' : 'text-black/50'
                            }`}>
                              {session.message_count} messages • {new Date(session.updated_at).toLocaleDateString()}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (editingSessionId === session.id) {
                              // Cancel edit mode if already editing this session
                              setEditingSessionId(null);
                              setEditingSessionName('');
                            } else {
                              // Start editing this session
                              setEditingSessionId(session.id);
                              setEditingSessionName(session.name);
                            }
                          }}
                          className={`p-1 rounded transition-colors ${
                            theme === 'dark'
                              ? 'text-white/40 hover:text-white hover:bg-white/10'
                              : 'text-black/40 hover:text-black hover:bg-black/10'
                          }`}
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSession(session.id);
                          }}
                          className={`p-1 rounded transition-colors ${
                            theme === 'dark'
                              ? 'text-white/40 hover:text-red-400 hover:bg-red-400/10'
                              : 'text-black/40 hover:text-red-400 hover:bg-red-400/10'
                          }`}
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 'achievements':
        return (
          <div className="p-2 lg:p-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}>Rewards</h3>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className={`font-semibold text-sm ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>{totalPoints} pts</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 overflow-y-auto" style={{maxHeight: 'calc(100vh - 300px)'}}>
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
                            <Award className="w-4 h-4 text-yellow-400" />
                          )}
                        </div>
                        {isUnlocked && (
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-400" />
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
                      
                      <p className={`text-xs mb-2 ${
                        theme === 'dark' ? 'text-white/70' : 'text-black/70'
                      }`}>
                        {achievement.description}
                      </p>
                      
                      {/* Progress bar for locked achievements */}
                      {!isUnlocked && (
                        <div className="space-y-1">
                          <div className={`w-full rounded-full h-2 ${
                            theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
                          }`}>
                            <div 
                              className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`text-xs ${
                              theme === 'dark' ? 'text-white/50' : 'text-black/50'
                            }`}>
                              {achievement.progress}/{achievement.target}
                            </span>
                            <span className="text-xs text-purple-400">
                              +{achievement.points} pts
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'home':
        return (
          <div className="p-2 lg:p-4 space-y-6">
            {/* Show editing form if editing */}
            {editingDomain ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-sm font-semibold ${
                    theme === 'dark' ? 'text-white' : 'text-black'
                  }`}>Edit Class</h3>
                  <button
                    onClick={() => {
                      setEditingDomain(null);
                      setEditingDomainName('');
                      setEditingDomainType(DomainType.GENERAL);
                      setEditingDomainDescription('');
                      setEditingDomainDocuments([]);
                    }}
                    className={`p-1 rounded-lg transition-colors ${
                      theme === 'dark' 
                        ? 'text-white/60 hover:text-white hover:bg-white/10' 
                        : 'text-black/60 hover:text-black hover:bg-black/10'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-2 ${
                    theme === 'dark' ? 'text-white/80' : 'text-black/80'
                  }`}>
                    Class Name
                  </label>
                  <input
                    type="text"
                    value={editingDomainName}
                    onChange={(e) => setEditingDomainName(e.target.value)}
                    placeholder="e.g., History 101"
                    className={`w-full border rounded-lg px-3 py-2 text-sm ${
                      theme === 'dark'
                        ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                        : 'bg-black/10 border-black/20 text-black placeholder-black/50'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-2 ${
                    theme === 'dark' ? 'text-white/80' : 'text-black/80'
                  }`}>
                    Class Type
                  </label>
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
                          onClick={() => setEditingDomainType(type as DomainType)}
                          className={`p-2 rounded text-xs transition-all duration-200 flex flex-col items-center space-y-1 ${
                            editingDomainType === type
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
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-2 ${
                    theme === 'dark' ? 'text-white/80' : 'text-black/80'
                  }`}>
                    Description (Optional)
                  </label>
                  <textarea
                    value={editingDomainDescription}
                    onChange={(e) => setEditingDomainDescription(e.target.value)}
                    placeholder="Describe what this class is about..."
                    className={`w-full border rounded-lg px-3 py-2 text-sm h-20 resize-none ${
                      theme === 'dark'
                        ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                        : 'bg-black/10 border-black/20 text-black placeholder-black/50'
                    }`}
                  />
                </div>

                {availableDocuments.length > 0 && (
                  <div>
                    <label className={`block text-xs font-medium mb-2 ${
                      theme === 'dark' ? 'text-white/80' : 'text-black/80'
                    }`}>
                      Assign Documents
                    </label>
                    <div className={`max-h-32 overflow-y-auto space-y-1 rounded-lg p-2 border ${
                      theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
                    }`}>
                      {availableDocuments.map(doc => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => {
                            setEditingDomainDocuments(prev => 
                              prev.includes(doc.id)
                                ? prev.filter(id => id !== doc.id)
                                : [...prev, doc.id]
                            );
                          }}
                          className={`w-full text-left p-2 rounded text-xs flex items-center justify-between transition-colors ${
                            editingDomainDocuments.includes(doc.id)
                              ? theme === 'dark'
                                ? 'bg-white/15 text-white'
                                : 'bg-black/15 text-black'
                              : theme === 'dark'
                                ? 'text-white/70 hover:bg-white/10'
                                : 'text-black/70 hover:bg-black/10'
                          }`}
                        >
                          <span className="truncate">{doc.filename}</span>
                          {editingDomainDocuments.includes(doc.id) && (
                            <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      if (editingDomainName.trim()) {
                        onEditDomain?.(editingDomain.id, editingDomainName, editingDomainType, editingDomainDescription);
                        onAssignDocuments(editingDomain.id, editingDomainDocuments);
                        setEditingDomain(null);
                        setEditingDomainName('');
                        setEditingDomainType(DomainType.GENERAL);
                        setEditingDomainDescription('');
                        setEditingDomainDocuments([]);
                      }
                    }}
                    disabled={!editingDomainName.trim()}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 rounded-lg transition-all duration-200 disabled:opacity-50 text-sm"
                  >
                    Update Class
                  </button>
                  <button
                    onClick={() => {
                      setEditingDomain(null);
                      setEditingDomainName('');
                      setEditingDomainType(DomainType.GENERAL);
                      setEditingDomainDescription('');
                      setEditingDomainDocuments([]);
                    }}
                    className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                      theme === 'dark'
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-black/10 hover:bg-black/20 text-black'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
            <div>
            {/* Classes Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>Your Classes</h3>
                <button
                  onClick={() => setShowCreateClassForm(!showCreateClassForm)}
                  className={`p-1 rounded-lg transition-colors ${
                    showCreateClassForm
                      ? theme === 'dark'
                        ? 'bg-white/20 text-white'
                        : 'bg-black/20 text-black'
                      : theme === 'dark'
                        ? 'text-white/60 hover:text-white hover:bg-white/10'
                        : 'text-black/60 hover:text-black hover:bg-black/10'
                  }`}
                  title="Create Class"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              
              {/* Create Class Form */}
              {showCreateClassForm && (
                <div className={`mb-4 p-3 rounded-lg border ${
                  theme === 'dark' 
                    ? 'bg-white/5 border-white/20' 
                    : 'bg-black/5 border-black/20'
                }`}>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
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
                            onClick={() => setNewClassType(type as DomainType)}
                            className={`p-2 rounded text-xs transition-all duration-200 flex flex-col items-center space-y-1 ${
                              newClassType === type
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
                    {availableDocuments.length > 0 && (
                      <div>
                        <label className={`block text-xs font-medium mb-2 ${
                          theme === 'dark' ? 'text-white/80' : 'text-black/80'
                        }`}>
                          Assign Documents (Optional)
                        </label>
                        <div className={`max-h-32 overflow-y-auto space-y-1 rounded-lg p-2 border ${
                          theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
                        }`}>
                          {availableDocuments.map(doc => (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => {
                                setSelectedDocuments(prev => 
                                  prev.includes(doc.id)
                                    ? prev.filter(id => id !== doc.id)
                                    : [...prev, doc.id]
                                );
                              }}
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
                        onClick={() => {
                          if (newClassName.trim()) {
                            onCreateDomain(newClassName, newClassType);
                            // Assign documents to the newly created domain
                            if (selectedDocuments.length > 0) {
                              // Get the most recently created domain (it will be the last one)
                              setTimeout(() => {
                                const newDomain = domains[domains.length - 1];
                                if (newDomain) {
                                  onAssignDocuments(newDomain.id, selectedDocuments);
                                }
                              }, 100);
                            }
                            setNewClassName('');
                            setNewClassType(DomainType.GENERAL);
                            setSelectedDocuments([]);
                            setShowCreateClassForm(false);
                          }
                        }}
                        disabled={!newClassName.trim()}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 rounded-lg transition-all duration-200 disabled:opacity-50 text-sm"
                      >
                        Create Class
                      </button>
                      <button
                        onClick={() => {
                          setShowCreateClassForm(false);
                          setNewClassName('');
                          setNewClassType(DomainType.GENERAL);
                          setSelectedDocuments([]);
                        }}
                        className={`px-3 py-2 rounded-lg transition-colors text-sm ${
                          theme === 'dark'
                            ? 'bg-white/10 hover:bg-white/20 text-white'
                            : 'bg-black/10 hover:bg-black/20 text-black'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {domains.length === 0 ? (
                <div className="text-center py-6">
                  <div className={`text-sm mb-3 ${
                    theme === 'dark' ? 'text-white/60' : 'text-black/60'
                  }`}>No classes yet</div>
                  <button
                    onClick={() => setShowCreateClassForm(true)}
                    className={`text-xs py-1 px-3 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-black/10 hover:bg-black/20 text-black'
                    }`}
                  >
                    Create Your First Class
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {domains.map(domain => {
                    const typeInfo = {
                      [DomainType.GENERAL]: { icon: Home, label: 'General', color: 'blue' },
                      [DomainType.LAW]: { icon: Book, label: 'Law', color: 'amber' },
                      [DomainType.SCIENCE]: { icon: Beaker, label: 'Science', color: 'green' },
                      [DomainType.MEDICINE]: { icon: Heart, label: 'Medicine', color: 'red' },
                      [DomainType.BUSINESS]: { icon: Briefcase, label: 'Business', color: 'purple' },
                      [DomainType.HUMANITIES]: { icon: GraduationCap, label: 'Humanities', color: 'pink' },
                      [DomainType.COMPUTER_SCIENCE]: { icon: Code, label: 'Computer Science', color: 'cyan' },
                    }[domain.type];
                    const Icon = typeInfo.icon;
                    const isActive = activeDomain?.id === domain.id;

                    return (
                      <div
                        key={domain.id}
                        onClick={() => onSelectDomain(domain)}
                        className={`relative w-full text-left p-3 rounded-lg transition-all duration-200 group cursor-pointer ${
                          isActive
                            ? theme === 'dark'
                              ? 'bg-white/15 border border-white/20'
                              : 'bg-black/15 border border-black/20'
                            : theme === 'dark'
                              ? 'bg-white/5 hover:bg-white/10 border border-transparent'
                              : 'bg-black/5 hover:bg-black/10 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg bg-${typeInfo.color}-500/20`}>
                              <Icon className={`w-4 h-4 text-${typeInfo.color}-300`} />
                            </div>
                            <div className="flex-1">
                              <div className={`font-medium text-sm ${
                                theme === 'dark' ? 'text-white' : 'text-black'
                              }`}>
                                {domain.name}
                              </div>
                              <div className={`text-xs flex items-center justify-between ${
                                theme === 'dark' ? 'text-white/60' : 'text-black/60'
                              }`}>
                                <span>{typeInfo.label}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ml-2 ${
                                  theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
                                }`}>
                                  {(domain.documents || []).length} doc{(domain.documents || []).length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingDomain(domain);
                                setEditingDomainName(domain.name);
                                setEditingDomainType(domain.type);
                                setEditingDomainDescription(domain.description || '');
                                setEditingDomainDocuments(domain.documents || []);
                              }}
                              className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded ${
                                theme === 'dark' 
                                  ? 'hover:bg-white/10 text-white/60 hover:text-white' 
                                  : 'hover:bg-black/10 text-black/60 hover:text-black'
                              }`}
                              title="Edit Class"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteDomain(domain.id);
                              }}
                              className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded ${
                                theme === 'dark' 
                                  ? 'hover:bg-red-500/20 text-white/60 hover:text-red-400' 
                                  : 'hover:bg-red-500/20 text-black/60 hover:text-red-600'
                              }`}
                              title="Delete Class"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chats Section */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>Recent Chats</h3>
                <button
                  onClick={onNewSession}
                  className={`text-xs py-1 px-3 rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white'
                      : 'bg-black/10 hover:bg-black/20 text-black/70 hover:text-black'
                  }`}
                >
                  New Chat
                </button>
              </div>
              
              {currentSessions.length === 0 ? (
                <div className="text-center py-6">
                  <MessageSquare className={`w-8 h-8 mx-auto mb-3 ${
                    theme === 'dark' ? 'text-white/30' : 'text-black/30'
                  }`} />
                  <div className={`text-sm mb-3 ${
                    theme === 'dark' ? 'text-white/60' : 'text-black/60'
                  }`}>No chats yet</div>
                  <button
                    onClick={onNewSession}
                    className={`text-xs py-1 px-3 rounded-lg transition-colors ${
                      theme === 'dark'
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-black/10 hover:bg-black/20 text-black'
                    }`}
                  >
                    New Chat
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentSessions.map(session => {
                    const isActive = currentBackendSessionId === session.id;
                    // Find which domain this session belongs to
                    const sessionDomain = domains.find(d => d.id === session.domain);
                    
                    return (
                      <div key={session.id}>
                        <button
                          onClick={() => onSelectSession?.(session.id)}
                          className={`relative w-full text-left p-3 rounded-lg transition-all duration-200 group ${
                            isActive
                              ? theme === 'dark'
                                ? 'bg-white/15 border border-white/20'
                                : 'bg-black/15 border border-black/20'
                              : theme === 'dark'
                                ? 'bg-white/5 hover:bg-white/10 border border-transparent'
                                : 'bg-black/5 hover:bg-black/10 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1">
                              {/* Class Badge - Far Left */}
                              <div className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                                theme === 'dark' 
                                  ? 'bg-white/10 text-white/60' 
                                  : 'bg-black/10 text-black/60'
                              }`}>
                                {sessionDomain ? sessionDomain.name : 'General'}
                              </div>
                              
                              {/* Chat Content */}
                              <div className="flex-1 min-w-0">
                                <div className={`font-medium text-sm truncate ${
                                  theme === 'dark' ? 'text-white' : 'text-black'
                                }`}>
                                  {editingSessionId === session.id ? (
                                    <input
                                      type="text"
                                      value={editingSessionName}
                                      onChange={(e) => setEditingSessionName(e.target.value)}
                                      onBlur={() => {
                              if (editingSessionName.trim() && editingSessionName !== session.name) {
                                handleRenameSession(session.id, editingSessionName);
                              } else {
                                setEditingSessionId(null);
                                setEditingSessionName('');
                              }
                            }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleRenameSession(session.id, editingSessionName);
                                        if (e.key === 'Escape') {
                                          setEditingSessionId(null);
                                          setEditingSessionName('');
                                        }
                                      }}
                                      className={`w-full bg-transparent border-none outline-none ${
                                        theme === 'dark' ? 'text-white' : 'text-black'
                                      }`}
                                      autoFocus
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    session.name
                                  )}
                                </div>
                                <div className={`text-xs ${
                                  theme === 'dark' ? 'text-white/60' : 'text-black/60'
                                }`}>
                                  {new Date(session.updated_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {!editingSessionId && (
                                <>
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingSessionId(session.id);
                                      setEditingSessionName(session.name);
                                    }}
                                    className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded cursor-pointer ${
                                      theme === 'dark'
                                        ? 'hover:bg-white/10 text-white/60 hover:text-white'
                                        : 'hover:bg-black/10 text-black/60 hover:text-black'
                                    }`}
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </div>
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSession(session.id);
                                    }}
                                    className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded cursor-pointer ${
                                      theme === 'dark'
                                        ? 'hover:bg-red-500/20 text-white/60 hover:text-red-400'
                                        : 'hover:bg-red-500/20 text-black/60 hover:text-red-600'
                                    }`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`h-full w-full lg:w-96 backdrop-blur-md border-r flex flex-col ${
      theme === 'dark'
        ? 'bg-white/10 border-white/20'
        : 'bg-black/10 border-black/20'
    }`}>
      {/* Header with tabs */}
      <div className={`flex items-center justify-between p-2 lg:p-4 border-b ${
        theme === 'dark' ? 'border-white/10' : 'border-black/10'
      }`}>
        <div className="flex items-center space-x-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('home')}
            className={`px-2 lg:px-3 py-1 text-xs rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'home' 
                ? (theme === 'dark' ? 'bg-white/20 text-white' : 'bg-black/20 text-black')
                : (theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10')
            }`}
          >
            Home
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-2 lg:px-3 py-1 text-xs rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'documents' 
                ? (theme === 'dark' ? 'bg-white/20 text-white' : 'bg-black/20 text-black')
                : (theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10')
            }`}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-2 lg:px-3 py-1 text-xs rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'achievements' 
                ? (theme === 'dark' ? 'bg-white/20 text-white' : 'bg-black/20 text-black')
                : (theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10')
            }`}
          >
            Rewards
          </button>
          <button
            onClick={() => setActiveTab('help')}
            className={`px-2 lg:px-3 py-1 text-xs rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'help' 
                ? (theme === 'dark' ? 'bg-white/20 text-white' : 'bg-black/20 text-black')
                : (theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10')
            }`}
          >
            Help
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onCloseSidebar}
            className={`p-1 rounded-lg transition-colors ${
              theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10'
            }`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {renderTabContent()}
      </div>
      
      {/* Footer with Settings */}
      <div className={`p-4 border-t ${
        theme === 'dark' ? 'border-white/10' : 'border-black/10'
      }`}>
        <button
          onClick={onOpenSettings}
          className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 group ${
            theme === 'dark' 
              ? 'text-white/70' 
              : 'text-black/70'
          }`}
        >
          <Settings className={`w-5 h-5 transition-colors ${
            theme === 'dark' 
              ? 'group-hover:text-white' 
              : 'group-hover:text-black'
          }`} />
          <span className={`text-sm font-medium transition-colors ${
            theme === 'dark' 
              ? 'group-hover:text-white' 
              : 'group-hover:text-black'
          }`}>Settings</span>
        </button>
      </div>
    </div>
  );
};