import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Message, UserClass } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { CommandSuggestions } from './CommandSuggestions';
import { getCommandSuggestions } from '../utils/commandParser';
import { DOMAIN_TYPE_INFO } from '../constants/domains';
import { MobileCitationRenderer } from './citations/MobileCitationRenderer';
import ReactMarkdown from 'react-markdown';

interface MobileChatInterfaceProps {
  messages: Message[];
  mobileInput: string;
  setMobileInput: (value: string) => void;
  showCommandSuggestions: boolean;
  setShowCommandSuggestions: (show: boolean) => void;
  isChatLoading: boolean;
  isKeyboardOpen: boolean;
  activeClass: UserClass | null;
  handleNewChat: () => void;
  handleSendMessage: (message: string) => void;
}

export const MobileChatInterface: React.FC<MobileChatInterfaceProps> = ({
  messages,
  mobileInput,
  setMobileInput,
  showCommandSuggestions,
  setShowCommandSuggestions,
  isChatLoading,
  isKeyboardOpen,
  activeClass,
  handleNewChat,
  handleSendMessage,
}) => {
  const { theme } = useTheme();
  const [isInputFocused, setIsInputFocused] = useState(false);

  return (
    <div className="h-full chat-container" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* iOS-Style Mobile Chat Header with Dock-like Frosted Glass Effect */}
      <div
        className="px-4 flex items-center justify-between relative"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
          paddingBottom: '12px',
          background: 'rgba(28, 28, 30, 0.6)',
          backdropFilter: 'blur(22px) saturate(160%)',
          WebkitBackdropFilter: 'blur(22px) saturate(160%)',
          borderBottom: '0.5px solid rgba(255, 255, 255, 0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div>
          <h1 className="ios-title text-white">
            {activeClass ? activeClass.name : 'Chat'}
          </h1>
          {activeClass && (
            <p className="ios-caption text-white opacity-60 mt-1">
              {DOMAIN_TYPE_INFO[activeClass.domainType]?.label || activeClass.domainType}
            </p>
          )}
        </div>
        <button
          onClick={handleNewChat}
          className="w-7 h-7 min-w-7 rounded-full flex-shrink-0 bg-white/10 flex items-center justify-center transition-all duration-150 active:scale-95"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <Plus className="w-4 h-4 text-white/70" />
        </button>
      </div>

      {/* Mobile Chat Interface - Chat Container */}
      <div className="flex-1 min-h-0 flex flex-col relative">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4" style={{
          paddingBottom: isKeyboardOpen ? '40px' : '100px'
        }}>
          {messages.length === 0 && !mobileInput.trim() ? (
            /* Mobile welcome state - fades out when typing or focused */
            <div className={`flex flex-col justify-center h-full text-center transition-opacity duration-300 ${
              mobileInput.trim() || isInputFocused ? 'opacity-0' : 'opacity-100'
            }`}>
              <div className={`mb-8 ${theme === 'dark' ? 'text-white/70' : 'text-black/70'}`}>
                <h2 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-black'}`}>
                  Welcome to RAG Scholar!
                </h2>
                <p className={`text-sm ${theme === 'dark' ? 'text-white/60' : 'text-black/60'}`}>
                  Ask questions about your documents
                </p>
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end pr-1' : 'justify-start pl-1 pr-3'
                  }`}
                >
                  <div
                    className={`${message.role === 'user' ? 'max-w-[85%]' : 'w-full'} ${
                      message.role === 'user'
                        ? `px-4 py-2 rounded-full overflow-hidden backdrop-blur-2xl ${theme === 'dark' ? 'bg-white/15 text-white' : 'bg-white/10 text-black'}`
                        : `px-0 py-0 bg-transparent border-0 shadow-none ${theme === 'dark' ? 'text-white' : 'text-black'}`
                    }`}
                    style={message.role === 'user' ? {
                      backdropFilter: 'blur(20px) saturate(120%) brightness(0.9)',
                      WebkitBackdropFilter: 'blur(20px) saturate(120%) brightness(0.9)'
                    } : {}}
                  >
                    <div className={`prose prose-base max-w-none text-base ${
                      message.role === 'user' || theme === 'dark' ? 'prose-invert' : ''
                    }`}>
                      {message.role === 'assistant' ? (
                        <MobileCitationRenderer
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
                                  theme === 'dark'
                                    ? 'bg-black/20 border-white/10'
                                    : 'bg-white/20 border-black/10'
                                }`}>
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              ) : (
                                <code className={`px-1.5 py-0.5 rounded text-base border ${
                                  theme === 'dark'
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
                                theme === 'dark'
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
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="flex space-x-1 p-3">
                    <div className={`w-2 h-2 rounded-full animate-bounce ${theme === 'dark' ? 'bg-white/60' : 'bg-black/60'}`}></div>
                    <div className={`w-2 h-2 rounded-full animate-bounce delay-75 ${theme === 'dark' ? 'bg-white/60' : 'bg-black/60'}`}></div>
                    <div className={`w-2 h-2 rounded-full animate-bounce delay-150 ${theme === 'dark' ? 'bg-white/60' : 'bg-black/60'}`}></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Fade Overlay */}
        {messages.length > 0 && (
          <div
            className="pointer-events-none fixed left-0 right-0"
            style={{
              height: '110px',
              bottom: isKeyboardOpen
                ? 'calc(max(env(safe-area-inset-bottom), 4px) + 57px)'
                : 'calc(60px + max(env(safe-area-inset-bottom), 0px) - 10px)',
              maskImage: 'radial-gradient(ellipse 100% 80% at 50% 100%, black 0%, black 80%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 100% 80% at 50% 100%, black 0%, black 80%, transparent 100%)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(.55px)',
              zIndex: 45
            }}
          />
        )}

        {/* Fixed Bottom Input - iOS Style */}
        <div
          className="fixed left-0 right-0 px-6 py-1 z-50"
          style={{
            bottom: isKeyboardOpen
              ? 'max(env(safe-area-inset-bottom), 4px)'
              : 'calc(60px + max(env(safe-area-inset-bottom), 0px))',
            background: 'transparent',
            transition: 'bottom 0.3s ease-in-out'
          }}
        >
          <div className="relative">
            <CommandSuggestions
              suggestions={getCommandSuggestions(mobileInput)}
              onSelect={(command) => {
                setMobileInput(command);
                setShowCommandSuggestions(false);
              }}
              visible={showCommandSuggestions}
            />
            <form onSubmit={(e) => {
              e.preventDefault();
              if (mobileInput.trim() && !isChatLoading) {
                handleSendMessage(mobileInput.trim());
                setMobileInput('');
                setShowCommandSuggestions(false);
              }
            }}>
              <input
                type="text"
                value={mobileInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setMobileInput(value);
                  setShowCommandSuggestions(value.startsWith('/'));
                }}
                placeholder="Ask anything..."
                className="ios-input w-full text-base focus:outline-none transition-all duration-300 ease-in-out"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
                  fontSize: '16px',
                  WebkitTapHighlightColor: 'transparent',
                  border: 'none',
                  boxShadow: 'none'
                }}
                disabled={isChatLoading}
                onFocus={(e) => {
                  // Prevent default scroll behavior for iOS overlay keyboard
                  e.preventDefault();
                  setIsInputFocused(true);
                }}
                onBlur={() => {
                  setIsInputFocused(false);
                }}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};