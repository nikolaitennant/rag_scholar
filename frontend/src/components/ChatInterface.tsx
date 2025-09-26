import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Sparkles, User, Bot, Heart, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '../contexts/ThemeContext';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  currentDomain: string;
  activeCollection: string;
  userName?: string;
  sidebarOpen?: boolean;
  isNewChatSession?: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading,
  currentDomain,
  activeCollection,
  userName = 'User',
  sidebarOpen = true,
}) => {
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(() => {
    // Load expanded citations from localStorage on mount
    try {
      const saved = localStorage.getItem('expandedCitations');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleCitation = (messageIndex: number, citationIndex: number) => {
    const citationId = `${messageIndex}-${citationIndex}`;
    setExpandedCitations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(citationId)) {
        newSet.delete(citationId);
      } else {
        newSet.add(citationId);
      }

      // Save to localStorage
      try {
        localStorage.setItem('expandedCitations', JSON.stringify(Array.from(newSet)));
      } catch (error) {
        console.warn('Failed to save expanded citations to localStorage:', error);
      }

      return newSet;
    });
  };

  // Dynamic width calculation based on sidebar state and viewport
  const getResponsiveWidth = () => {
    if (sidebarOpen) {
      // Sidebar open: use full available width
      return "w-full px-6";
    } else {
      // Sidebar collapsed: use full available width
      return "w-full px-12";
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input;
    setInput('');
    await onSendMessage(message);
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {isLoading && messages.length === 0 ? (
        /* Chat loading state - when loading previous session */
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          {/* Modern dot circle loader */}
          <div className="relative w-6 h-6">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className={`absolute w-1.5 h-1.5 rounded-full ${
                  theme === 'dark' ? 'bg-white/60' : 'bg-gray-600/60'
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
      ) : messages.length === 0 ? (
        /* ChatGPT-style centered layout for empty state */
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className={`mx-auto ${getResponsiveWidth()}`}>
            <div className={`text-center mb-12 ${
              theme === 'dark' ? 'text-white/70' : 'text-black/70'
            }`}>
              <div className={`text-xl font-semibold text-center mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}>
                <span>
                  {(() => {
                    const hour = new Date().getHours();
                    if (hour < 12) return `Good morning, ${userName}!`;
                    if (hour < 17) return `Good afternoon, ${userName}!`;
                    return `Good evening, ${userName}!`;
                  })()}
                </span>
                <Heart className="w-5 h-5 text-pink-400 animate-pulse inline-block ml-2" style={{ verticalAlign: 'middle', transform: 'translateY(-1px)' }} />
              </div>
              <p className={`text-sm mb-6 ${
                theme === 'dark' ? 'text-white/60' : 'text-black/60'
              }`}>
                Ask questions about your documents
              </p>
            </div>

            {/* Large centered input */}
            <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className={`w-full backdrop-blur-sm border rounded-full px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 shadow-lg ${
                    theme === 'dark'
                      ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                      : 'bg-black/10 border-black/20 text-black placeholder-black/50'
                  }`}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-xl transition-all duration-200 ${
                    input.trim() && !isLoading
                      ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-md'
                      : theme === 'dark'
                        ? 'bg-white/10 text-white/40'
                        : 'bg-black/10 text-black/40'
                  }`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* Regular chat layout with messages */
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            <div className={`mx-auto space-y-6 ${getResponsiveWidth()}`}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                } animate-in slide-in-from-bottom-5 duration-500`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={`${
                    message.role === 'user'
                      ? sidebarOpen ? 'max-w-2xl' : 'max-w-3xl'  // User messages: more compact
                      : 'max-w-none w-full'  // AI messages: full width like ChatGPT
                  } flex ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  } items-start space-x-3`}
                >

                  {/* Message Content */}
                  <div
                    className={`${
                      message.role === 'user'
                        ? `px-4 py-2 rounded-2xl overflow-hidden backdrop-blur-2xl ${theme === 'dark' ? 'bg-black/10 text-white' : 'bg-white/10 text-black'}`
                        : `px-0 py-0 bg-transparent border-0 shadow-none ${theme === 'dark' ? 'text-white' : 'text-black'}`
                    }`}
                    style={message.role === 'user' ? {
                      backdropFilter: 'blur(20px) saturate(120%) brightness(0.9)',
                      WebkitBackdropFilter: 'blur(20px) saturate(120%) brightness(0.9)'
                    } : {}}
                  >
                    <div className={`prose prose-sm max-w-none text-sm ${
                      message.role === 'user' || theme === 'dark' ? 'prose-invert' : ''
                    }`}>
                      <ReactMarkdown
                        components={{
                          code: ({ node, className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const isInline = !className;
                            return !isInline && match ? (
                              <pre className={`rounded-lg p-3 overflow-x-auto border ${
                                message.role === 'user' || theme === 'dark'
                                  ? 'bg-black/20 border-white/10'
                                  : 'bg-white/20 border-black/10'
                              }`}>
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              </pre>
                            ) : (
                              <code className={`px-1.5 py-0.5 rounded text-sm border ${
                                message.role === 'user' || theme === 'dark'
                                  ? 'bg-black/20 border-white/10'
                                  : 'bg-white/20 border-black/10'
                              }`} {...props}>
                                {children}
                              </code>
                            );
                          },
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                          blockquote: ({ children }) => (
                            <blockquote className={`border-l-2 pl-3 italic opacity-80 ${
                              message.role === 'user' || theme === 'dark'
                                ? 'border-white/30'
                                : 'border-black/30'
                            }`}>{children}</blockquote>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    
                    {/* Citations */}
                    {message.citations && message.citations.length > 0 && (
                      <div className={`mt-4 pt-4 border-t ${
                        message.role === 'user' || theme === 'dark'
                          ? 'border-white/20'
                          : 'border-black/20'
                      }`}>
                        <div className={`text-xs font-medium mb-3 flex items-center ${
                          message.role === 'user' || theme === 'dark'
                            ? 'text-white/80'
                            : 'text-black/80'
                        }`}>
                          <Sparkles className="w-3 h-3 mr-1" />
                          {(() => {
                            const uniqueSources = new Set(message.citations.map(c => c.source));
                            const sourceCount = uniqueSources.size;
                            const chunkCount = message.citations.length;

                            if (sourceCount === 1) {
                              return `1 source referenced (${chunkCount} ${chunkCount === 1 ? 'chunk' : 'chunks'})`;
                            } else {
                              return `${sourceCount} sources referenced (${chunkCount} ${chunkCount === 1 ? 'chunk' : 'chunks'})`;
                            }
                          })()}
                        </div>
                        <div className="space-y-2">
                          {message.citations.map((citation, i) => {
                            const citationId = `${index}-${i}`;
                            const isExpanded = expandedCitations.has(citationId);

                            return (
                              <div key={i} className={`backdrop-blur-sm p-3 rounded-lg border transition-all duration-200 ${
                                message.role === 'user' || theme === 'dark'
                                  ? 'bg-black/20 border-white/10 hover:bg-black/30'
                                  : 'bg-white/20 border-black/10 hover:bg-white/30'
                              }`}>
                                {/* Citation Header */}
                                <div className="flex items-center justify-between">
                                  <div className={`font-medium text-xs mb-1 ${
                                    message.role === 'user' || theme === 'dark'
                                      ? 'text-white/90'
                                      : 'text-black/90'
                                  }`}>
                                    [{i + 1}] {citation.source}
                                    {citation.page && ` - Page ${citation.page}`}
                                  </div>

                                  {/* Expand/Collapse Button */}
                                  <button
                                    onClick={() => toggleCitation(index, i)}
                                    className={`p-1 rounded-md transition-colors ${
                                      message.role === 'user' || theme === 'dark'
                                        ? 'hover:bg-white/10 text-white/60 hover:text-white/80'
                                        : 'hover:bg-black/10 text-black/60 hover:text-black/80'
                                    }`}
                                    title={isExpanded ? 'Show less' : 'Show full text'}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-3 h-3" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>

                                {/* Citation Summary */}
                                <div className={`text-xs mb-2 ${
                                  message.role === 'user' || theme === 'dark'
                                    ? 'text-white/70'
                                    : 'text-black/70'
                                } ${isExpanded ? '' : 'line-clamp-2'}`}>
                                  {citation.summary || citation.preview}
                                </div>

                                {/* Full Text (when expanded) */}
                                {isExpanded && citation.full_text && (
                                  <div className={`text-xs mb-3 p-2 rounded border max-h-40 overflow-y-auto ${
                                    message.role === 'user' || theme === 'dark'
                                      ? 'bg-black/20 border-white/10 text-white/80'
                                      : 'bg-white/20 border-black/10 text-black/80'
                                  }`}>
                                    <div className={`flex items-center gap-1 mb-2 text-xs font-medium ${
                                      message.role === 'user' || theme === 'dark'
                                        ? 'text-white/60'
                                        : 'text-black/60'
                                    }`}>
                                      <Eye className="w-3 h-3" />
                                      Full Source Text
                                    </div>
                                    <div className="whitespace-pre-wrap">
                                      {citation.full_text}
                                    </div>
                                  </div>
                                )}

                                {/* Relevance Score */}
                                <div className="flex items-center justify-between text-xs">
                                  <span className={
                                    message.role === 'user' || theme === 'dark'
                                      ? 'text-white/60'
                                      : 'text-black/60'
                                  }>
                                    Relevance: {(citation.relevance_score * 100).toFixed(1)}%
                                  </span>
                                  <div className={`w-16 rounded-full h-1 ${
                                    message.role === 'user' || theme === 'dark'
                                      ? 'bg-white/10'
                                      : 'bg-black/10'
                                  }`}>
                                    <div
                                      className="bg-gradient-to-r from-green-400 to-blue-500 h-1 rounded-full transition-all duration-500"
                                      style={{ width: `${citation.relevance_score * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

          {isLoading && (
            <div className="flex justify-start animate-in slide-in-from-bottom-5">
              <div className="flex space-x-1">
                <div className={`w-2 h-2 rounded-full animate-bounce ${
                  theme === 'dark' ? 'bg-white/60' : 'bg-black/60'
                }`}></div>
                <div className={`w-2 h-2 rounded-full animate-bounce delay-75 ${
                  theme === 'dark' ? 'bg-white/60' : 'bg-black/60'
                }`}></div>
                <div className={`w-2 h-2 rounded-full animate-bounce delay-150 ${
                  theme === 'dark' ? 'bg-white/60' : 'bg-black/60'
                }`}></div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className={`mx-auto px-4 ${getResponsiveWidth()}`}>
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className={`w-full backdrop-blur-sm border rounded-full px-4 py-2 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 ${
                theme === 'dark'
                  ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                  : 'bg-black/10 border-black/20 text-black placeholder-black/50'
              }`}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-xl transition-all duration-200 ${
                input.trim() && !isLoading
                  ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-md'
                  : theme === 'dark'
                    ? 'bg-white/10 text-white/40'
                    : 'bg-black/10 text-black/40'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
      </>
      )}
    </div>
  );
};