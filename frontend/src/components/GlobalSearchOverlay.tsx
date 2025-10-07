import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, MessageSquare, FileText, ArrowRight } from 'lucide-react';
import { UserClass, Document } from '../types';

interface ChatSession {
  id: string;
  name: string;
  message_count: number;
  last_message?: string;
  updated_at: string;
}

interface GlobalSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  activeClass: UserClass | null;
  documents: Document[];
  chatSessions: ChatSession[];
  onSelectDocument: (documentId: string) => void;
  onSelectChat: (sessionId: string) => void;
}

export const GlobalSearchOverlay: React.FC<GlobalSearchOverlayProps> = ({
  isOpen,
  onClose,
  activeClass,
  documents,
  chatSessions,
  onSelectDocument,
  onSelectChat,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'class' | 'all'>('class');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Reset search when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesQuery = doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesScope =
      searchScope === 'all' ||
      (activeClass && doc.assigned_classes?.includes(activeClass.id));
    return matchesQuery && matchesScope;
  });

  // Filter chat sessions
  const filteredChats = chatSessions.filter((session) =>
    session.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasResults = filteredDocuments.length > 0 || filteredChats.length > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      {/* Search Header */}
      <div
        className="flex-shrink-0 px-4 py-3"
        style={{
          background: 'rgba(28, 28, 30, 0.95)',
          borderBottom: '0.5px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Search Input */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats and documents..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/50 border border-white/10 focus:border-white/30 focus:outline-none transition-colors"
            />
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Scope Toggle */}
        {activeClass && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSearchScope('class')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                searchScope === 'class'
                  ? 'bg-white/15 text-white'
                  : 'bg-transparent text-white/60 hover:text-white/80'
              }`}
            >
              {activeClass.name} only
            </button>
            <button
              onClick={() => setSearchScope('all')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                searchScope === 'all'
                  ? 'bg-white/15 text-white'
                  : 'bg-transparent text-white/60 hover:text-white/80'
              }`}
            >
              All classes
            </button>
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto">
        {!searchQuery ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <Search className="w-16 h-16 text-white/20 mb-4" />
            <p className="text-white/60 text-sm">
              Search for chats and documents
            </p>
            {activeClass && (
              <p className="text-white/40 text-xs mt-2">
                Searching in {activeClass.name}
              </p>
            )}
          </div>
        ) : !hasResults ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <p className="text-white/60 text-sm">No results found</p>
            <p className="text-white/40 text-xs mt-2">
              Try a different search term
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* Chats Section */}
            {filteredChats.length > 0 && (
              <div>
                <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">
                  Chats ({filteredChats.length})
                </h3>
                <div className="space-y-2">
                  {filteredChats.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        onSelectChat(session.id);
                        onClose();
                      }}
                      className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors text-left flex items-center space-x-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-white/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white text-sm font-medium truncate">
                          {session.name}
                        </h4>
                        <p className="text-white/50 text-xs truncate mt-0.5">
                          {session.message_count} message{session.message_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/40 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Documents Section */}
            {filteredDocuments.length > 0 && (
              <div>
                <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">
                  Documents ({filteredDocuments.length})
                </h3>
                <div className="space-y-2">
                  {filteredDocuments.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => {
                        onSelectDocument(doc.id);
                        onClose();
                      }}
                      className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors text-left flex items-center space-x-3"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/20 to-teal-500/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-white/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white text-sm font-medium truncate">
                          {doc.filename}
                        </h4>
                        <p className="text-white/50 text-xs truncate mt-0.5">
                          {doc.file_type} • {doc.chunks} chunk{doc.chunks !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/40 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
