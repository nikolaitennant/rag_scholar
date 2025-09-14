import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Sparkles, User, Bot, Heart } from 'lucide-react';
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
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading,
  currentDomain,
  activeCollection,
  userName = 'User',
}) => {
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className={`text-center mt-32 ${
              theme === 'dark' ? 'text-white/70' : 'text-black/70'
            }`}>
              <div className={`text-2xl font-semibold flex items-center justify-center gap-2 mb-6 ${
                theme === 'dark' ? 'text-white' : 'text-black'
              }`}>
                {(() => {
                  const hour = new Date().getHours();
                  if (hour < 12) return `Good morning, ${userName}!`;
                  if (hour < 17) return `Good afternoon, ${userName}!`;
                  return `Good evening, ${userName}!`;
                })()}
                <Heart className="w-5 h-5 text-pink-400 animate-pulse" />
              </div>
              <p className={`mb-8 ${
                theme === 'dark' ? 'text-white/60' : 'text-black/60'
              }`}>
                <span className="px-4">Ask questions about your documents and get AI-powered insights with source citations</span>
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                } animate-in slide-in-from-bottom-5 duration-500`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div
                  className={`max-w-2xl flex ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  } items-start space-x-3`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user' 
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 ml-3' 
                      : 'bg-gradient-to-r from-purple-500 to-pink-600 mr-3'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div
                    className={`px-6 py-4 rounded-2xl backdrop-blur-sm border transition-all duration-200 hover:shadow-lg ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-400/20 rounded-br-md shadow-lg'
                        : theme === 'dark'
                        ? 'bg-white/10 text-white border-white/20 rounded-bl-md shadow-md'
                        : 'bg-black/10 text-black border-black/20 rounded-bl-md shadow-md'
                    }`}
                  >
                    <div className={`prose max-w-none ${
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
                          {message.citations.length} sources referenced
                        </div>
                        <div className="space-y-2">
                          {message.citations.map((citation, i) => (
                            <div key={i} className={`backdrop-blur-sm p-3 rounded-lg border ${
                              message.role === 'user' || theme === 'dark'
                                ? 'bg-black/20 border-white/10'
                                : 'bg-white/20 border-black/10'
                            }`}>
                              <div className={`font-medium text-xs mb-1 ${
                                message.role === 'user' || theme === 'dark'
                                  ? 'text-white/90'
                                  : 'text-black/90'
                              }`}>
                                [{i + 1}] {citation.source}
                                {citation.page && ` - Page ${citation.page}`}
                              </div>
                              <div className={`text-xs mb-2 line-clamp-2 ${
                                message.role === 'user' || theme === 'dark'
                                  ? 'text-white/70'
                                  : 'text-black/70'
                              }`}>
                                {citation.preview}
                              </div>
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
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start animate-in slide-in-from-bottom-5">
              <div className="max-w-2xl flex items-start space-x-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className={`backdrop-blur-sm border rounded-2xl rounded-bl-md px-6 py-4 ${
                  theme === 'dark'
                    ? 'bg-white/10 border-white/20'
                    : 'bg-black/10 border-black/20'
                }`}>
                  <div className="flex items-center space-x-3">
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
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-white/70' : 'text-black/70'
                    }`}>Researching your question...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            className={`w-full backdrop-blur-sm border rounded-2xl px-6 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 ${
              theme === 'dark'
                ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                : 'bg-black/10 border-black/20 text-black placeholder-black/50'
            }`}
            disabled={isLoading}
          />
        </form>
      </div>
    </div>
  );
};