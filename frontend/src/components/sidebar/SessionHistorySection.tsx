import React, { useState } from 'react';
import { Plus, MessageSquare, Edit2, Trash2, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { UserClass } from '../../types';

interface Session {
  id: string;
  name: string;
  updated_at: string;
  preview?: string;
  domain?: string;
}

interface SessionHistorySectionProps {
  currentSessions: Session[];
  sessionId: string;
  activeClass: UserClass | null;
  classes: UserClass[];
  onNewSession: () => void;
  onSelectSession?: (sessionId: string) => void;
  onRenameSession?: (sessionId: string, newName: string) => Promise<void>;
  onDeleteSession?: (sessionId: string) => Promise<void> | void;
  formatLocalDate: (dateString: string) => string;
}

export const SessionHistorySection: React.FC<SessionHistorySectionProps> = ({
  currentSessions,
  sessionId,
  activeClass,
  classes,
  onNewSession,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
  formatLocalDate,
}) => {
  const { theme } = useTheme();

  // Session editing state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionName, setEditingSessionName] = useState('');

  const handleRenameSession = async (sessionId: string, newName: string) => {
    if (newName.trim() && onRenameSession) {
      try {
        await onRenameSession(sessionId, newName.trim());
        setEditingSessionId(null);
        setEditingSessionName('');
      } catch (error) {
        console.error('Failed to rename session:', error);
      }
    } else {
      setEditingSessionId(null);
      setEditingSessionName('');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (onDeleteSession && window.confirm('Are you sure you want to delete this chat session?')) {
      try {
        await onDeleteSession(sessionId);
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
  };

  return (
    <div className="p-3 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-semibold ${
          theme === 'dark' ? 'text-white' : 'text-black'
        }`}>
          {activeClass ? `${activeClass.name} Chats` : 'All Chats'}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onNewSession();
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

      <div className="space-y-2 max-h-[70vh] overflow-y-auto scrollbar-none">
        {currentSessions.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className={`w-12 h-12 mx-auto mb-3 ${
              theme === 'dark' ? 'text-white/30' : 'text-black/30'
            }`} />
            <p className={`text-sm mb-3 ${
              theme === 'dark' ? 'text-white/60' : 'text-black/60'
            }`}>
              {activeClass ? `No chats in ${activeClass.name} yet` : 'No chat history yet'}
            </p>
            <button
              onClick={() => {
                onNewSession();
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
          currentSessions.map(session => (
            <div
              key={session.id}
              className={`group rounded-lg p-3 transition-all duration-200 cursor-pointer ${
                sessionId === session.id
                  ? (theme === 'dark' ? 'bg-blue-500/20 border border-blue-400/40 shadow-lg' : 'bg-blue-500/20 border border-blue-500/40 shadow-lg')
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
                      className={`w-full text-sm font-medium rounded-full px-2 py-1 outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:shadow-none transition-all duration-300 backdrop-blur-xl border-0 ${
                        theme === 'dark'
                          ? 'text-white bg-white/5 focus:bg-white/8'
                          : 'text-black bg-black/3 focus:bg-black/5'
                      } hover:scale-[1.02] focus:scale-[1.02]`}
                      style={{
                        boxShadow: 'none',
                        outline: 'none',
                        border: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none'
                      }}
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
                        {formatLocalDate(session.updated_at)}
                      </div>
                      {/* Show class name like desktop mode */}
                      {(() => {
                        const sessionDomain = classes.find(d => d.id === session.domain);
                        return sessionDomain ? (
                          <div className={`text-xs mt-1 ${
                            theme === 'dark' ? 'text-white/40' : 'text-black/40'
                          }`}>
                            {sessionDomain.name}
                          </div>
                        ) : null;
                      })()}
                    </>
                  )}
                </div>
                <div className={`flex items-center gap-1 transition-all duration-200 ${
                  editingSessionId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
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
                    className={`p-1.5 rounded-full transition-all duration-200 backdrop-blur-sm ${
                      editingSessionId === session.id
                        ? theme === 'dark'
                          ? 'text-blue-400 bg-blue-400/20 shadow-lg'
                          : 'text-blue-600 bg-blue-500/20 shadow-lg'
                        : theme === 'dark'
                        ? 'text-white/50 hover:text-white hover:bg-white/10'
                        : 'text-black/50 hover:text-black hover:bg-black/10'
                    }`}
                    title={editingSessionId === session.id ? "Cancel" : "Rename"}
                  >
                    {editingSessionId === session.id ? (
                      <X className="w-3 h-3" />
                    ) : (
                      <Edit2 className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(session.id);
                    }}
                    className={`p-1.5 rounded-full transition-all duration-200 backdrop-blur-sm ${
                      theme === 'dark'
                        ? 'text-white/50 hover:text-red-400 hover:bg-red-400/20 hover:shadow-lg'
                        : 'text-black/50 hover:text-red-500 hover:bg-red-500/20 hover:shadow-lg'
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
};