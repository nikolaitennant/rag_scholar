import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Heart } from 'lucide-react';
import { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '../contexts/ThemeContext';
import { CommandSuggestions } from './CommandSuggestions';
import { getCommandSuggestions } from '../utils/commandParser';
import { CitationRenderer } from './citations/CitationRenderer';

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
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    setShowCommandSuggestions(false);
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
                <Heart className="w-5 h-5 text-violet-400 animate-pulse inline-block ml-2" style={{ verticalAlign: 'middle', transform: 'translateY(-1.5px)' }} />
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
                      {message.role === 'assistant' ? (
                        <CitationRenderer
                          content={message.content}
                          citations={message.citations || []}
                          messageIndex={index}
                        />
                      ) : (
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
                      )}
                    </div>

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
            <CommandSuggestions
              suggestions={getCommandSuggestions(input)}
              onSelect={(command) => {
                setInput(command);
                setShowCommandSuggestions(false);
              }}
              visible={showCommandSuggestions}
            />
            <input
              type="text"
              value={input}
              onChange={(e) => {
                const value = e.target.value;
                setInput(value);
                setShowCommandSuggestions(value.startsWith('/'));
              }}
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