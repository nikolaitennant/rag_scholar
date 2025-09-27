import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Settings, History, HelpCircle, Menu, Gift, Home, File, Trophy, Star, Zap, Heart, Award, Sparkles, X, BookOpen, Upload, Book, Beaker, Briefcase, Code, GraduationCap, Edit3, Trash2, MessageSquare } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { DomainType, Document, UserClass } from '../types';
import { apiService } from '../services/api';
import { AchievementSection, ClassSection, DocumentSection, SessionHistorySection } from './sidebar/index';
import { DOMAIN_TYPE_INFO } from '../constants/domains';

interface SidebarProps {
  classes: UserClass[];
  activeClass: UserClass | null;
  onCreateClass: (name: string, domainType: DomainType, description?: string, selectedDocuments?: string[]) => void;
  onEditClass?: (classId: string, name: string, domainType: DomainType, description?: string) => void;
  onSelectClass: (userClass: UserClass) => void;
  onDeleteClass: (classId: string) => void;
  availableDocuments: { id: string; filename: string }[];
  onAssignDocuments: (classId: string, documentIds: string[]) => void;
  sessionId: string;
  messageCount: number;
  onClearChat: () => void;
  onNewSession: () => void;
  onSelectSession?: (sessionId: string) => void;
  onRenameSession?: (sessionId: string, newName: string) => Promise<void>;
  isCollapsed?: boolean;
  documents: Document[];
  onUpload: (file: File) => Promise<void>;
  onDeleteDocument: (documentId: string) => Promise<void>;
  onReindex: () => Promise<void>;
  onAssignToClass: (documentId: string, documentSource: string, classId: string, operation: 'add' | 'remove') => Promise<void>;
  isLoading: boolean;
  loadingDocuments?: Set<string>;
  onOpenSidebar?: () => void;
  onCloseSidebar?: () => void;
  backgroundCommandCount?: number;
  onOpenSettings?: () => void;
  onOpenFeedback?: () => void;
  sessions?: any[];
  currentBackendSessionId?: string | null;
  onDeleteSession?: (sessionId: string) => void;
  // Loading state props
  appLoading?: boolean;
  loadingStatus?: string;
}

type TabType = 'home' | 'classes' | 'history' | 'documents' | 'achievements' | 'store' | 'help';

// Helper function for formatting dates
const formatLocalDate = (dateString: string | Date) => {
  try {
    const date = new Date(dateString);
    const timezone = localStorage.getItem('userTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
    return date.toLocaleDateString('en-US', { timeZone: timezone });
  } catch {
    return 'Invalid date';
  }
};

export const Sidebar: React.FC<SidebarProps> = ({
  classes,
  activeClass,
  onCreateClass,
  onEditClass,
  onSelectClass,
  onDeleteClass,
  availableDocuments,
  onAssignDocuments,
  sessionId,
  messageCount,
  onClearChat,
  onNewSession,
  onSelectSession,
  onRenameSession,
  isCollapsed,
  documents,
  onUpload,
  onDeleteDocument,
  onReindex,
  onAssignToClass,
  isLoading,
  loadingDocuments = new Set(),
  onOpenSidebar,
  onCloseSidebar,
  backgroundCommandCount = 1,
  onOpenSettings,
  onOpenFeedback,
  sessions: propSessions = [],
  currentBackendSessionId,
  onDeleteSession,
  appLoading = false,
  loadingStatus = '',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionName, setEditingSessionName] = useState<string>('');
  const [editingClass, setEditingClass] = useState<UserClass | null>(null);
  const [editingClassName, setEditingClassName] = useState<string>('');
  const [editingClassType, setEditingClassType] = useState<DomainType>(DomainType.GENERAL);
  const [editingClassDocuments, setEditingClassDocuments] = useState<string[]>([]);
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [creatingClass, setCreatingClass] = useState(false);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);
  const [showCreateClassForm, setShowCreateClassForm] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  const [newClassType, setNewClassType] = useState<DomainType>(DomainType.GENERAL);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [documentClassFilter, setDocumentClassFilter] = useState<string>('');
  const [classFilterOpen, setClassFilterOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, left: number, width: number} | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Dynamic loading state for chats visibility
  const [chatsVisible, setChatsVisible] = useState(false);
  const [showDynamicLoading, setShowDynamicLoading] = useState(false);
  const chatsContainerRef = useRef<HTMLDivElement>(null);
  const chatItemsRef = useRef<HTMLDivElement>(null);


  const [addToClassOpen, setAddToClassOpen] = useState<string | null>(null);
  const [addToClassPosition, setAddToClassPosition] = useState<{top: number, left: number, width: number} | null>(null);
  const addToClassRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const { theme, background } = useTheme();
  
  // Use prop sessions if available, fallback to local sessions
  const allSessions = propSessions.length > 0 ? propSessions : sessions;


  // Filter sessions by active class selection

  const currentSessions = activeClass
    ? allSessions.filter(session => {
        // When a class is selected, only show sessions for that specific class
        return session.class_id === activeClass.id;
      })
    : allSessions.filter(session => {
        // When no class is selected, only show sessions without a class_id
        return !session.class_id;
      });


  // Get real user data
  const { user, userProfile } = useUser();
  const totalPoints = userProfile?.stats?.total_points || 0;
  const achievements = userProfile?.achievements || [];

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
          // Session management removed - no longer loading sessions from API
          const userSessions: any[] = [];
          setSessions(userSessions);
        } catch (error) {
          console.error('Failed to load sessions:', error);
        }
      }
    };

    loadSessions();
  }, [user]);

  // Disable dynamic loading temporarily due to compilation errors
  useEffect(() => {
    setChatsVisible(true);
    setShowDynamicLoading(false);
  }, [currentSessions.length]);

  const handleDeleteSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    const sessionName = session?.name || sessionId;
    
    if (!window.confirm(`Are you sure you want to delete the chat "${sessionName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      // Session management removed - using onDeleteSession prop only
      if (onDeleteSession) {
        onDeleteSession(sessionId);
      }
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleRenameSession = async (sessionId: string, newName: string) => {
    try {
      if (onRenameSession) {
        await onRenameSession(sessionId, newName);
      } else {
        // Session management removed - using onRenameSession prop only
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, name: newName } : s));
      }
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
      <div className={`h-full w-16 backdrop-blur-md border-r flex flex-col items-center py-4 ${
        theme === 'dark'
          ? 'bg-white/10 border-white/20'
          : 'bg-black/10 border-black/20'
      }`}>
        {/* Expand button at top */}
        <button
          onClick={onOpenSidebar}
          className={`p-2 rounded-lg transition-colors mb-2 ${
            theme === 'dark'
              ? 'text-white/60 hover:text-white hover:bg-white/10'
              : 'text-black/60 hover:text-black hover:bg-black/10'
          }`}
          title="Expand Sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex flex-col items-center space-y-2 -mt-2">
        <button
          onClick={() => { setActiveTab('home'); onOpenSidebar?.(); }}
          className={`p-2 rounded-lg transition-all ${
            activeTab === 'home'
              ? (theme === 'dark' ? 'text-white font-bold' : 'text-black font-bold')
              : (theme === 'dark' ? 'text-white/60 hover:text-white hover:font-bold' : 'text-black/60 hover:text-black hover:font-bold')
          }`}
          title="Home"
        >
          <Home className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setActiveTab('documents'); onOpenSidebar?.(); }}
          className={`p-2 rounded-lg transition-all ${
            activeTab === 'documents'
              ? (theme === 'dark' ? 'text-white font-bold' : 'text-black font-bold')
              : (theme === 'dark' ? 'text-white/60 hover:text-white hover:font-bold' : 'text-black/60 hover:text-black hover:font-bold')
          }`}
          title="Docs"
        >
          <File className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setActiveTab('achievements'); onOpenSidebar?.(); }}
          className={`p-2 rounded-lg transition-all ${
            activeTab === 'achievements'
              ? (theme === 'dark' ? 'text-white font-bold' : 'text-black font-bold')
              : (theme === 'dark' ? 'text-white/60 hover:text-white hover:font-bold' : 'text-black/60 hover:text-black hover:font-bold')
          }`}
          title="Rewards"
        >
          <Trophy className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setActiveTab('store'); onOpenSidebar?.(); }}
          className={`p-2 rounded-lg transition-all ${
            activeTab === 'store'
              ? (theme === 'dark' ? 'text-white font-bold' : 'text-black font-bold')
              : (theme === 'dark' ? 'text-white/60 hover:text-white hover:font-bold' : 'text-black/60 hover:text-black hover:font-bold')
          }`}
          title="Store"
        >
          <Gift className="w-[18px] h-[18px]" />
        </button>
        <button
          onClick={() => { setActiveTab('help'); onOpenSidebar?.(); }}
          className={`p-2 rounded-lg transition-all ${
            activeTab === 'help'
              ? (theme === 'dark' ? 'text-white font-bold' : 'text-black font-bold')
              : (theme === 'dark' ? 'text-white/60 hover:text-white hover:font-bold' : 'text-black/60 hover:text-black hover:font-bold')
          }`}
          title="Help"
        >
          <HelpCircle className="w-[18px] h-[18px]" />
        </button>
        </div>

        {/* Settings button at bottom */}
        <div className="mt-auto">
          <button
            onClick={onOpenSettings}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark'
                ? 'text-white/60 hover:text-white hover:bg-white/10'
                : 'text-black/60 hover:text-black hover:bg-black/10'
            }`}
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'classes':
        return (
          <ClassSection
            classes={classes}
            activeClass={activeClass}
            onCreateClass={onCreateClass}
            onEditClass={onEditClass}
            onSelectClass={onSelectClass}
            onDeleteClass={onDeleteClass}
            availableDocuments={availableDocuments}
            onAssignDocuments={onAssignDocuments}
            documents={documents}
          />
        );
      
      case 'documents':
        return (
          <DocumentSection
            documents={documents}
            classes={classes}
            isLoading={isLoading}
            onFileUpload={handleFileUpload}
            onReindex={onReindex}
            onAssignToClass={onAssignToClass}
            onDeleteDocument={onDeleteDocument}
          />
        );

      case 'help':
        return (
          <div className="p-4 space-y-6">
            <div>
              <h3 className={`text-base font-medium ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}>Help</h3>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                onClick={onClearChat}
                className={`flex-1 text-sm py-2.5 px-3 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'bg-white/5 hover:bg-white/10 text-white/80'
                    : 'bg-black/5 hover:bg-black/10 text-black/80'
                }`}
              >
                Clear Chat
              </button>
              <button
                onClick={onNewSession}
                className={`flex-1 text-sm py-2.5 px-3 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'bg-white/5 hover:bg-white/10 text-white/80'
                    : 'bg-black/5 hover:bg-black/10 text-black/80'
                }`}
              >
                New Session
              </button>
            </div>

            {/* Getting Started */}
            <div className={`p-4 rounded-xl ${
              theme === 'dark' ? 'bg-white/5' : 'bg-black/5'
            }`}>
              <h4 className={`text-sm font-medium mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}>Getting Started</h4>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-500 text-xs font-semibold">1</span>
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      Upload documents
                    </div>
                    <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                      Add PDFs and text files in the Documents tab
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-500 text-xs font-semibold">2</span>
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      Create classes
                    </div>
                    <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                      Organize documents by subject or project
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-purple-500 text-xs font-semibold">3</span>
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      Ask questions
                    </div>
                    <div className={`text-xs mt-1 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                      Chat about your content with citations
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Commands */}
            <div>
              <h4 className={`text-sm font-medium mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}>Special Commands</h4>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className={`text-xs px-2 py-1 rounded ${
                    theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/10 text-black'
                  }`}>/background</code>
                  <span className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-black/70'}`}>
                    General knowledge
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className={`text-xs px-2 py-1 rounded ${
                    theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/10 text-black'
                  }`}>/summarize</code>
                  <span className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-black/70'}`}>
                    Summarize documents
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className={`text-xs px-2 py-1 rounded ${
                    theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/10 text-black'
                  }`}>/explain</code>
                  <span className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-black/70'}`}>
                    Simple explanations
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className={`text-xs px-2 py-1 rounded ${
                    theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/10 text-black'
                  }`}>/search</code>
                  <span className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-black/70'}`}>
                    Search documents
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className={`text-xs px-2 py-1 rounded ${
                    theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/10 text-black'
                  }`}>/compare</code>
                  <span className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-black/70'}`}>
                    Compare concepts
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className={`text-xs px-2 py-1 rounded ${
                    theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/10 text-black'
                  }`}>/cite</code>
                  <span className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-black/70'}`}>
                    Find citations
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className={`text-xs px-2 py-1 rounded ${
                    theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/10 text-black'
                  }`}>/persona</code>
                  <span className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-black/70'}`}>
                    Set AI personality
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className={`text-xs px-2 py-1 rounded ${
                    theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/10 text-black'
                  }`}>/reset</code>
                  <span className={`text-xs ${theme === 'dark' ? 'text-white/70' : 'text-black/70'}`}>
                    Clear persona
                  </span>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className={`p-4 rounded-xl border ${
              theme === 'dark' ? 'bg-white/5 border-white/20' : 'bg-black/5 border-black/20'
            }`}>
              <h4 className={`text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}>Need Help?</h4>
              <p className={`text-xs mb-3 ${
                theme === 'dark' ? 'text-white/80' : 'text-black/80'
              }`}>
                Found a bug or have a suggestion?
              </p>
              <button
                onClick={onOpenFeedback}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'bg-white/10 hover:bg-white/15 text-white/90'
                    : 'bg-black/10 hover:bg-black/15 text-black/90'
                }`}
              >
                Send Feedback
              </button>
            </div>
          </div>
        );

      case 'history':
        return (
          <SessionHistorySection
            currentSessions={currentSessions}
            sessionId={sessionId}
            activeClass={activeClass}
            classes={classes}
            onNewSession={onNewSession}
            onSelectSession={onSelectSession}
            onRenameSession={onRenameSession}
            onDeleteSession={onDeleteSession}
            formatLocalDate={formatLocalDate}
          />
        );

      case 'achievements':
        return <AchievementSection userProfile={userProfile} />;

      case 'store':
        return (
          <div className="p-3 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>Store</h3>
                <p className={`text-xs mt-1 ${
                  theme === 'dark' ? 'text-white/60' : 'text-black/60'
                }`}>Redeem your points for rewards</p>
              </div>
              <div className={`rounded-full px-3 py-1 flex items-center gap-1 whitespace-nowrap ${
                theme === 'dark'
                  ? 'bg-gradient-to-r from-yellow-400/20 to-orange-400/20 border border-yellow-400/40'
                  : 'bg-gradient-to-r from-yellow-300/50 to-amber-400/50 border border-amber-500/50'
              }`}>
                <Star className={`w-3 h-3 ${
                  theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
                }`} />
                <span className={`font-bold text-xs ${
                  theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
                }`}>
                  {totalPoints} pts
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {/* Store Items - Mix of Themes & Cosmetics */}
              <div className={`border rounded-lg p-3 ${
                theme === 'dark' ? 'border-white/20 bg-white/5' : 'border-black/20 bg-black/5'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${
                      theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
                    }`} />
                    <span className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      Rounded Chat Input
                    </span>
                  </div>
                  <div className="bg-gradient-to-r from-blue-400/20 to-indigo-400/20 border border-blue-400/40 rounded-full px-2 py-1 flex items-center gap-1">
                    <span className="text-xs text-blue-400 font-bold">
                      150 pts
                    </span>
                  </div>
                </div>
                <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                  Pill-shaped chat input with smooth corners
                </p>
                <button
                  disabled={totalPoints < 150}
                  className={`w-full py-2 px-3 rounded-full text-xs font-bold transition-colors ${
                    totalPoints >= 150
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg'
                      : 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/40 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {totalPoints >= 150 ? 'Redeem' : `Need ${150 - totalPoints} more points`}
                </button>
              </div>

              <div className={`border rounded-lg p-3 ${
                theme === 'dark' ? 'border-white/20 bg-white/5' : 'border-black/20 bg-black/5'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Star className={`w-4 h-4 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
                    <span className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      Space Theme
                    </span>
                  </div>
                  <div className="bg-gradient-to-r from-purple-400/20 to-violet-400/20 border border-purple-400/40 rounded-full px-2 py-1 flex items-center gap-1">
                    <span className="text-xs text-purple-400 font-bold">
                      250 pts
                    </span>
                  </div>
                </div>
                <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                  Deep space colors with starry gradients
                </p>
                <button
                  disabled={totalPoints < 250}
                  className={`w-full py-2 px-3 rounded-full text-xs font-bold transition-colors ${
                    totalPoints >= 250
                      ? 'bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white shadow-lg'
                      : 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/40 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {totalPoints >= 250 ? 'Redeem' : `Need ${250 - totalPoints} more points`}
                </button>
              </div>

              <div className={`border rounded-lg p-3 ${
                theme === 'dark' ? 'border-white/20 bg-white/5' : 'border-black/20 bg-black/5'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Heart className={`w-4 h-4 ${theme === 'dark' ? 'text-pink-400' : 'text-pink-600'}`} />
                    <span className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      Cherry Blossom Theme
                    </span>
                  </div>
                  <div className="bg-gradient-to-r from-pink-400/20 to-rose-400/20 border border-pink-400/40 rounded-full px-2 py-1 flex items-center gap-1 whitespace-nowrap">
                    <span className="text-xs text-pink-400 font-bold">
                      300 pts
                    </span>
                  </div>
                </div>
                <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                  Soft pink and white spring vibes
                </p>
                <button
                  disabled={totalPoints < 300}
                  className={`w-full py-2 px-3 rounded-full text-xs font-bold transition-colors ${
                    totalPoints >= 300
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg'
                      : 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/40 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {totalPoints >= 300 ? 'Redeem' : `Need ${300 - totalPoints} more points`}
                </button>
              </div>

              <div className={`border rounded-lg p-3 ${
                theme === 'dark' ? 'border-white/20 bg-white/5' : 'border-black/20 bg-black/5'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Award className={`w-4 h-4 ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`} />
                    <span className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      Cyberpunk Theme
                    </span>
                  </div>
                  <div className={`rounded-full px-2 py-1 flex items-center gap-1 whitespace-nowrap ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-cyan-400/20 to-teal-400/20 border border-cyan-400/40'
                      : 'bg-slate-200/60 border border-slate-500/60'
                  }`}>
                    <span className={`text-xs font-bold ${
                      theme === 'dark' ? 'text-cyan-400' : 'text-slate-800'
                    }`}>
                      400 pts
                    </span>
                  </div>
                </div>
                <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                  Neon cyber colors with electric vibes
                </p>
                <button
                  disabled={totalPoints < 400}
                  className={`w-full py-2 px-3 rounded-full text-xs font-bold transition-colors ${
                    totalPoints >= 400
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white shadow-lg'
                      : 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/40 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {totalPoints >= 400 ? 'Redeem' : `Need ${400 - totalPoints} more points`}
                </button>
              </div>

              <div className={`border rounded-lg p-3 ${
                theme === 'dark' ? 'border-white/20 bg-white/5' : 'border-black/20 bg-black/5'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
                    <span className={`font-medium text-sm ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                      Particle Effects
                    </span>
                  </div>
                  <div className={`rounded-full px-2 py-1 flex items-center gap-1 whitespace-nowrap ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-green-400/20 to-emerald-400/20 border border-green-400/40'
                      : 'bg-emerald-200/60 border border-emerald-600/60'
                  }`}>
                    <span className={`text-xs font-bold ${
                      theme === 'dark' ? 'text-green-400' : 'text-emerald-800'
                    }`}>
                      500 pts
                    </span>
                  </div>
                </div>
                <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                  Floating sparkles and particle animations
                </p>
                <button
                  disabled={totalPoints < 500}
                  className={`w-full py-2 px-3 rounded-full text-xs font-bold transition-colors ${
                    totalPoints >= 500
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg'
                      : 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/40 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {totalPoints >= 500 ? 'Redeem' : `Need ${500 - totalPoints} more points`}
                </button>
              </div>
            </div>
          </div>
        );

      case 'home':
        return (
          <div className="p-3 space-y-6">
            {/* Show editing form if editing */}
            {editingClass ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-sm font-semibold ${
                    theme === 'dark' ? 'text-white' : 'text-black'
                  }`}>Edit Class</h3>
                  <button
                    onClick={() => {
                      setEditingClass(null);
                      setEditingClassName('');
                      setEditingClassType(DomainType.GENERAL);
                      setEditingClassDocuments([]);
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
                    value={editingClassName}
                    onChange={(e) => setEditingClassName(e.target.value)}
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
                    {Object.entries(DOMAIN_TYPE_INFO).map(([type, info]) => {
                      const Icon = info.icon;
                      return (
                        <button
                          key={type}
                          onClick={() => setEditingClassType(type as DomainType)}
                          className={`p-2 rounded text-xs transition-all duration-200 flex flex-col items-center justify-center space-y-1 h-16 ${
                            editingClassType === type
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


                {availableDocuments.length > 0 && (
                  <div>
                    <label className={`block text-xs font-medium mb-2 ${
                      theme === 'dark' ? 'text-white/80' : 'text-black/80'
                    }`}>
                      Assign Documents
                    </label>
                    <div className={`max-h-32 overflow-y-auto space-y-1 rounded-lg p-2 ${
                      theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-white/30'
                    }`}>
                      {availableDocuments.map(doc => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => {
                            setEditingClassDocuments(prev => 
                              prev.includes(doc.id)
                                ? prev.filter(id => id !== doc.id)
                                : [...prev, doc.id]
                            );
                          }}
                          className={`w-full text-left p-2 rounded text-xs flex items-center justify-between transition-colors ${
                            editingClassDocuments.includes(doc.id)
                              ? theme === 'dark'
                                ? 'bg-white/15 text-white'
                                : 'bg-black/15 text-black'
                              : theme === 'dark'
                                ? 'text-white/70 hover:bg-white/10'
                                : 'text-black/70 hover:bg-black/10'
                          }`}
                        >
                          <span className="truncate">{doc.filename}</span>
                          {editingClassDocuments.includes(doc.id) && (
                            <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={async () => {
                      if (editingClassName.trim() && !isEditingClass) {
                        setIsEditingClass(true);
                        try {
                          // First update the domain details, then assign documents
                          onEditClass?.(editingClass.id, editingClassName, editingClassType);
                          // Wait a bit longer to ensure React state updates complete
                          await new Promise(resolve => setTimeout(resolve, 100));
                          onAssignDocuments(editingClass.id, editingClassDocuments);
                          // Wait much longer for document assignment/removal to complete and sync with backend
                          await new Promise(resolve => setTimeout(resolve, 4000));
                          // Clear edit state after all operations complete
                          setEditingClass(null);
                          setEditingClassName('');
                          setEditingClassType(DomainType.GENERAL);
                          setEditingClassDocuments([]);
                        } finally {
                          setIsEditingClass(false);
                        }
                      }
                    }}
                    disabled={!editingClassName.trim() || isEditingClass}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 rounded-lg transition-all duration-200 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                  >
                    {isEditingClass && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    )}
                    {isEditingClass ? 'Updating...' : 'Update Class'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingClass(null);
                      setEditingClassName('');
                      setEditingClassType(DomainType.GENERAL);
                      setEditingClassDocuments([]);
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
                      {Object.entries(DOMAIN_TYPE_INFO).map(([type, info]) => {
                        const Icon = info.icon;
                        return (
                          <button
                            key={type}
                            onClick={() => setNewClassType(type as DomainType)}
                            className={`p-2 rounded text-xs transition-all duration-200 flex flex-col items-center justify-center space-y-1 h-16 ${
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
                    <div>
                      <label className={`block text-xs font-medium mb-2 ${
                        theme === 'dark' ? 'text-white/80' : 'text-black/80'
                      }`}>
                        Assign Documents (Optional)
                      </label>
                      {availableDocuments.length > 0 ? (
                        <div className={`max-h-32 overflow-y-auto space-y-1 rounded-lg p-2 ${
                          theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-white/30'
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
                      ) : (
                        <div className={`text-xs p-3 rounded-lg text-center ${
                          theme === 'dark' ? 'bg-white/5 text-white/60 border border-white/10' : 'bg-black/5 text-black/60 border border-black/10'
                        }`}>
                          No documents available. Upload documents first in the Docs tab.
                        </div>
                      )}
                      {selectedDocuments.length > 0 && (
                        <div className={`text-xs mt-1 ${
                          theme === 'dark' ? 'text-white/60' : 'text-black/60'
                        }`}>
                          {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={async () => {
                          if (newClassName.trim() && !creatingClass) {
                            setCreatingClass(true);
                            try {
                              onCreateClass(newClassName, newClassType, undefined, selectedDocuments.length > 0 ? selectedDocuments : undefined);
                              // Wait much longer for frontend to fully update with correct document count
                              const waitTime = selectedDocuments.length > 0 ? 5000 : 1000;
                              await new Promise(resolve => setTimeout(resolve, waitTime));
                              setNewClassName('');
                              setNewClassType(DomainType.GENERAL);
                              setSelectedDocuments([]);
                              setShowCreateClassForm(false);
                            } finally {
                              setCreatingClass(false);
                            }
                          }
                        }}
                        disabled={!newClassName.trim() || creatingClass}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 rounded-lg transition-all duration-200 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                      >
                        {creatingClass && (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        )}
                        {creatingClass ? 'Creating...' : 'Create Class'}
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
              
              {classes.length === 0 ? (
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
                <div className="relative space-y-2 max-h-[70vh] overflow-y-auto scrollbar-none">
                  {deletingClassId ? (
                    <div className="flex items-center justify-center py-12">
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
                  ) : classes.map(userClass => {
                    const typeInfo = DOMAIN_TYPE_INFO[userClass.domainType];
                    const Icon = typeInfo?.icon;
                    const isActive = activeClass?.id === userClass.id;

                    return (
                      <div
                        key={userClass.id}
                        onClick={() => onSelectClass(userClass)}
                        className={`relative w-full text-left p-3 rounded-lg transition-all duration-200 group cursor-pointer select-none ${
                          isActive
                            ? theme === 'dark'
                              ? 'bg-violet-500/20'
                              : 'bg-violet-500/20'
                            : theme === 'dark'
                              ? 'bg-white/5 hover:bg-white/10'
                              : 'bg-black/5 hover:bg-black/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {Icon && <Icon className={`w-4 h-4 ${
                              isActive
                                ? theme === 'dark'
                                  ? 'text-violet-400'
                                  : 'text-violet-500'
                                : theme === 'dark'
                                  ? 'text-white'
                                  : 'text-black'
                            }`} />}
                            <div className="flex-1">
                              <div className={`font-medium text-sm ${
                                isActive
                                  ? theme === 'dark'
                                    ? 'text-white'
                                    : 'text-black'
                                  : theme === 'dark'
                                    ? 'text-white'
                                    : 'text-black'
                              }`}>
                                {userClass.name}
                              </div>
                              <div className={`text-xs flex items-center justify-between ${
                                isActive
                                  ? theme === 'dark'
                                    ? 'text-white/80'
                                    : 'text-black/80'
                                  : theme === 'dark'
                                    ? 'text-white/60'
                                    : 'text-black/60'
                              }`}>
                                <span>{typeInfo?.shortLabel || userClass.domainType}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ml-2 select-none ${
                                  isActive
                                    ? theme === 'dark'
                                      ? 'bg-violet-400/20 text-white'
                                      : 'bg-violet-500/20 text-black'
                                    : theme === 'dark'
                                      ? 'bg-white/10'
                                      : 'bg-black/10'
                                }`}>
                                  {(() => {
                                    const docCount = documents.filter(doc => doc.assigned_classes?.includes(userClass.id)).length;
                                    return `${docCount} doc${docCount !== 1 ? 's' : ''}`;
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingClass(userClass);
                                setEditingClassName(userClass.name);
                                setEditingClassType(userClass.domainType);
                                // Initialize with documents that are actually assigned to this class
                                const actuallyAssignedDocs = documents
                                  .filter(doc => doc.assigned_classes?.includes(userClass.id))
                                  .map(doc => doc.id);
                                setEditingClassDocuments(actuallyAssignedDocs);
                              }}
                              className={`opacity-0 group-hover:opacity-100 transition-colors ${
                                theme === 'dark'
                                  ? 'text-white/60 hover:text-white'
                                  : 'text-black/60 hover:text-black'
                              }`}
                              title="Edit Class"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!deletingClassId) {
                                  setDeletingClassId(userClass.id);
                                  try {
                                    await onDeleteClass(userClass.id);
                                  } finally {
                                    setDeletingClassId(null);
                                  }
                                }
                              }}
                              disabled={!!deletingClassId}
                              className={`opacity-0 group-hover:opacity-100 transition-colors ${
                                theme === 'dark'
                                  ? 'text-white/60 hover:text-red-400'
                                  : 'text-black/60 hover:text-red-600'
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

              {(appLoading && currentSessions.length === 0) || showDynamicLoading ? (
                <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 400px)', minHeight: '200px' }}>
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
              ) : currentSessions.length === 0 ? (
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
                <div ref={chatItemsRef} className="space-y-2 max-h-[70vh] overflow-y-auto scrollbar-none">
                  {currentSessions.map((session, index) => {
                    const isActive = sessionId === session.id;
                    const isPreview = session.isPreview || (index === 0 && (session.message_count || 0) === 0);

                    return (
                      <div key={session.id}>
                        <button
                          onClick={() => onSelectSession?.(session.id)}
                          className={`relative w-full text-left p-3 rounded-lg transition-all duration-200 group outline-none focus:outline-none ${
                              isActive
                                ? theme === 'dark'
                                  ? 'bg-violet-500/20'
                                  : 'bg-violet-500/20'
                                : theme === 'dark'
                                  ? 'bg-white/5 hover:bg-white/10'
                                  : 'bg-black/5 hover:bg-black/10'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              {/* Chat Content */}
                              <div className="flex-1 min-w-0">
                                <div className={`flex items-center gap-2 font-medium text-sm ${
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
                                      className={`w-full text-sm font-medium rounded-full px-1.5 py-0.5 outline-none transition-all duration-300 backdrop-blur-xl border-0 ${
                                        theme === 'dark'
                                          ? 'text-white bg-white/5 focus:bg-white/8 shadow-lg focus:ring-2 focus:ring-violet-400/50'
                                          : 'text-black bg-black/3 focus:bg-black/5 shadow-lg focus:ring-2 focus:ring-violet-500/50'
                                      } hover:scale-[1.02] focus:scale-[1.02]`}
                                      autoFocus
                                      onFocus={(e) => e.target.select()}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    <span className="truncate min-w-0 flex-1">{session.name}</span>
                                  )}
                                </div>
                                <div className={`text-xs flex items-center gap-2 mt-2 ${
                                  theme === 'dark' ? 'text-white/60' : 'text-black/60'
                                }`}>
                                  <span>{formatLocalDate(session.updated_at)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              {!editingSessionId && (
                                <>
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingSessionId(session.id);
                                      setEditingSessionName(session.name);
                                    }}
                                    className={`opacity-0 group-hover:opacity-100 transition-colors cursor-pointer ${
                                      theme === 'dark'
                                        ? 'text-white/60 hover:text-white'
                                        : 'text-black/60 hover:text-black'
                                    }`}
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </div>
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSession(session.id);
                                    }}
                                    className={`opacity-0 group-hover:opacity-100 transition-colors cursor-pointer ${
                                      theme === 'dark'
                                        ? 'text-white/60 hover:text-red-400'
                                        : 'text-black/60 hover:text-red-600'
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
    <div className={`h-full w-72 backdrop-blur-md border-r flex flex-col ${
      theme === 'dark'
        ? background === 'classic' ? 'bg-neutral-900 border-neutral-700' : 'bg-white/10 border-white/20'
        : 'bg-black/10 border-black/20'
    }`}>
      {/* Header with tabs */}
      <div className={`flex items-center justify-end p-2 border-b ${
        theme === 'dark' ? 'border-white/10' : 'border-black/10'
      }`}>
        <div className="flex items-center justify-start gap-4 flex-1 ml-2">
          <button
            onClick={() => setActiveTab('home')}
            className={`relative px-2 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap outline-none focus:outline-none flex items-center gap-1 ${
              activeTab === 'home'
                ? (theme === 'dark' ? 'text-white font-bold' : 'text-black font-bold')
                : (theme === 'dark' ? 'text-white/60 hover:text-white hover:font-bold' : 'text-black/60 hover:text-black hover:font-bold')
            }`}
          >
            <Home className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`relative px-2 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap outline-none focus:outline-none flex items-center gap-1 ${
              activeTab === 'documents'
                ? (theme === 'dark' ? 'text-white font-bold' : 'text-black font-bold')
                : (theme === 'dark' ? 'text-white/60 hover:text-white hover:font-bold' : 'text-black/60 hover:text-black hover:font-bold')
            }`}
          >
            <File className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`relative px-2 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap outline-none focus:outline-none flex items-center gap-1 ${
              activeTab === 'achievements'
                ? (theme === 'dark' ? 'text-white font-bold' : 'text-black font-bold')
                : (theme === 'dark' ? 'text-white/60 hover:text-white hover:font-bold' : 'text-black/60 hover:text-black hover:font-bold')
            }`}
          >
            <Trophy className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('store')}
            className={`relative px-2 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap outline-none focus:outline-none flex items-center gap-1 ${
              activeTab === 'store'
                ? (theme === 'dark' ? 'text-white font-bold' : 'text-black font-bold')
                : (theme === 'dark' ? 'text-white/60 hover:text-white hover:font-bold' : 'text-black/60 hover:text-black hover:font-bold')
            }`}
          >
            <Gift className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={() => setActiveTab('help')}
            className={`relative px-2 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap outline-none focus:outline-none flex items-center gap-1 ${
              activeTab === 'help'
                ? (theme === 'dark' ? 'text-white font-bold' : 'text-black font-bold')
                : (theme === 'dark' ? 'text-white/60 hover:text-white hover:font-bold' : 'text-black/60 hover:text-black hover:font-bold')
            }`}
          >
            <HelpCircle className="w-[18px] h-[18px]" />
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={onCloseSidebar}
            className={`p-1 rounded-lg transition-colors ${
              theme === 'dark' ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/60 hover:text-black hover:bg-black/10'
            }`}
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-none relative">
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