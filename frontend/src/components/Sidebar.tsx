import React, { useState } from 'react';
import { Plus, Trash, RefreshCw, ChevronRight, Upload, File, Trash2, RotateCcw, MessageSquare, X, Sun, Moon, Trophy, BookOpen, Sparkles, Heart, Star, Zap, Award, Settings } from 'lucide-react';
import { DomainManager } from './DomainManager';
import { ThemeToggle } from './ThemeToggle';
import { SettingsModal } from './SettingsModal';
import { useTheme } from '../contexts/ThemeContext';
import { DomainType, Document, UserDomain } from '../types';

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
  isCollapsed?: boolean;
  documents: Document[];
  onUpload: (file: File) => Promise<void>;
  onDeleteDocument: (documentId: string) => Promise<void>;
  onReindex: () => Promise<void>;
  isLoading: boolean;
  onOpenSidebar?: () => void;
  onCloseSidebar?: () => void;
  backgroundCommandCount?: number;
}

type TabType = 'domains' | 'library' | 'session' | 'achievements';

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
  isCollapsed,
  documents,
  onUpload,
  onDeleteDocument,
  onReindex,
  isLoading,
  onOpenSidebar,
  onCloseSidebar,
  backgroundCommandCount = 1,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('domains');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Achievement system
  const [totalPoints] = useState(150);
  const achievements = [
    {
      id: 'active_learning',
      title: 'Active Learning',
      description: 'Asked 10+ questions',
      icon: BookOpen,
      color: 'text-blue-400',
      points: 50,
      unlocked: messageCount >= 10,
      progress: Math.min(messageCount, 10),
      maxProgress: 10
    },
    {
      id: 'top_researcher',
      title: 'Top Researcher', 
      description: 'Completed 5+ research sessions',
      icon: Trophy,
      color: 'text-yellow-400',
      points: 75,
      unlocked: true,
      progress: 5,
      maxProgress: 5
    },
    {
      id: 'creative_thinker',
      title: 'Creative Thinker',
      description: 'Used background command 3+ times', 
      icon: Sparkles,
      color: 'text-purple-400',
      points: 25,
      unlocked: backgroundCommandCount >= 3,
      progress: Math.min(backgroundCommandCount, 3),
      maxProgress: 3
    }
  ];

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

  if (isCollapsed) {
    return (
      <div className={`h-full w-16 backdrop-blur-md border-r flex flex-col items-center py-4 space-y-3 ${
        theme === 'dark' 
          ? 'bg-white/10 border-white/20' 
          : 'bg-black/10 border-black/20'
      }`}>
        <button 
          onClick={() => { setActiveTab('domains'); onOpenSidebar?.(); }}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'domains' 
              ? (theme === 'dark' ? 'bg-white/20 text-white' : 'bg-black/20 text-black')
              : (theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10')
          }`}
          title="Domains"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        <button 
          onClick={() => { setActiveTab('library'); onOpenSidebar?.(); }}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'library' 
              ? (theme === 'dark' ? 'bg-white/20 text-white' : 'bg-black/20 text-black')
              : (theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10')
          }`}
          title="Library"
        >
          <File className="w-4 h-4" />
        </button>
        <button 
          onClick={() => { setActiveTab('session'); onOpenSidebar?.(); }}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'session' 
              ? (theme === 'dark' ? 'bg-white/20 text-white' : 'bg-black/20 text-black')
              : (theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10')
          }`}
          title="Session"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button 
          onClick={() => { setActiveTab('achievements'); onOpenSidebar?.(); }}
          className={`p-2 rounded-lg transition-colors ${
            activeTab === 'achievements' 
              ? (theme === 'dark' ? 'bg-white/20 text-white' : 'bg-black/20 text-black')
              : (theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10')
          }`}
          title="Achievements"
        >
          <Trophy className="w-4 h-4" />
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
      
      case 'library':
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}>Document Library</h3>
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
              <div className="space-y-2 max-h-64 overflow-y-auto">
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

      case 'session':
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}>Session</h3>
            </div>

            <div className="space-y-3">
              <div className={`rounded-lg p-3 ${
                theme === 'dark' ? 'bg-white/5' : 'bg-black/5'
              }`}>
                <div className={`text-xs mb-1 ${
                  theme === 'dark' ? 'text-white/60' : 'text-black/60'
                }`}>Session ID</div>
                <div className={`text-xs font-mono truncate ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>{sessionId}</div>
              </div>

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
                }`}>Commands</div>
                <div className={`space-y-2 text-xs ${
                  theme === 'dark' ? 'text-white/70' : 'text-black/70'
                }`}>
                  <div><span className={`font-mono px-1 rounded ${
                    theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
                  }`}>/search</span> - Search documents</div>
                  <div><span className={`font-mono px-1 rounded ${
                    theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
                  }`}>/summarize</span> - Summarize content</div>
                  <div><span className={`font-mono px-1 rounded ${
                    theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
                  }`}>/background</span> - Get background uncited info</div>
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

      case 'achievements':
        return (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-semibold ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}>Achievements</h3>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className={`font-semibold text-sm ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>{totalPoints} pts</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {achievements.map(achievement => {
                const Icon = achievement.icon;
                return (
                  <div
                    key={achievement.id}
                    className={`relative p-3 rounded-lg transition-all duration-200 ${
                      achievement.unlocked 
                        ? (theme === 'dark' ? 'bg-white/10 shadow-lg' : 'bg-black/10 shadow-lg')
                        : (theme === 'dark' ? 'bg-white/5' : 'bg-black/5')
                    }`}
                  >
                    {/* Achievement unlocked glow effect */}
                    {achievement.unlocked && (
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-lg animate-pulse" />
                    )}
                    
                    <div className="relative">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-5 h-5 ${achievement.color}`} />
                          {achievement.unlocked && (
                            <Award className="w-4 h-4 text-yellow-400" />
                          )}
                        </div>
                        {achievement.unlocked && (
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-400" />
                            <span className="text-xs text-yellow-400 font-semibold">
                              +{achievement.points}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <h4 className={`text-sm font-medium mb-1 ${
                        achievement.unlocked 
                          ? (theme === 'dark' ? 'text-white' : 'text-black')
                          : (theme === 'dark' ? 'text-white/60' : 'text-black/60')
                      }`}>
                        {achievement.title}
                      </h4>
                      
                      <p className={`text-xs mb-2 ${
                        theme === 'dark' ? 'text-white/70' : 'text-black/70'
                      }`}>
                        {achievement.description}
                      </p>
                      
                      {/* Progress bar for locked achievements */}
                      {!achievement.unlocked && (
                        <div className="space-y-1">
                          <div className={`w-full rounded-full h-2 ${
                            theme === 'dark' ? 'bg-white/10' : 'bg-black/10'
                          }`}>
                            <div 
                              className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`text-xs ${
                              theme === 'dark' ? 'text-white/50' : 'text-black/50'
                            }`}>
                              {achievement.progress}/{achievement.maxProgress}
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

      default:
        return null;
    }
  };

  return (
    <div className={`h-full w-96 backdrop-blur-md border-r flex flex-col ${
      theme === 'dark' 
        ? 'bg-white/10 border-white/20' 
        : 'bg-black/10 border-black/20'
    }`}>
      {/* Header with tabs */}
      <div className={`flex items-center justify-between p-4 border-b ${
        theme === 'dark' ? 'border-white/10' : 'border-black/10'
      }`}>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('domains')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              activeTab === 'domains' 
                ? (theme === 'dark' ? 'bg-white/20 text-white' : 'bg-black/20 text-black')
                : (theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10')
            }`}
          >
            Domains
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              activeTab === 'library' 
                ? (theme === 'dark' ? 'bg-white/20 text-white' : 'bg-black/20 text-black')
                : (theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10')
            }`}
          >
            Library
          </button>
          <button
            onClick={() => setActiveTab('session')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              activeTab === 'session' 
                ? (theme === 'dark' ? 'bg-white/20 text-white' : 'bg-black/20 text-black')
                : (theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10')
            }`}
          >
            Session
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              activeTab === 'achievements' 
                ? (theme === 'dark' ? 'bg-white/20 text-white' : 'bg-black/20 text-black')
                : (theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10')
            }`}
          >
            Achievements
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
      <div className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </div>
      
      {/* Footer with Settings */}
      <div className={`p-4 border-t ${
        theme === 'dark' ? 'border-white/10' : 'border-black/10'
      }`}>
        <button
          onClick={() => setShowSettings(true)}
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
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </div>
  );
};