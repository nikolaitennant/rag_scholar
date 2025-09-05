import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Heart, Sparkles, BookOpen, Zap } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (name: string, email: string, password: string) => Promise<void>;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onSignUp }) => {
  const { theme, toggleTheme } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus name input and clear form when switching to signup mode
  useEffect(() => {
    if (isSignUp && nameInputRef.current) {
      // Clear form data when switching to signup
      setFormData({ name: '', email: '', password: '' });
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    } else if (!isSignUp) {
      // Clear form data when switching back to login
      setFormData({ name: '', email: '', password: '' });
    }
  }, [isSignUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isSignUp) {
        await onSignUp(formData.name, formData.email, formData.password);
      } else {
        await onLogin(formData.email, formData.password);
      }
    } catch (error) {
      console.error('Authentication error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex relative overflow-hidden ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-full blur-3xl animate-ping" style={{animationDuration: '4s'}}></div>
      </div>

      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-center px-12 relative">
        <div className="mx-auto max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h1 className={`text-4xl font-bold mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-black'
            }`}>
              RAG Scholar
            </h1>
            <p className={`text-lg ${
              theme === 'dark' ? 'text-white/70' : 'text-black/70'
            }`}>
              Your AI-powered research assistant with citation-backed answers
            </p>
          </div>

          <div className="space-y-6">
            <div className={`backdrop-blur-sm rounded-xl p-6 border ${
              theme === 'dark' 
                ? 'bg-white/5 border-white/10' 
                : 'bg-black/5 border-black/10'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className={`font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>Smart Citations</h3>
              </div>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-white/70' : 'text-black/70'
              }`}>
                Every answer comes with source references and relevance scores
              </p>
            </div>

            <div className={`backdrop-blur-sm rounded-xl p-6 border ${
              theme === 'dark' 
                ? 'bg-white/5 border-white/10' 
                : 'bg-black/5 border-black/10'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-5 h-5 text-yellow-400" />
                <h3 className={`font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>Achievement System</h3>
              </div>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-white/70' : 'text-black/70'
              }`}>
                Earn points and unlock achievements as you research
              </p>
            </div>

            <div className={`backdrop-blur-sm rounded-xl p-6 border ${
              theme === 'dark' 
                ? 'bg-white/5 border-white/10' 
                : 'bg-black/5 border-black/10'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <Heart className="w-5 h-5 text-pink-400" />
                <h3 className={`font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-black'
                }`}>Personalized Experience</h3>
              </div>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-white/70' : 'text-black/70'
              }`}>
                Custom domains, personal greetings, and tailored workflows
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 relative">
        <div className="mx-auto w-full max-w-sm">
          <div className="text-center mb-8">
            <h2 className={`text-3xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-black'
            }`}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-white/60' : 'text-black/60'
            }`}>
              {isSignUp 
                ? 'Join thousands of researchers using RAG Scholar'
                : 'Sign in to continue your research journey'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isSignUp && (
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-white/80' : 'text-black/80'
                }`}>
                  Full Name
                </label>
                <div className="relative">
                  <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                    theme === 'dark' ? 'text-white/40' : 'text-black/40'
                  }`} />
                  <input
                    ref={nameInputRef}
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                      theme === 'dark'
                        ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                        : 'bg-black/5 border-black/20 text-black placeholder-black/50'
                    }`}
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-white/80' : 'text-black/80'
              }`}>
                Email Address
              </label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                  theme === 'dark' ? 'text-white/40' : 'text-black/40'
                }`} />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={`w-full pl-12 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                    theme === 'dark'
                      ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                      : 'bg-black/5 border-black/20 text-black placeholder-black/50'
                  }`}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-white/80' : 'text-black/80'
              }`}>
                Password
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                  theme === 'dark' ? 'text-white/40' : 'text-black/40'
                }`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className={`w-full pl-12 pr-12 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                    theme === 'dark'
                      ? 'bg-white/10 border-white/20 text-white placeholder-white/50'
                      : 'bg-black/5 border-black/20 text-black placeholder-black/50'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                    theme === 'dark' ? 'text-white/40 hover:text-white/60' : 'text-black/40 hover:text-black/60'
                  }`}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  {isSignUp ? 'Creating Account...' : 'Signing In...'}
                </div>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className={`text-sm hover:underline ${
                theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'
              }`}
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : 'Need an account? Sign up'
              }
            </button>
          </div>

          {/* Demo credentials hint */}
          {!isSignUp && (
            <div className={`mt-6 p-4 rounded-xl border ${
              theme === 'dark'
                ? 'bg-white/5 border-white/10'
                : 'bg-black/5 border-black/10'
            }`}>
              <p className={`text-xs text-center ${
                theme === 'dark' ? 'text-white/50' : 'text-black/50'
              }`}>
                Demo: Use any email and password to continue
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};